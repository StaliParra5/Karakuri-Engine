import io
import math
import threading
import time
import unittest
import wave
from array import array
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
import sys

ROOT = Path(__file__).resolve().parents[2]
SITE_PACKAGES = ROOT / "engine" / ".venv" / "Lib" / "site-packages"

if SITE_PACKAGES.exists():
    sys.path.insert(0, str(SITE_PACKAGES))

sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from engine.main import app


def write_click_track_wav(path: Path, bpm: int = 120, beats: int = 8, sample_rate: int = 22050) -> None:
    samples_per_beat = int(sample_rate * 60 / bpm)
    click_length = int(sample_rate * 0.04)
    total_samples = samples_per_beat * beats
    pcm = array("h", [0] * total_samples)

    for beat_index in range(beats):
        start = beat_index * samples_per_beat
        for offset in range(click_length):
            sample_index = start + offset
            if sample_index >= total_samples:
                break

            amplitude = math.sin(2 * math.pi * 880 * offset / sample_rate)
            envelope = 1.0 - (offset / click_length)
            pcm[sample_index] = int(24000 * amplitude * envelope)

    with wave.open(str(path), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm.tobytes())


class RhythmAnalysisApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_analyze_rhythm_returns_expected_shape_for_valid_audio(self) -> None:
        with TemporaryDirectory() as temp_dir:
            audio_path = Path(temp_dir) / "click-track.wav"
            write_click_track_wav(audio_path)

            response = self.client.post("/analyze/rhythm", json={"audio_path": str(audio_path)})

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["engine"], "Karakuri v1.0")
        self.assertEqual(payload["sample_rate"], 22050)
        self.assertEqual(payload["analysis_window_fft"], 2048)
        self.assertEqual(payload["frame_hop_length"], 512)
        self.assertGreater(payload["duration_ms"], 0)
        self.assertAlmostEqual(payload["tempo_bpm"], 117.45, delta=3.0)
        self.assertGreater(len(payload["beat_times_ms"]), 0)
        self.assertGreater(len(payload["onset_times_ms"]), 0)
        self.assertEqual(payload["beat_times_ms"], sorted(payload["beat_times_ms"]))
        self.assertEqual(payload["onset_times_ms"], sorted(payload["onset_times_ms"]))

    def test_analyze_rhythm_returns_400_for_empty_audio_path(self) -> None:
        response = self.client.post("/analyze/rhythm", json={"audio_path": ""})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "audio_path must not be empty")

    def test_analyze_rhythm_returns_404_for_missing_audio_file(self) -> None:
        response = self.client.post(
            "/analyze/rhythm",
            json={"audio_path": str(ROOT / "engine" / "tests" / "fixtures" / "missing.wav")},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Audio file not found")

    def test_analyze_rhythm_returns_415_for_non_audio_input(self) -> None:
        with TemporaryDirectory() as temp_dir:
            invalid_path = Path(temp_dir) / "not-audio.txt"
            invalid_path.write_text("not audio", encoding="utf-8")

            response = self.client.post("/analyze/rhythm", json={"audio_path": str(invalid_path)})

        self.assertEqual(response.status_code, 415)
        self.assertEqual(response.json()["detail"], "Unsupported or unreadable audio file")

    def test_analyze_rhythm_emits_progress_status_lines(self) -> None:
        with TemporaryDirectory() as temp_dir:
            audio_path = Path(temp_dir) / "click-track.wav"
            write_click_track_wav(audio_path)
            stdout_buffer = io.StringIO()

            with redirect_stdout(stdout_buffer):
                response = self.client.post("/analyze/rhythm", json={"audio_path": str(audio_path)})

        self.assertEqual(response.status_code, 200)
        stdout_output = stdout_buffer.getvalue()
        self.assertIn('"message": "loading audio"', stdout_output)
        self.assertIn('"message": "computing stft"', stdout_output)
        self.assertIn('"message": "detecting onsets"', stdout_output)
        self.assertIn('"message": "tracking beats"', stdout_output)
        self.assertIn('"message": "analysis complete"', stdout_output)

    def test_analyze_rhythm_does_not_block_health_checks(self) -> None:
        ready = threading.Event()
        release = threading.Event()
        response_holder: dict[str, int] = {}

        def slow_analysis(_: str, __=None):
            ready.set()
            release.wait(timeout=2)
            return {
                "sample_rate": 22050,
                "duration_ms": 1000,
                "tempo_bpm": 120.0,
                "beat_times_ms": [0, 500],
                "onset_times_ms": [0, 500],
                "frame_hop_length": 512,
                "analysis_window_fft": 2048,
            }

        def send_analysis_request() -> None:
            response = self.client.post("/analyze/rhythm", json={"audio_path": str(audio_path)})
            response_holder["status_code"] = response.status_code

        with TemporaryDirectory() as temp_dir:
            audio_path = Path(temp_dir) / "click-track.wav"
            write_click_track_wav(audio_path)

            with patch("engine.main.analyze_rhythm_file", side_effect=slow_analysis):
                analysis_thread = threading.Thread(target=send_analysis_request)
                analysis_thread.start()
                ready.wait(timeout=2)

                start = time.perf_counter()
                health_response = self.client.get("/health")
                elapsed = time.perf_counter() - start

                release.set()
                analysis_thread.join(timeout=2)

        self.assertEqual(health_response.status_code, 200)
        self.assertLess(elapsed, 0.2)
        self.assertEqual(response_holder["status_code"], 200)


if __name__ == "__main__":
    unittest.main()
