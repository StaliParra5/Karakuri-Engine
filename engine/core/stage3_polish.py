import math
import random
from typing import List, Dict, Any, Tuple
from engine.schemas import PredictedObject

def get_difficulty_multiplier(difficulty: str) -> float:
    diff_map = {
        "easy": 0.5,
        "normal": 1.0,
        "hard": 1.5,
        "insane": 2.2,
        "expert": 3.0
    }
    return diff_map.get(difficulty.lower(), 1.5)

def quantize_time_ms(time_ms: int, tempo_bpm: float, tolerance_ms: float = 15.0) -> int:
    """Imanta el tiempo de la nota a la división de rejilla musical más cercana (1/1, 1/2, 1/4, 1/8)."""
    if tempo_bpm <= 0:
        return time_ms
    ms_per_beat = 60000.0 / tempo_bpm
    grid_step = ms_per_beat / 8.0  # División de 1/8 de beat
    snapped = round(time_ms / grid_step) * grid_step
    if abs(time_ms - snapped) <= tolerance_ms:
        return int(round(snapped))
    return time_ms

def get_style_multipliers(mapping_style: str) -> Tuple[float, float]:
    """Devuelve (multiplicador_distancia, multiplicador_probabilidad_slider)."""
    style = mapping_style.lower()
    if "sotarks" in style:
        return 1.8, 0.35
    elif "jump" in style:
        return 1.6, 0.4
    elif "monstrata" in style or "flow" in style:
        return 1.2, 0.8
    elif "kroytz" in style or "tech" in style:
        return 1.3, 1.6
    elif "stream" in style:
        return 0.5, 0.3
    return 1.0, 1.0

def get_ergonomic_stream_angle(current_angle: float, time_diff_ms: float, ms_per_beat: float) -> float:
    """Calcula un nuevo ángulo evitando giros agudos (<60 grados) en secuencias rápidas."""
    if time_diff_ms < 150.0:
        # Variación suave continua en streams rápidos
        return current_angle + random.uniform(-0.35, 0.35)
    elif time_diff_ms > ms_per_beat * 0.9:
        return current_angle + random.uniform(math.pi / 2, math.pi * 0.8)
    else:
        return current_angle + random.uniform(-0.2, 0.2)

def apply_geometric_polish(
    spatial_objects: List[PredictedObject],
    tempo_bpm: float,
    difficulty: str = "Normal",
    prompt: str = "",
    mapping_style: str = "Standard",
    onset_hitsounds: List[int] = None
) -> List[Dict[str, Any]]:
    """
    Capa 3: Pulido Geométrico (Heurística de Flujo + Quantization)
    Desapila los círculos de ONNX, cuantiza los tiempos al grid del BPM,
    inyecta combos y aplica Distance Snap basado en dificultad, prompt y presets.
    """
    ms_per_beat = 60000.0 / tempo_bpm if tempo_bpm > 0 else 500.0
    slider_multiplier = 1.4

    p_lower = prompt.lower()
    dist_mult = get_difficulty_multiplier(difficulty)
    style_dist_mult, style_slider_prob = get_style_multipliers(mapping_style)
    dist_mult *= style_dist_mult

    if "jump" in p_lower or "salto" in p_lower:
        dist_mult *= 1.4
    if "stream" in p_lower or "fluido" in p_lower:
        dist_mult *= 0.6
    if "slow" in p_lower or "lento" in p_lower:
        slider_multiplier *= 0.75
    if "fast" in p_lower or "rapido" in p_lower or "intense" in p_lower:
        slider_multiplier *= 1.25

    polished_objects = []
    current_x, current_y = 256.0, 192.0
    angle = 0.0
    last_combo_time = -9999.0

    for i, obj in enumerate(spatial_objects):
        snapped_time = quantize_time_ms(obj.time_ms, tempo_bpm)
        hs = onset_hitsounds[i] if (onset_hitsounds and i < len(onset_hitsounds)) else 0
        obj_dict = {
            "time_ms": snapped_time,
            "x": obj.x,
            "y": obj.y,
            "object_type": obj.object_type,
            "hit_sound": hs
        }
        
        time_diff_prev = snapped_time - polished_objects[-1]["time_ms"] if i > 0 else ms_per_beat
        
        # 1. Anti-Stacking Procedural Walker & Ergonomic Flow
        beats_elapsed = time_diff_prev / ms_per_beat
        target_dist = min(beats_elapsed * 100.0 * dist_mult, 300.0)
        
        angle = get_ergonomic_stream_angle(angle, time_diff_prev, ms_per_beat)
            
        new_x = current_x + math.cos(angle) * target_dist
        new_y = current_y + math.sin(angle) * target_dist
        
        # Bounce
        if new_x < 10 or new_x > 502:
            angle = math.pi - angle
            new_x = max(10.0, min(502.0, new_x))
        if new_y < 10 or new_y > 374:
            angle = -angle
            new_y = max(10.0, min(374.0, new_y))
            
        current_x, current_y = new_x, new_y
        obj_dict["x"] = current_x
        obj_dict["y"] = current_y
        
        # 2. Combo Injection
        if snapped_time - last_combo_time >= ms_per_beat * 3.5:
            if obj_dict["object_type"] in [1, 2]:
                obj_dict["object_type"] += 4
            last_combo_time = snapped_time
        
        # 3. Slider Generation
        if i < len(spatial_objects) - 1:
            next_obj = spatial_objects[i + 1]
            next_snapped = quantize_time_ms(next_obj.time_ms, tempo_bpm)
            time_diff_next = next_snapped - snapped_time
            
            if obj_dict["object_type"] in [2, 6]:
                force_circle = False
                if ("jump" in p_lower or "circle" in p_lower) and random.random() < 0.6:
                    force_circle = True
                elif random.random() < (0.3 / style_slider_prob):
                    force_circle = True
                    
                slider_beats = time_diff_next / ms_per_beat
                if slider_beats > 2.0:
                    slider_beats = 1.0
                    
                actual_len_px = slider_beats * (slider_multiplier * 100.0)
                if actual_len_px < 10.0 or force_circle:
                    obj_dict["object_type"] -= 1
                else:
                    s_angle = angle + random.uniform(-0.5, 0.5)
                    end_x = current_x + math.cos(s_angle) * actual_len_px
                    end_y = current_y + math.sin(s_angle) * actual_len_px
                    
                    # Bounce slider end off boundaries
                    if end_x < 10 or end_x > 502:
                        s_angle = math.pi - s_angle
                        end_x = current_x + math.cos(s_angle) * actual_len_px
                        end_x = max(10.0, min(502.0, end_x))
                    if end_y < 10 or end_y > 374:
                        s_angle = -s_angle
                        end_y = current_y + math.sin(s_angle) * actual_len_px
                        end_y = max(10.0, min(374.0, end_y))
                    
                    obj_dict["slider_length"] = actual_len_px
                    obj_dict["slider_end_x"] = end_x
                    obj_dict["slider_end_y"] = end_y
                    obj_dict["slider_type"] = "L"
                    current_x, current_y = end_x, end_y
        else:
            if obj_dict["object_type"] in [2, 6]:
                obj_dict["object_type"] -= 1
                
        polished_objects.append(obj_dict)
        
    return polished_objects
