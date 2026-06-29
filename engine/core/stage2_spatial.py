import os
import time
import numpy as np
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType

from engine.schemas.spatial import SpatialAnalysisResponse, PredictedObject

def quantize_model_if_needed(fp32_path: str, qint8_path: str):
    if not os.path.exists(fp32_path):
        raise FileNotFoundError(f"No se encontró el modelo original {fp32_path}")
    
    if not os.path.exists(qint8_path):
        print(f"STATUS: Cuantizando modelo dinámicamente: {fp32_path} -> {qint8_path}")
        quantize_dynamic(
            model_input=fp32_path,
            model_output=qint8_path,
            weight_type=QuantType.QInt8
        )
        print("STATUS: Cuantización dinámica completada.")

def run_spatial_inference(rhythm_data, audio_path: str, progress_callback=None, custom_model_path: str | None = None) -> SpatialAnalysisResponse:
    import librosa
    if progress_callback:
        progress_callback("Iniciando Fase 2 (Espacial)")
    
    start_time = time.time()
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    fp32_path = os.path.join(models_dir, "osusync_model_v1_fp32.onnx")
    qint8_path = os.path.join(models_dir, "osusync_model_v1.onnx")
    
    model_to_load = qint8_path
    if custom_model_path and os.path.exists(custom_model_path):
        if progress_callback:
            progress_callback(f"Cargando modelo personalizado: {custom_model_path}")
        model_to_load = custom_model_path
    else:
        if progress_callback:
            progress_callback("Verificando e inicializando motor ONNX estándar")
        quantize_model_if_needed(fp32_path, qint8_path)
    
    if progress_callback:
        progress_callback("Cargando grafo ONNX en memoria")
    session = ort.InferenceSession(model_to_load, providers=['CPUExecutionProvider'])
    input_name = session.get_inputs()[0].name
    
    if progress_callback:
        progress_callback("Extrayendo características acústicas reales (MFCC)")
        
    y, sr = librosa.load(audio_path, sr=22050)
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=10)
    mfccs = mfccs.T  # Shape: (num_frames, 10)
    
    onsets = rhythm_data.onsets
    if not onsets:
        onsets = [0.0]
        
    onsets_frames = librosa.time_to_frames(np.array(onsets) / 1000.0, sr=sr)
    
    seq_length = 100
    predicted_objects = []
    
    num_chunks = int(np.ceil(len(onsets) / seq_length))
    
    if progress_callback:
        progress_callback("Ejecutando inferencia neuronal con Sliding Window")
        
    for chunk_idx in range(num_chunks):
        if progress_callback:
            progress_callback(f"Fase 2: Lote de red neuronal {chunk_idx + 1}/{num_chunks}")
            
        start_idx = chunk_idx * seq_length
        end_idx = min(start_idx + seq_length, len(onsets))
        actual_chunk_size = end_idx - start_idx
        
        chunk_frames = onsets_frames[start_idx:end_idx]
        chunk_onsets = onsets[start_idx:end_idx]
        
        # Construir tensor
        input_tensor = np.zeros((1, seq_length, 10), dtype=np.float32)
        for i, frame in enumerate(chunk_frames):
            frame_idx = min(frame, len(mfccs) - 1)
            input_tensor[0, i, :] = mfccs[frame_idx]
            
        outputs = session.run(None, {input_name: input_tensor})
        coords = outputs[0][0]
        types_logits = outputs[1][0]
        
        for i in range(actual_chunk_size):
            x_norm = float(coords[i][0])
            y_norm = float(coords[i][1])
            
            x = x_norm * 512.0
            y = y_norm * 384.0
            
            type_idx = int(np.argmax(types_logits[i]))
            obj_types = [1, 2, 12]
            obj_type = obj_types[type_idx]
            time_ms = float(chunk_onsets[i])
            
            predicted_objects.append(PredictedObject(
                time_ms=time_ms,
                x=x,
                y=y,
                object_type=obj_type
            ))
            
    metrics = {
        "inference_time_ms": (time.time() - start_time) * 1000.0,
        "nodes_predicted": len(predicted_objects)
    }
    
    if progress_callback:
        progress_callback("Fase 2 (Espacial) completada")
        
    return SpatialAnalysisResponse(
        predicted_objects=predicted_objects,
        metrics=metrics
    )
