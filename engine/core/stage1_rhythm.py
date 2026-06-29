from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

import librosa
import numpy as np


ProgressCallback = Callable[[str], None]


@dataclass(frozen=True)
class AnalysisConfig:
    sample_rate: int = 22050
    n_fft: int = 2048
    hop_length: int = 512


@dataclass(frozen=True)
class RhythmAnalysisResult:
    sample_rate: int
    duration_ms: int
    tempo_bpm: float
    beat_times_ms: list[int]
    onset_times_ms: list[int]
    frame_hop_length: int
    analysis_window_fft: int
    kiai_ranges: list[tuple[int, int]] = None
    onset_hitsounds: list[int] = None

    def to_dict(self) -> dict[str, object]:
        return asdict(self)


class UnsupportedAudioFileError(Exception):
    pass


def analyze_rhythm_file(
    audio_path: str,
    progress_callback: ProgressCallback | None = None,
    config: AnalysisConfig | None = None,
) -> dict[str, object]:
    runtime_config = config or AnalysisConfig()
    emit = progress_callback or (lambda _: None)

    emit("loading audio")
    waveform, sample_rate = _load_audio(Path(audio_path), runtime_config)
    duration_ms = int(round((len(waveform) / sample_rate) * 1000))

    emit("computing stft")
    stft_magnitude = np.abs(
        librosa.stft(
            waveform,
            n_fft=runtime_config.n_fft,
            hop_length=runtime_config.hop_length,
        )
    )
    _ = librosa.amplitude_to_db(stft_magnitude, ref=np.max)

    emit("detecting onsets")
    onset_envelope = librosa.onset.onset_strength(
        sr=sample_rate,
        S=stft_magnitude,
        hop_length=runtime_config.hop_length,
    )
    normalized_onset_envelope = librosa.util.normalize(onset_envelope)
    onset_frames = librosa.onset.onset_detect(
        onset_envelope=normalized_onset_envelope,
        sr=sample_rate,
        hop_length=runtime_config.hop_length,
        units="frames",
    )

    emit("tracking beats")
    tempo_bpm, beat_frames = librosa.beat.beat_track(
        onset_envelope=normalized_onset_envelope,
        sr=sample_rate,
        hop_length=runtime_config.hop_length,
        units="frames",
    )

    emit("computing features (kiai & hitsounds)")
    rms = librosa.feature.rms(y=waveform, hop_length=runtime_config.hop_length)[0]
    spectral_centroid = librosa.feature.spectral_centroid(y=waveform, sr=sample_rate, hop_length=runtime_config.hop_length)[0]

    rms_p80 = float(np.percentile(rms, 80)) if len(rms) > 0 else 0.0
    cent_p70 = float(np.percentile(spectral_centroid, 70)) if len(spectral_centroid) > 0 else 3000.0

    onset_hitsounds = []
    for f in onset_frames:
        idx = min(int(f), len(rms) - 1)
        r_val = rms[idx] if idx >= 0 else 0.0
        c_val = spectral_centroid[idx] if idx >= 0 else 0.0
        mask = 0
        if c_val >= max(3000.0, cent_p70):
            mask |= 2  # Whistle
        if r_val >= rms_p80:
            mask |= 8  # Clap
        onset_hitsounds.append(mask)

    kiai_ranges = []
    in_kiai = False
    kiai_start_ms = 0
    hop_ms = (runtime_config.hop_length / sample_rate) * 1000.0
    for i, r_val in enumerate(rms):
        t_ms = int(round(i * hop_ms))
        if r_val >= rms_p80:
            if not in_kiai:
                in_kiai = True
                kiai_start_ms = t_ms
        else:
            if in_kiai:
                in_kiai = False
                if t_ms - kiai_start_ms >= 1500:
                    kiai_ranges.append((kiai_start_ms, t_ms))
    if in_kiai:
        t_ms = int(round(len(rms) * hop_ms))
        if t_ms - kiai_start_ms >= 1500:
            kiai_ranges.append((kiai_start_ms, t_ms))

    emit("analysis complete")
    result = RhythmAnalysisResult(
        sample_rate=sample_rate,
        duration_ms=duration_ms,
        tempo_bpm=float(np.asarray(tempo_bpm).item()),
        beat_times_ms=_frames_to_milliseconds(beat_frames, sample_rate, runtime_config.hop_length),
        onset_times_ms=_frames_to_milliseconds(onset_frames, sample_rate, runtime_config.hop_length),
        frame_hop_length=runtime_config.hop_length,
        analysis_window_fft=runtime_config.n_fft,
        kiai_ranges=kiai_ranges,
        onset_hitsounds=onset_hitsounds,
    )
    return result.to_dict()


def _load_audio(audio_path: Path, config: AnalysisConfig) -> tuple[np.ndarray, int]:
    try:
        waveform, sample_rate = librosa.load(
            audio_path,
            sr=config.sample_rate,
            mono=True,
        )
    except Exception as error:  # pragma: no cover - third-party decoder variance
        raise UnsupportedAudioFileError(str(error)) from error

    return waveform, sample_rate


def _frames_to_milliseconds(frames: np.ndarray, sample_rate: int, hop_length: int) -> list[int]:
    frame_array = np.asarray(frames, dtype=int)
    if frame_array.size == 0:
        return []

    times = librosa.frames_to_time(frame_array, sr=sample_rate, hop_length=hop_length)
    milliseconds = [int(round(time_value * 1000)) for time_value in np.asarray(times, dtype=float)]
    return sorted(milliseconds)
