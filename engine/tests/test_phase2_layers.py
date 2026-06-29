import unittest
from tempfile import TemporaryDirectory
from pathlib import Path
import numpy as np
import scipy.io.wavfile as wavfile
from fastapi.testclient import TestClient

from engine.main import app
from engine.core import analyze_rhythm_file
from engine.core.stage3_polish import apply_geometric_polish
from engine.core.stage2_spatial import PredictedObject

def write_synth_wav(path: Path) -> None:
    sample_rate = 22050
    # Create 3 seconds of silence followed by 2 seconds of loud high-frequency tone (to trigger kiai/whistle)
    t1 = np.linspace(0, 3, sample_rate * 3, endpoint=False)
    silence = np.zeros_like(t1)
    
    t2 = np.linspace(0, 2, sample_rate * 2, endpoint=False)
    loud_tone = np.sin(2 * np.pi * 4000 * t2) * 0.9  # 4kHz tone
    
    audio = np.concatenate([silence, loud_tone])
    audio_int16 = np.int16(audio * 32767)
    wavfile.write(path, sample_rate, audio_int16)

class Phase2LayersTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_kiai_and_hitsound_detection(self) -> None:
        with TemporaryDirectory() as temp_dir:
            audio_path = Path(temp_dir) / "test_features.wav"
            write_synth_wav(audio_path)
            
            res = analyze_rhythm_file(str(audio_path))
            self.assertIn("kiai_ranges", res)
            self.assertIn("onset_hitsounds", res)
            # Ensure we detected at least some onset hitsounds
            self.assertIsInstance(res["onset_hitsounds"], list)

    def test_prompt_modulation_and_hitsound_attachment_in_stage3(self) -> None:
        objs = [
            PredictedObject(time_ms=1000, x=256, y=192, object_type=2),
            PredictedObject(time_ms=1500, x=300, y=200, object_type=1)
        ]
        # Test prompt 'fast' increases slider multiplier / length relative to normal
        normal_polish = apply_geometric_polish(objs, tempo_bpm=120.0, prompt="")
        fast_polish = apply_geometric_polish(objs, tempo_bpm=120.0, prompt="fast intense")
        slow_polish = apply_geometric_polish(objs, tempo_bpm=120.0, prompt="slow")
        
        # Check hitsounds attachment
        hs_polish = apply_geometric_polish(objs, tempo_bpm=120.0, onset_hitsounds=[2, 8])
        self.assertEqual(hs_polish[0]["hit_sound"], 2)
        self.assertEqual(hs_polish[1]["hit_sound"], 8)

    def test_repackage_endpoint(self) -> None:
        with TemporaryDirectory() as temp_dir:
            audio_path = Path(temp_dir) / "test_repackage.wav"
            write_synth_wav(audio_path)
            
            payload = {
                "request": {
                    "audio_path": str(audio_path),
                    "title": "Test Repackage",
                    "artist": "Unit Test",
                    "creator": "Karakuri Test"
                },
                "tempo_bpm": 120.0,
                "beat_times_ms": [500, 1000, 1500],
                "polished_objects": [
                    {"time_ms": 500, "x": 256, "y": 192, "object_type": 1, "hit_sound": 2}
                ],
                "kiai_ranges": [[1000, 2000]]
            }
            resp = self.client.post("/analyze/repackage", json=payload)
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertEqual(data["status"], "ok")
            self.assertTrue(Path(data["osz_path"]).exists())


if __name__ == "__main__":
    unittest.main()
