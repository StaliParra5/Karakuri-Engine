import os
import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient
from engine.main import app

def generate_dummy_wav(path):
    sample_rate = 44100
    t = np.linspace(0, 1.0, sample_rate)
    # Generar un tono simple
    audio_data = 0.5 * np.sin(2 * np.pi * 440 * t)
    sf.write(path, audio_data, sample_rate)

def run_test():
    client = TestClient(app)
    
    test_audio_path = "dummy_test.wav"
    generate_dummy_wav(test_audio_path)
    
    try:
        print("Enviando petición a /analyze/full...")
        response = client.post(
            "/analyze/full",
            json={
                "audio_path": os.path.abspath(test_audio_path),
                "title": "Dummy Test Song",
                "artist": "Karakuri AI",
                "creator": "Automapper",
                "intensity": 1.5
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            print("STATUS: Éxito!")
            print(f"Rhythm keys: {[k for k in data.keys() if k not in ['spatial_objects', 'spatial_metrics']]}")
            print(f"Spatial Metrics: {data.get('spatial_metrics')}")
            objs = data.get('spatial_objects', [])
            print(f"Spatial Objects count: {len(objs)}")
            if objs:
                print(f"Sample Object 0: {objs[0]}")
            print(f"OSZ Path: {data.get('osz_path')}")
        else:
            print(f"ERROR: {response.status_code}")
            print(response.json())
    finally:
        if os.path.exists(test_audio_path):
            os.remove(test_audio_path)

if __name__ == "__main__":
    run_test()
