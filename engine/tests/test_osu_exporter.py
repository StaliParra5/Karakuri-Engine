import tempfile
from pathlib import Path
from engine.core.osu_exporter import detect_osu_songs_folder, install_osz_to_osu

def test_install_osz_to_custom_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        dummy_osz = Path(tmpdir) / "test_beatmap.osz"
        dummy_osz.write_text("dummy zip content")
        
        songs_dir = Path(tmpdir) / "Songs"
        songs_dir.mkdir()
        
        res = install_osz_to_osu(str(dummy_osz), custom_songs_dir=str(songs_dir))
        assert res["installed"] is True
        assert (songs_dir / "test_beatmap.osz").exists()
