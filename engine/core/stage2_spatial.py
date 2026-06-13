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

def run_spatial_inference(rhythm_data, progress_callback=None) -> SpatialAnalysisResponse:
    if progress_callback:
        progress_callback("Iniciando Fase 2 (Espacial)")
    
    start_time = time.time()
    
    models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
    fp32_path = os.path.join(models_dir, "osusync_model_v1_fp32.onnx")
    qint8_path = os.path.join(models_dir, "osusync_model_v1.onnx")
    
    # Cuantizar si no existe la versión optimizada
    if progress_callback:
        progress_callback("Verificando e inicializando motor ONNX")
    quantize_model_if_needed(fp32_path, qint8_path)
    
    # Cargar sesión de ONNX
    if progress_callback:
        progress_callback("Cargando grafo ONNX en memoria")
    session = ort.InferenceSession(qint8_path, providers=['CPUExecutionProvider'])
    
    # Procesar datos (adaptando rhythm_data a tensor de entrada)
    onsets = rhythm_data.onsets
    seq_length = 100
        
    # Crear tensor de entrada dummy basado en la longitud fija (batch_size=1, seq_length, feature_dim=10)
    # En un modelo real, aquí se extraerían features específicos de librosa y se iteraría con ventanas deslizantes.
    input_tensor = np.random.randn(1, seq_length, 10).astype(np.float32)
    
    if progress_callback:
        progress_callback("Ejecutando inferencia neuronal sobre clústers")
    
    # Ejecutar inferencia
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: input_tensor})
    
    # outputs[0] = coordinates (1, seq_length, 2)
    # outputs[1] = object_types (1, seq_length, 3)
    coords = outputs[0][0]
    types_logits = outputs[1][0]
    
    predicted_objects = []
    
    if progress_callback:
        progress_callback("Decuantizando y mapeando resultados espaciales")
        
    for i in range(seq_length):
        x_norm = float(coords[i][0])
        y_norm = float(coords[i][1])
        
        # Mapeo a resolución osu!
        x = x_norm * 512.0
        y = y_norm * 384.0
        
        # Obtener el tipo con mayor probabilidad
        type_idx = int(np.argmax(types_logits[i]))
        obj_types = [1, 2, 12] # HitCircle, Slider, Spinner
        obj_type = obj_types[type_idx]
        
        # Asignar tiempo basado en onsets si existen
        time_ms = float(onsets[i]) if i < len(onsets) else float(i * 500)
        
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
