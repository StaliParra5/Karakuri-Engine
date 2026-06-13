import math
from typing import List, Dict, Any
from engine.schemas import PredictedObject

def apply_geometric_polish(
    spatial_objects: List[PredictedObject],
    tempo_bpm: float,
    intensity: float = 1.0
) -> List[Dict[str, Any]]:
    """
    Capa 3: Pulido Geométrico (Heurística de Flujo)
    Aplica Distance Snap y restricciones temporales para garantizar que el beatmap
    es físicamente jugable.
    """
    ms_per_beat = 60000.0 / tempo_bpm if tempo_bpm > 0 else 500.0
    slider_multiplier = 1.4
    
    # DistanceSpacing is modulated by intensity. Base is 1.0, scales with intensity.
    distance_spacing = max(0.5, min(3.0, 1.0 * intensity))
    
    polished_objects = []
    
    for i, obj in enumerate(spatial_objects):
        obj_dict = {
            "time_ms": obj.time_ms,
            "x": obj.x,
            "y": obj.y,
            "object_type": obj.object_type
        }
        
        # Clamp coordinates to osu! playfield (512x384)
        obj_dict["x"] = max(0.0, min(512.0, obj_dict["x"]))
        obj_dict["y"] = max(0.0, min(384.0, obj_dict["y"]))
        
        # Look ahead for Distance Snap and Slider validation
        if i < len(spatial_objects) - 1:
            next_obj = spatial_objects[i + 1]
            time_diff = next_obj.time_ms - obj.time_ms
            
            # If the model predicted a Slider (type 2 or 6)
            if obj_dict["object_type"] in [2, 6]:
                dx = next_obj.x - obj_dict["x"]
                dy = next_obj.y - obj_dict["y"]
                dist_to_next = math.hypot(dx, dy)
                
                max_allowed_len_px = (time_diff / ms_per_beat) * (slider_multiplier * 100.0) * distance_spacing
                actual_len_px = min(dist_to_next * 0.8, max_allowed_len_px * 0.5)
                
                if actual_len_px < 10.0:
                    obj_dict["object_type"] = 1 if obj_dict["object_type"] == 2 else 5
                else:
                    angle = math.atan2(dy, dx)
                    end_x = obj_dict["x"] + math.cos(angle) * actual_len_px
                    end_y = obj_dict["y"] + math.sin(angle) * actual_len_px
                    
                    end_x = max(0.0, min(512.0, end_x))
                    end_y = max(0.0, min(384.0, end_y))
                    
                    obj_dict["slider_length"] = actual_len_px
                    obj_dict["slider_end_x"] = end_x
                    obj_dict["slider_end_y"] = end_y
                    obj_dict["slider_type"] = "L"
        else:
            if obj_dict["object_type"] in [2, 6]:
                obj_dict["object_type"] = 1 if obj_dict["object_type"] == 2 else 5
                
        polished_objects.append(obj_dict)
        
    return polished_objects
