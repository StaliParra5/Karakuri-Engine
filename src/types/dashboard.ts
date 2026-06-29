export type BridgeStatus = 'offline' | 'connecting' | 'online' | 'sandbox'

export interface PreflightStatus {
  status: string
  checks: {
    librosa: string
    numpy: string
    onnx_runtime: string
  }
}

export interface SelectedAudioFile {
  path: string
  fileName: string
  extension: 'mp3' | 'ogg' | 'wav'
}

export interface DashboardFormState {
  title: string
  artist: string
  creator: string
  difficulty: string
  mappingStyle: string
  gameMode: string
  customModelPath: string
  aiPrompt: string
  backgroundPath: string
  cs: number
  ar: number
  od: number
  hp: number
}

export interface SpatialObject {
  time_ms: number
  x: number
  y: number
  object_type: number
  slider_length?: number
  slider_end_x?: number
  slider_end_y?: number
  slider_type?: string
  hit_sound?: number
}

export interface AuditIssue {
  time_ms: number
  x: number
  y: number
  severity: 'warning' | 'error'
  message: string
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
  spatial_objects?: SpatialObject[]
  kiai_ranges?: [number, number][]
  onset_hitsounds?: number[]
  strain_graph?: number[]
  estimated_star_rating?: number
  audit_issues?: AuditIssue[]
}

export interface CopilotResponse {
  status: 'ok'
  spatial_objects: SpatialObject[]
  strain_graph?: number[]
  estimated_star_rating?: number
  audit_issues?: AuditIssue[]
}

export interface HistoryMetadata {
  title: string
  artist: string
  creator: string
  difficulty: string
  mappingStyle?: string
  gameMode?: string
  customModelPath?: string
  aiPrompt: string
  backgroundPath: string
  cs: number
  ar: number
  od: number
  hp: number
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
