from __future__ import annotations

from pydantic import BaseModel


class FullAnalysisRequest(BaseModel):
    audio_path: str
    analysis_id: str | None = None
    title: str = "Unknown Title"
    artist: str = "Unknown Artist"
    creator: str = "Automapper"
    difficulty: str = "Normal"
    mapping_style: str = "Standard"
    prompt: str = ""
    background_path: str | None = None
    cs: float = 4.0
    ar: float = 9.0
    od: float = 8.0
    hp: float = 6.0
    game_mode: str = "Standard"
    custom_model_path: str | None = None


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
    kiai_ranges: list[tuple[int, int]] | None = None
    onset_hitsounds: list[int] | None = None
    spatial_objects: list[dict] | None = None
    strain_graph: list[float] | None = None
    estimated_star_rating: float | None = None
    audit_issues: list[dict] | None = None


class RepackageRequest(BaseModel):
    request: FullAnalysisRequest
    tempo_bpm: float
    beat_times_ms: list[int]
    polished_objects: list[dict[str, object]]
    kiai_ranges: list[tuple[int, int]] | None = None
    spatial_objects: list[dict] = []
    spatial_metrics: dict | None = None


class CopilotRequest(BaseModel):
    objects: list[dict[str, object]]
    start_ms: int
    end_ms: int
    directive: str = "stream"
    tempo_bpm: float = 120.0
    game_mode: str = "Standard"
    cs: float = 4.0


class InstallOsuRequest(BaseModel):
    osz_path: str
    custom_songs_dir: str | None = None
