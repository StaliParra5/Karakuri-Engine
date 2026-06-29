import os
import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient

from engine.main import app


def generate_dummy_wav(path: str):
    sample_rate = 22050
    t = np.linspace(0, 2.0, sample_rate * 2)  # 2 segundos
    # Generar pulsos percusivos simulando beats
    audio = 0.1 * np.random.randn(len(t))
    for beat_time in [0.2, 0.7, 1.2, 1.7]:
        idx = int(beat_time * sample_rate)
        audio[idx:idx+1000] += np.sin(2 * np.pi * 440 * np.linspace(0, 0.05, 1000))
    sf.write(path, audio, sample_rate)


def test_e2e_full_pipeline_with_presets():
    client = TestClient(app)
    wav_path = "e2e_test_audio.wav"
    generate_dummy_wav(wav_path)

    try:
        response = client.post(
            "/analyze/full",
            json={
                "audio_path": os.path.abspath(wav_path),
                "analysis_id": "job-e2e-101",
                "title": "E2E Test Song",
                "artist": "Karakuri E2E",
                "creator": "Automapper",
                "difficulty": "Insane",
                "mapping_style": "Jump Training",
                "prompt": "saltos energéticos"
            }
        )

        assert response.status_code == 200, f"Error: {response.text}"
        data = response.json()

        assert data["status"] == "ok"
        assert data["tempo_bpm"] > 0
        assert "spatial_objects" in data
        assert isinstance(data["spatial_objects"], list)

        # Verificar validación geométrica (coordenadas dentro de pantalla osu!)
        for obj in data["spatial_objects"]:
            assert 10.0 <= obj["x"] <= 502.0, f"X out of bounds: {obj['x']}"
            assert 10.0 <= obj["y"] <= 374.0, f"Y out of bounds: {obj['y']}"
            assert "time_ms" in obj

        # Verificar archivo .osz generado en disco
        osz_path = data.get("osz_path")
        assert osz_path is not None
        assert os.path.exists(osz_path), f"Archivo .osz no encontrado en {osz_path}"
        assert os.path.getsize(osz_path) > 0

    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)
        if 'osz_path' in locals() and osz_path and os.path.exists(osz_path):
            os.remove(osz_path)
