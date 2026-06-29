import pytest
from engine.schemas import FullAnalysisRequest, CopilotRequest
from engine.map_generator import build_single_osu_content
from engine.core.copilot import generate_copilot_section

def test_multi_mode_osu_header_and_coords():
    req_mania = FullAnalysisRequest(
        audio_path="test.mp3",
        title="Mania Song",
        artist="Artist",
        game_mode="Mania",
        cs=4.0
    )
    objects = [
        {"time_ms": 100, "x": 100, "y": 100, "object_type": 1},
        {"time_ms": 200, "x": 300, "y": 200, "object_type": 1}
    ]
    content_mania = build_single_osu_content(req_mania, "4K Normal", 4.0, 9.0, 8.0, 6.0, 120.0, [100, 200], objects)
    assert "Mode: 3" in content_mania
    # Verify columns generated
    hit_objects_section = content_mania.split("[HitObjects]")[-1]
    lines = [l.strip() for l in hit_objects_section.split("\n") if l.strip()]
    assert len(lines) == 2
    for ho in lines:
        parts = ho.split(",")
        assert parts[1] == "192" # y coordinate in mania is fixed at 192

    req_taiko = FullAnalysisRequest(
        audio_path="test.mp3",
        title="Taiko Song",
        artist="Artist",
        game_mode="Taiko"
    )
    content_taiko = build_single_osu_content(req_taiko, "Taiko Normal", 4.0, 9.0, 8.0, 6.0, 120.0, [100, 200], objects)
    assert "Mode: 1" in content_taiko

def test_copilot_section_generation():
    initial_objects = [
        {"time_ms": 100, "x": 100, "y": 100, "object_type": 1},
        {"time_ms": 1510, "x": 200, "y": 200, "object_type": 1}, # inside target window [1000, 2000], off grid
        {"time_ms": 3000, "x": 300, "y": 300, "object_type": 1}
    ]
    copilot_req = CopilotRequest(
        objects=initial_objects,
        start_ms=1000,
        end_ms=2000,
        directive="stream",
        tempo_bpm=120.0
    )
    updated = generate_copilot_section(copilot_req)
    # 1510 should be replaced by stream notes generated at intervals inside [1000, 2000]
    assert len(updated) > len(initial_objects)
    times = [o["time_ms"] for o in updated]
    assert 100 in times
    assert 3000 in times
    assert 1510 not in times # old object inside interval was removed
