import math
from typing import List, Dict, Any

def audit_beatmap(objects: List[Dict[str, Any]], duration_ms: float = 0) -> Dict[str, Any]:
    """
    Analiza la jugabilidad del beatmap, generando un gráfico de tensión (strain graph),
    una estimación de Star Rating y detectando problemas/spikes de mapeo.
    """
    if not objects:
        return {
            "strain_graph": [],
            "estimated_star_rating": 0.0,
            "audit_issues": []
        }

    # Determinar duración del mapa
    max_time = max(obj.get("time_ms", 0) for obj in objects)
    if duration_ms <= 0:
        duration_ms = max(max_time + 1000, 5000)

    num_bins = max(1, int(math.ceil(duration_ms / 1000.0)))
    bin_counts = [0] * num_bins
    bin_dists = [0.0] * num_bins

    audit_issues = []

    for i in range(len(objects)):
        obj = objects[i]
        t = obj.get("time_ms", 0)
        bin_idx = min(num_bins - 1, max(0, int(t // 1000)))
        bin_counts[bin_idx] += 1

        if i > 0:
            prev = objects[i - 1]
            dt = t - prev.get("time_ms", 0)
            dx = obj.get("x", 256) - prev.get("x", 256)
            dy = obj.get("y", 192) - prev.get("y", 192)
            dist = math.hypot(dx, dy)

            bin_dists[bin_idx] += dist

            # Detección de Spikes Inhumanos
            if 0 < dt < 60 and dist > 120:
                audit_issues.append({
                    "time_ms": t,
                    "x": obj.get("x", 256),
                    "y": obj.get("y", 192),
                    "severity": "error",
                    "message": f"Salto agudo inhumano ({int(dist)}px en {dt}ms)"
                })
            # Detección de Apilamientos veloces peligrosos
            elif 0 < dt < 90 and 0 < dist < 6:
                audit_issues.append({
                    "time_ms": t,
                    "x": obj.get("x", 256),
                    "y": obj.get("y", 192),
                    "severity": "warning",
                    "message": "Apilamiento veloz ambiguo"
                })

    strain_graph = []
    for i in range(num_bins):
        count = bin_counts[i]
        avg_dist = (bin_dists[i] / count) if count > 0 else 0.0
        # Fórmula heurística de tensión por segundo
        strain = (count * 0.4) + (avg_dist / 80.0)
        strain_graph.append(round(strain, 2))

    # Estimar Star Rating tomando el percentil superior del strain
    sorted_strains = sorted(strain_graph, reverse=True)
    top_count = max(1, int(len(sorted_strains) * 0.15))
    top_avg = sum(sorted_strains[:top_count]) / top_count
    estimated_star_rating = round(min(10.0, max(1.0, top_avg * 1.15)), 2)

    return {
        "strain_graph": strain_graph,
        "estimated_star_rating": estimated_star_rating,
        "audit_issues": audit_issues
    }
