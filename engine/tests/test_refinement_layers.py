import pytest
from fastapi.testclient import TestClient

from engine.core.stage3_polish import (
    quantize_time_ms,
    get_style_multipliers,
    get_ergonomic_stream_angle,
)
from engine.main import app, active_analyses


def test_quantize_time_ms():
    # BPM = 120 -> 500ms por beat -> grid de 1/8 beat cada 62.5ms
    # 250ms es exactamente 1/2 beat
    assert quantize_time_ms(255, 120.0, tolerance_ms=15.0) == 250
    assert quantize_time_ms(242, 120.0, tolerance_ms=15.0) == 250
    # 280ms está a 30ms de 250 y a 32.5ms de 312.5 -> no se imanta
    assert quantize_time_ms(280, 120.0, tolerance_ms=15.0) == 280


def test_get_style_multipliers():
    dist, slider = get_style_multipliers("Jump Training")
    assert dist == 1.6
    assert slider == 0.4

    dist, slider = get_style_multipliers("Stream Heavy")
    assert dist == 0.5
    assert slider == 0.3


def test_get_ergonomic_stream_angle():
    current = 1.0
    new_angle = get_ergonomic_stream_angle(current, time_diff_ms=100.0, ms_per_beat=500.0)
    diff = abs(new_angle - current)
    assert diff <= 0.35001  # Garantizar que no excede el límite ergonómico


def test_preflight_endpoint():
    client = TestClient(app)
    response = client.get("/preflight")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "checks" in data
    assert data["checks"]["librosa"] == "ok"


def test_cancellation_endpoint():
    client = TestClient(app)
    test_id = "test-job-123"
    active_analyses[test_id] = True

    response = client.post(f"/analyze/cancel/{test_id}")
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    assert active_analyses[test_id] is False
