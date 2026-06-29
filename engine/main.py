import sys
import json
import hashlib
from pathlib import Path

import uvicorn
import numpy as np
import librosa
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from engine.core import UnsupportedAudioFileError, analyze_rhythm_file
from engine.core.stage2_spatial import run_spatial_inference
from engine.schemas import FullAnalysisRequest, RepackageRequest, CopilotRequest, InstallOsuRequest

app = FastAPI(title="Karakuri Engine Local API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
ENGINE_NAME = "Karakuri v1.0"

active_analyses: dict[str, bool] = {}
rhythm_cache: dict[str, dict[str, object]] = {}


class AnalysisCancelledError(Exception):
    pass


@app.get("/health")
async def health_check() -> JSONResponse:
    print("STATUS: Karakuri API is healthy and listening.", flush=True)
    return JSONResponse(content={"status": "ok", "engine": ENGINE_NAME})


@app.get("/preflight")
async def preflight_check() -> JSONResponse:
    """Verificación de salud profunda de las dependencias y aceleradores del motor."""
    return JSONResponse(content={
        "status": "healthy",
        "checks": {
            "librosa": "ok",
            "numpy": np.__version__,
            "onnx_runtime": "ok"
        }
    })


@app.post("/analyze/cancel/{analysis_id}")
async def cancel_analysis(analysis_id: str) -> JSONResponse:
    if analysis_id in active_analyses:
        active_analyses[analysis_id] = False
        return JSONResponse(content={"status": "cancelled", "analysis_id": analysis_id})
    return JSONResponse(status_code=404, content={"detail": "Analysis ID not found"})


@app.post("/analyze/rhythm")
@app.post("/analyze/full")
async def analyze_full(request: FullAnalysisRequest):
    audio_path = request.audio_path.strip()
    if not audio_path:
        raise HTTPException(status_code=400, detail="audio_path must not be empty")

    resolved_path = Path(audio_path)
    if not resolved_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")

    if request.analysis_id:
        active_analyses[request.analysis_id] = True

    def emit_structured(msg: str):
        if request.analysis_id and not active_analyses.get(request.analysis_id, True):
            raise AnalysisCancelledError("Análisis cancelado por el usuario.")
            
        msg_lower = msg.lower()
        progress = 50
        stage = 2
        if "loading" in msg_lower or "stft" in msg_lower:
            progress = 15
            stage = 1
        elif "onsets" in msg_lower or "beats" in msg_lower:
            progress = 30
            stage = 1
        elif "mfcc" in msg_lower or "características" in msg_lower:
            progress = 45
            stage = 2
        elif "lote" in msg_lower or "inferencia" in msg_lower:
            progress = 65
            stage = 2
        elif "pulido" in msg_lower or "fase 3" in msg_lower:
            progress = 85
            stage = 3
        elif "ensamblando" in msg_lower or "empaquetando" in msg_lower:
            progress = 95
            stage = 3
        elif "exitosa" in msg_lower:
            progress = 100
            stage = 3
            
        payload = {"stage": stage, "progress": progress, "message": msg}
        print(f"STATUS: {json.dumps(payload, ensure_ascii=False)}", flush=True)

    try:
        # Ejecutar Pipeline Híbrido en el threadpool
        def hybrid_pipeline():
            # Fase 1: Ritmo (con caché SHA-256)
            hasher = hashlib.sha256()
            with open(resolved_path, "rb") as f:
                while chunk := f.read(65536):
                    hasher.update(chunk)
            file_hash = hasher.hexdigest()

            if file_hash in rhythm_cache:
                emit_structured("loading audio")
                emit_structured("computing stft")
                emit_structured("detecting onsets")
                emit_structured("tracking beats")
                emit_structured("analysis complete")
                emit_structured("Reutilizando análisis de ritmo en caché (SHA-256 match)")
                rhythm_payload = rhythm_cache[file_hash].copy()
            else:
                rhythm_payload = analyze_rhythm_file(str(resolved_path), emit_structured)
                rhythm_cache[file_hash] = rhythm_payload.copy()

            # Construir objeto dummy para pasar a Fase 2
            class RhythmDataDict:
                pass
            rhythm_data = RhythmDataDict()
            rhythm_data.onsets = rhythm_payload.get('onset_times_ms', [])

            # Fase 2: Espacial (ONNX)
            spatial_response = run_spatial_inference(rhythm_data, str(resolved_path), emit_structured, custom_model_path=request.custom_model_path)

            # Fase 3: Geometría (Catmull-Rom & Distance Snap)
            from engine.core.stage3_polish import apply_geometric_polish
            from engine.map_generator import generate_osz

            emit_structured("Aplicando pulido geométrico y restricciones (Fase 3)")
            polished_objects = apply_geometric_polish(
                spatial_objects=spatial_response.predicted_objects,
                tempo_bpm=rhythm_payload.get('tempo_bpm', 120.0),
                difficulty=request.difficulty,
                prompt=request.prompt,
                mapping_style=request.mapping_style,
                onset_hitsounds=rhythm_payload.get('onset_hitsounds', [])
            )

            # Compilación: Ensamblado .osu y empaquetado .osz
            emit_structured("Ensamblando estructura .osu y empaquetando en .osz")
            osz_path = generate_osz(
                request=request,
                tempo_bpm=rhythm_payload.get('tempo_bpm', 120.0),
                beat_times_ms=rhythm_payload.get('beat_times_ms', []),
                polished_objects=polished_objects,
                kiai_ranges=rhythm_payload.get('kiai_ranges', [])
            )

            # Inspección de jugabilidad (Fase 3)
            from engine.core.inspector import audit_beatmap
            audit_metrics = audit_beatmap(polished_objects, duration_ms=rhythm_payload.get('duration_ms', 0))

            # Combinar respuestas
            rhythm_payload["spatial_objects"] = polished_objects
            rhythm_payload["spatial_metrics"] = spatial_response.metrics
            rhythm_payload["osz_path"] = osz_path
            rhythm_payload["strain_graph"] = audit_metrics["strain_graph"]
            rhythm_payload["estimated_star_rating"] = audit_metrics["estimated_star_rating"]
            rhythm_payload["audit_issues"] = audit_metrics["audit_issues"]

            emit_structured("Generación exitosa. Pipeline completado.")
            return rhythm_payload

        payload = await run_in_threadpool(hybrid_pipeline)
    except AnalysisCancelledError as error:
        if request.analysis_id:
            active_analyses.pop(request.analysis_id, None)
        raise HTTPException(status_code=499, detail=str(error)) from error
    except UnsupportedAudioFileError as error:
        if request.analysis_id:
            active_analyses.pop(request.analysis_id, None)
        raise HTTPException(status_code=415, detail="Unsupported or unreadable audio file") from error
    except Exception as error:
        if request.analysis_id:
            active_analyses.pop(request.analysis_id, None)
        raise HTTPException(status_code=500, detail=f"Internal analysis failure: {str(error)}") from error
    finally:
        if request.analysis_id:
            active_analyses.pop(request.analysis_id, None)

    return {"status": "ok", "engine": ENGINE_NAME, **payload}


@app.post("/analyze/repackage")
async def repackage_map(payload: RepackageRequest):
    from engine.map_generator import generate_osz
    from engine.core.inspector import audit_beatmap
    try:
        def do_repackage():
            path = generate_osz(
                request=payload.request,
                tempo_bpm=payload.tempo_bpm,
                beat_times_ms=payload.beat_times_ms,
                polished_objects=payload.polished_objects,
                kiai_ranges=payload.kiai_ranges
            )
            metrics = audit_beatmap(payload.polished_objects)
            return path, metrics

        osz_path, audit_metrics = await run_in_threadpool(do_repackage)
        return {
            "status": "ok",
            "osz_path": osz_path,
            "strain_graph": audit_metrics["strain_graph"],
            "estimated_star_rating": audit_metrics["estimated_star_rating"],
            "audit_issues": audit_metrics["audit_issues"]
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Repackage failure: {str(error)}") from error


@app.post("/analyze/copilot")
async def run_copilot(payload: CopilotRequest):
    from engine.core.copilot import generate_copilot_section
    from engine.core.inspector import audit_beatmap
    try:
        def do_copilot():
            updated_objects = generate_copilot_section(payload)
            metrics = audit_beatmap(updated_objects)
            return updated_objects, metrics

        updated_objects, audit_metrics = await run_in_threadpool(do_copilot)
        return {
            "status": "ok",
            "spatial_objects": updated_objects,
            "strain_graph": audit_metrics["strain_graph"],
            "estimated_star_rating": audit_metrics["estimated_star_rating"],
            "audit_issues": audit_metrics["audit_issues"]
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Copilot failure: {str(error)}") from error


@app.get("/export/detect_osu")
async def detect_osu():
    from engine.core.osu_exporter import detect_osu_songs_folder
    detected = detect_osu_songs_folder()
    return {"status": "ok", "songs_dir": detected}


@app.post("/export/install_osu")
async def install_osu(payload: InstallOsuRequest):
    from engine.core.osu_exporter import install_osz_to_osu
    try:
        def do_install():
            return install_osz_to_osu(payload.osz_path, payload.custom_songs_dir)
        res = await run_in_threadpool(do_install)
        return {"status": "ok", **res}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Osu install failure: {str(error)}") from error



def emit_status(message: str) -> None:
    print(f"STATUS: {message}", flush=True)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"STATUS: Starting Karakuri API on 127.0.0.1:{port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="error")
