from __future__ import annotations

from pydantic import BaseModel


class FullAnalysisRequest(BaseModel):
    audio_path: str
    analysis_id: str | None = None
    title: str = "Unknown Title"
    artist: str = "Unknown Artist"
    creator: str = "Automapper"
    intensity: float = 1.0
    background_path: str | None = None


class FullAnalysisResponse(BaseModel):
    status: str
    engine: str
    sample_rate: int
    duration_ms: int
    tempo_bpm: float
    beat_times_ms: list[int]
    onset_times_ms: list[int]
    frame_hop_length: int
    analysis_window_fft: int
    osz_path: str | None = None
