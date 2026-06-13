from __future__ import annotations

from pydantic import BaseModel


class FullAnalysisRequest(BaseModel):
    audio_path: str
    analysis_id: str | None = None
    title: str = "Unknown Title"
    artist: str = "Unknown Artist"
    creator: str = "Automapper"
    difficulty: str = "Normal"
    prompt: str = ""
    background_path: str | None = None
    cs: float = 4.0
    ar: float = 9.0
    od: float = 8.0
    hp: float = 6.0


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
