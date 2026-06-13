import type {
  DashboardFormState,
  DashboardHistoryEntry,
  HistoryResultSummary,
  FullAnalysisResponse,
  SelectedAudioFile,
} from '../types/dashboard'

export const HISTORY_STORAGE_KEY = 'karakuri-dashboard-history'

export function isTauriRuntime() {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI_IPC__' in window)
}

export function extractFileName(filePath: string) {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

export function extractExtension(filePath: string) {
  const fileName = extractFileName(filePath)
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension ?? ''
}

export function isSupportedAudioExtension(extension: string): extension is SelectedAudioFile['extension'] {
  return extension === 'mp3' || extension === 'ogg' || extension === 'wav'
}

export function createSelectedAudio(filePath: string): SelectedAudioFile | null {
  const extension = extractExtension(filePath)
  if (!isSupportedAudioExtension(extension)) {
    return null
  }

  return {
    path: filePath,
    fileName: extractFileName(filePath),
    extension,
  }
}

export function createDefaultFormState(): DashboardFormState {
  return {
    title: '',
    artist: '',
    creator: '',
    difficulty: 'Insane',
    aiPrompt: '',
    backgroundPath: '',
    cs: 4.0,
    ar: 9.0,
    od: 8.0,
    hp: 6.0,
  }
}

export function createDefaultTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '')
}

export function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function sanitizeProgressLine(line: string) {
  return line.replace(/^STATUS:\s*/i, '').trim()
}

export function summarizeAnalysis(result: FullAnalysisResponse): HistoryResultSummary {
  return {
    tempoBpm: result.tempo_bpm,
    durationMs: result.duration_ms,
    beatCount: result.beat_times_ms.length,
    onsetCount: result.onset_times_ms.length,
  }
}

export function buildHistoryEntry(
  audio: SelectedAudioFile,
  metadata: DashboardFormState,
  result: FullAnalysisResponse,
): DashboardHistoryEntry {
  return {
    id: `job-${Date.now()}`,
    timestamp: new Date().toISOString(),
    audioPath: audio.path,
    audioFileName: audio.fileName,
    audioExtension: audio.extension,
    metadata: {
      title: metadata.title,
      artist: metadata.artist,
      creator: metadata.creator,
      difficulty: metadata.difficulty,
      aiPrompt: metadata.aiPrompt,
      backgroundPath: metadata.backgroundPath,
      cs: metadata.cs,
      ar: metadata.ar,
      od: metadata.od,
      hp: metadata.hp,
    },
    result: summarizeAnalysis(result),
  }
}
