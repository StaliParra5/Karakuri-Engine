export type BridgeStatus = 'offline' | 'connecting' | 'online' | 'sandbox'

export interface SelectedAudioFile {
  path: string
  fileName: string
  extension: 'mp3' | 'ogg' | 'wav'
}

export interface DashboardFormState {
  title: string
  artist: string
  creator: string
  intensity: number
  backgroundPath: string
}

export interface FullAnalysisResponse {
  status: 'ok'
  engine: string
  sample_rate: number
  duration_ms: number
  tempo_bpm: number
  beat_times_ms: number[]
  onset_times_ms: number[]
  frame_hop_length: number
  analysis_window_fft: number
  osz_path?: string
}

export interface HistoryMetadata {
  title: string
  artist: string
  creator: string
  intensity: number
  backgroundPath: string
}

export interface HistoryResultSummary {
  tempoBpm: number
  durationMs: number
  beatCount: number
  onsetCount: number
}

export interface DashboardHistoryEntry {
  id: string
  timestamp: string
  audioPath: string
  audioFileName: string
  audioExtension: string
  metadata: HistoryMetadata
  result: HistoryResultSummary
}
