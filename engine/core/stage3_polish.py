import math
import random
from typing import List, Dict, Any
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

def apply_geometric_polish(
    spatial_objects: List[PredictedObject],
    tempo_bpm: float,
    difficulty: str = "Normal",
    prompt: str = ""
) -> List[Dict[str, Any]]:
    """
    Capa 3: Pulido Geométrico (Heurística de Flujo)
    Desapila los círculos de ONNX, inyecta combos, y aplica
    Distance Snap basado en la dificultad y el prompt.
    """
    ms_per_beat = 60000.0 / tempo_bpm if tempo_bpm > 0 else 500.0
    slider_multiplier = 1.4
    
    p_lower = prompt.lower()
    dist_mult = get_difficulty_multiplier(difficulty)
    
    if "jump" in p_lower or "salto" in p_lower:
        dist_mult *= 1.4
    if "stream" in p_lower or "fluido" in p_lower:
        dist_mult *= 0.6
        
    polished_objects = []
    current_x, current_y = 256.0, 192.0
    angle = 0.0
    last_combo_time = -9999.0
    
    for i, obj in enumerate(spatial_objects):
        obj_dict = {
            "time_ms": obj.time_ms,
            "x": obj.x,
            "y": obj.y,
            "object_type": obj.object_type
        }
        
        time_diff_prev = obj.time_ms - polished_objects[-1]["time_ms"] if i > 0 else ms_per_beat
        
        # 1. Anti-Stacking Procedural Walker
        beats_elapsed = time_diff_prev / ms_per_beat
        target_dist = min(beats_elapsed * 100.0 * dist_mult, 300.0) # cap distance
        
        if time_diff_prev > ms_per_beat * 0.9:
            angle += random.uniform(math.pi/2, math.pi * 0.8)
        else:
            angle += random.uniform(-0.2, 0.2)
            
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
        if obj.time_ms - last_combo_time >= ms_per_beat * 3.5:
            if obj_dict["object_type"] in [1, 2]:
                obj_dict["object_type"] += 4
            last_combo_time = obj.time_ms
        
        # 3. Slider Generation
        if i < len(spatial_objects) - 1:
            next_obj = spatial_objects[i + 1]
            time_diff_next = next_obj.time_ms - obj.time_ms
            
            if obj_dict["object_type"] in [2, 6]:
                force_circle = False
                if ("jump" in p_lower or "circle" in p_lower) and random.random() < 0.6:
                    force_circle = True
                elif random.random() < 0.3:
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
