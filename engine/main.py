import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from engine.core import UnsupportedAudioFileError, analyze_rhythm_file
from engine.core.stage2_spatial import run_spatial_inference
from engine.schemas import FullAnalysisRequest

app = FastAPI(title="Karakuri Engine Local API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
ENGINE_NAME = "Karakuri v1.0"


@app.get("/health")
async def health_check() -> JSONResponse:
    print("STATUS: Karakuri API is healthy and listening.", flush=True)
    return JSONResponse(content={"status": "ok", "engine": ENGINE_NAME})


@app.post("/analyze/full")
async def analyze_full(request: FullAnalysisRequest):
    audio_path = request.audio_path.strip()
    if not audio_path:
        raise HTTPException(status_code=400, detail="audio_path must not be empty")

    resolved_path = Path(audio_path)
    if not resolved_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    try:
        # Ejecutar Pipeline Híbrido en el threadpool
        def hybrid_pipeline():
            # Fase 1: Ritmo
            rhythm_payload = analyze_rhythm_file(str(resolved_path), emit_status)
            
            # Construir objeto dummy para pasar a Fase 2
            class RhythmDataDict:
                pass
            rhythm_data = RhythmDataDict()
            rhythm_data.onsets = rhythm_payload.get('onset_times_ms', [])
            
            # Fase 2: Espacial (ONNX)
            spatial_response = run_spatial_inference(rhythm_data, emit_status)
            
            # Fase 3: Geometría (Catmull-Rom & Distance Snap)
            from engine.core.stage3_polish import apply_geometric_polish
            from engine.map_generator import generate_osz
            
            emit_status("Aplicando pulido geométrico y restricciones (Fase 3)")
            polished_objects = apply_geometric_polish(
                spatial_objects=spatial_response.predicted_objects,
                tempo_bpm=rhythm_payload.get('tempo_bpm', 120.0),
                intensity=request.intensity
            )
            
            # Compilación: Ensamblado .osu y empaquetado .osz
            emit_status("Ensamblando estructura .osu y empaquetando en .osz")
            osz_path = generate_osz(
                request=request,
                tempo_bpm=rhythm_payload.get('tempo_bpm', 120.0),
                beat_times_ms=rhythm_payload.get('beat_times_ms', []),
                polished_objects=polished_objects
            )
            
            # Combinar respuestas
            rhythm_payload["spatial_objects"] = polished_objects
            rhythm_payload["spatial_metrics"] = spatial_response.metrics
            rhythm_payload["osz_path"] = osz_path
            
            emit_status("Generación exitosa. Pipeline completado.")
            return rhythm_payload
            
        payload = await run_in_threadpool(hybrid_pipeline)
    except UnsupportedAudioFileError as error:
        raise HTTPException(status_code=415, detail="Unsupported or unreadable audio file") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Internal analysis failure: {str(error)}") from error

    return {"status": "ok", "engine": ENGINE_NAME, **payload}


def emit_status(message: str) -> None:
    print(f"STATUS: {message}", flush=True)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"STATUS: Starting Karakuri API on 127.0.0.1:{port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
