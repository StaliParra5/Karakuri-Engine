import math
from typing import List, Dict, Any
from engine.schemas.full import CopilotRequest

def generate_copilot_section(req: CopilotRequest) -> List[Dict[str, Any]]:
    # Filter out existing objects in the target interval
    retained_objects = [
        obj for obj in req.objects
        if obj["time_ms"] < req.start_ms or obj["time_ms"] > req.end_ms
    ]

    ms_per_beat = 60000.0 / req.tempo_bpm if req.tempo_bpm > 0 else 500.0
    directive = req.directive.lower()

    # Determine subdivision step
    if "stream" in directive or "rápido" in directive or "rapido" in directive:
        step_ms = ms_per_beat / 4.0
        dist_step = 35.0
    elif "jump" in directive or "salto" in directive:
        step_ms = ms_per_beat / 2.0
        dist_step = 140.0
    elif "slider" in directive or "flow" in directive:
        step_ms = ms_per_beat
        dist_step = 80.0
    else:
        step_ms = ms_per_beat / 2.0
        dist_step = 70.0

    generated_objects = []
    current_time = float(req.start_ms)
    
    # Starting center coordinates
    cx, cy = 256.0, 192.0
    angle = 0.0

    idx = 0
    while current_time <= req.end_ms:
        time_int = int(round(current_time))
        
        # Calculate coordinates using spiral / oscillating pattern
        if "jump" in directive or "salto" in directive:
            # Triangular jumps
            angle += (2.0 * math.pi / 3.0)
            x = 256.0 + math.cos(angle) * dist_step * 1.2
            y = 192.0 + math.sin(angle) * dist_step * 1.2
        elif "stream" in directive:
            # Flowing arc
            angle += 0.35
            cx = max(64.0, min(448.0, cx + math.cos(angle * 0.5) * 15.0))
            cy = max(64.0, min(320.0, cy + math.sin(angle * 0.5) * 15.0))
            x = cx + math.cos(angle) * dist_step
            y = cy + math.sin(angle) * dist_step
        else:
            angle += 0.8
            x = 256.0 + math.cos(angle) * dist_step
            y = 192.0 + math.sin(angle) * dist_step

        x = max(32, min(480, int(round(x))))
        y = max(32, min(352, int(round(y))))

        hs = 2 if (idx % 4 == 0) else 0

        if ("slider" in directive or "flow" in directive) and idx % 2 == 0 and (current_time + step_ms * 0.8) <= req.end_ms:
            end_x = max(32, min(480, int(x + 60)))
            end_y = max(32, min(352, int(y + 40)))
            obj = {
                "time_ms": time_int,
                "x": x,
                "y": y,
                "object_type": 2,
                "hit_sound": hs,
                "slider_type": "L",
                "slider_end_x": end_x,
                "slider_end_y": end_y,
                "slider_length": 80.0
            }
        else:
            obj = {
                "time_ms": time_int,
                "x": x,
                "y": y,
                "object_type": 1,
                "hit_sound": hs
            }

        generated_objects.append(obj)
        current_time += step_ms
        idx += 1

    combined = retained_objects + generated_objects
    combined.sort(key=lambda o: o["time_ms"])
    return combined
