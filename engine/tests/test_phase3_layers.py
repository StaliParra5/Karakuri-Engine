import os
import zipfile
import pytest
from engine.core.inspector import audit_beatmap
from engine.core.stage3_polish import get_style_multipliers
from engine.map_generator import generate_osz
from engine.schemas import FullAnalysisRequest

def test_inspector_audit():
    # Test normal sequence
    objects = [
        {"time_ms": 100, "x": 100, "y": 100, "object_type": 1},
        {"time_ms": 500, "x": 200, "y": 200, "object_type": 1},
        # Inhumane spike (<60ms, >120px)
        {"time_ms": 530, "x": 400, "y": 400, "object_type": 1}
    ]
    res = audit_beatmap(objects, duration_ms=2000)
    assert "strain_graph" in res
    assert res["estimated_star_rating"] > 0
    assert len(res["audit_issues"]) == 1
    assert res["audit_issues"][0]["severity"] == "error"
    assert "Inhumano" in res["audit_issues"][0]["message"] or "inhumano" in res["audit_issues"][0]["message"]

def test_mapper_styles():
    dist_sotarks, _ = get_style_multipliers("Sotarks Style (High Jump)")
    assert dist_sotarks == 1.8
    dist_monstrata, _ = get_style_multipliers("Monstrata Flow")
    assert dist_monstrata == 1.2
    dist_kroytz, _ = get_style_multipliers("Kroytz Tech")
    assert dist_kroytz == 1.3

def test_multi_difficulty_and_storyboard(tmp_path):
    dummy_audio = tmp_path / "test.mp3"
    dummy_audio.write_text("dummy audio content")

    req = FullAnalysisRequest(
        audio_path=str(dummy_audio),
        title="Test Title",
        artist="Test Artist",
        creator="Tester",
        difficulty="Insane"
    )

    objects = [
        {"time_ms": 100, "x": 100, "y": 100, "object_type": 1, "hit_sound": 0},
        {"time_ms": 300, "x": 200, "y": 200, "object_type": 1, "hit_sound": 2},
        {"time_ms": 500, "x": 300, "y": 300, "object_type": 1, "hit_sound": 0}
    ]

    osz_path = generate_osz(req, tempo_bpm=120.0, beat_times_ms=[100, 300, 500], polished_objects=objects, kiai_ranges=[(100, 500)])
    assert os.path.exists(osz_path)

    with zipfile.ZipFile(osz_path, 'r') as zf:
        names = zf.namelist()
        osu_files = [n for n in names if n.endswith(".osu")]
        osb_files = [n for n in names if n.endswith(".osb")]
        assert len(osu_files) >= 5
        assert len(osb_files) == 1
        assert any("Easy" in n for n in osu_files)
        assert any("Insane" in n for n in osu_files)
        assert any("Expert" in n for n in osu_files)
