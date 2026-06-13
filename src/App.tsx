import { invoke } from '@tauri-apps/api/core'
import { startTransition, useCallback, useMemo, useState } from 'react'
import { ConfigPanel } from './components/config-panel'
import { DropzonePanel } from './components/dropzone-panel'
import { HardwarePanel } from './components/hardware-panel'
import { HeroPanel } from './components/hero-panel'
import { HistoryPanel } from './components/history-panel'
import { ResultPanel } from './components/result-panel'
import { TelemetryPanel } from './components/telemetry-panel'
import { useAudioDrop } from './hooks/use-audio-drop'
import { useBackendBridge } from './hooks/use-backend-bridge'
import { useDashboardHistory } from './hooks/use-dashboard-history'
import { isTauriRuntime } from './lib/runtime'
import {
  buildHistoryEntry,
  createDefaultFormState,
  createDefaultTitle,
  createSelectedAudio,
} from './lib/runtime'
import type {
  DashboardFormState,
  DashboardHistoryEntry,
  FullAnalysisResponse,
  SelectedAudioFile,
} from './types/dashboard'

function App() {
  const [formState, setFormState] = useState<DashboardFormState>(createDefaultFormState)
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<boolean>(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { backendUrl, bridgeStatus, progressLines, setProgressLines } = useBackendBridge()
  const { historyEntries, prependEntry, saveEntries } = useDashboardHistory()

  const handleAudioSelected = useCallback((_audio: SelectedAudioFile, suggestedTitle: string) => {
    setAnalysisError(null)
    setAnalysisResult(null)
    setExportSuccess(false)
    setFormState((current) => ({
      ...current,
      title: current.title || suggestedTitle,
    }))
  }, [])

  const {
    selectedAudio,
    dropError,
    isDraggingAudio,
    reuseHistorySelection,
    selectFileManually,
  } = useAudioDrop({
    onAudioSelected: handleAudioSelected,
  })

  const canStartAnalysis = useMemo(() => {
    if (bridgeStatus === 'sandbox') {
      return Boolean(selectedAudio && !isAnalyzing)
    }
    return Boolean(selectedAudio && backendUrl && bridgeStatus === 'online' && !isAnalyzing)
  }, [backendUrl, bridgeStatus, isAnalyzing, selectedAudio])

  function updateForm<K extends keyof DashboardFormState>(
    key: K,
    value: DashboardFormState[K],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function handleBrowseBackground() {
    if (isTauriRuntime()) {
      void invoke<string | null>('select_background_image')
        .then((path) => {
          if (path) {
            updateForm('backgroundPath', path)
          }
        })
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.jpg,.jpeg,.png'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          updateForm('backgroundPath', file.name)
        }
      }
      input.click()
    }
  }

  async function handleAnalyze() {
    if (!selectedAudio || !backendUrl) {
      setAnalysisError('Bridge offline or audio file missing.')
      return
    }

    setAnalysisError(null)
    setExportSuccess(false)
    setIsAnalyzing(true)

    // SANDBOX SIMULATED MODE FOR WEB PREVIEWS
    if (bridgeStatus === 'sandbox') {
      const steps = [
        { delay: 100, log: 'STATUS: Ingestionando archivo de audio local...' },
        { delay: 1200, log: 'STATUS: Computando FFT y Flujo Espectral en Mel...' },
        { delay: 2800, log: 'STATUS: detectando onsets y picos con librosa.util.peak_pick...' },
        { delay: 4200, log: 'STATUS: tracking beats con Ellis Dynamic Programming...' },
        { delay: 5800, log: 'STATUS: Inicializando el backend de inferencia ONNX QInt8...' },
        { delay: 7000, log: 'STATUS: Corriendo inferencia espacial de coordenadas topológicas...' },
        { delay: 8400, log: 'STATUS: Aplicando pulido geométrico con Splines Catmull-Rom...' },
        { delay: 9500, log: 'STATUS: Ensamblando estructura de archivo .osu (v14)...' },
        { delay: 10000, log: 'STATUS: Generación exitosa. Pipeline completado.' },
      ]

      setProgressLines([])
      steps.forEach(({ delay, log }) => {
        setTimeout(() => {
          setProgressLines((prev) => [...prev, log].slice(-8))
        }, delay)
      })

      setTimeout(async () => {
        const mockResult: FullAnalysisResponse = {
          status: 'ok',
          engine: 'Karakuri Simulated v1.0',
          sample_rate: 22050,
          duration_ms: 212000,
          tempo_bpm: 128.0 + Math.random() * 32.0,
          beat_times_ms: Array.from({ length: 220 }, (_, i) => i * 460),
          onset_times_ms: Array.from({ length: 410 }, (_, i) => i * 240),
          frame_hop_length: 512,
          analysis_window_fft: 2048,
          osz_path: `/var/tmp/karakuri_sim_${Date.now()}.osz`,
        }
        setAnalysisResult(mockResult)
        const historyEntry = buildHistoryEntry(selectedAudio, formState, mockResult)
        await prependEntry(historyEntry)
        setIsAnalyzing(false)
      }, 10200)

      return
    }

    // TAURI / REAL BACKEND MODE
    try {
      const response = await fetch(`${backendUrl}/analyze/full`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_path: selectedAudio.path,
          title: formState.title,
          artist: formState.artist,
          creator: formState.creator,
          intensity: formState.intensity,
          background_path: formState.backgroundPath,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { detail?: string } | null
        throw new Error(payload?.detail ?? `Analysis failed with ${response.status}`)
      }

      const result = (await response.json()) as FullAnalysisResponse
      setAnalysisResult(result)

      if (result.osz_path) {
        try {
          await invoke('export_to_osu', { oszPath: result.osz_path })
          setExportSuccess(true)
        } catch (exportError) {
          console.warn('Failed to export OSZ to osu! folder:', exportError)
          setExportSuccess(false)
        }
      }

      const historyEntry = buildHistoryEntry(selectedAudio, formState, result)
      await prependEntry(historyEntry)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Unknown analysis failure')
    } finally {
      startTransition(() => {
        setIsAnalyzing(false)
      })
    }
  }

  function handleReuseHistory(entry: DashboardHistoryEntry) {
    const audio = createSelectedAudio(entry.audioPath)
    if (!audio) {
      setAnalysisError('Stored history item points to an unsupported audio file.')
      return
    }

    setFormState({
      title: entry.metadata.title || createDefaultTitle(entry.audioFileName),
      artist: entry.metadata.artist,
      creator: entry.metadata.creator,
      intensity: entry.metadata.intensity,
      backgroundPath: entry.metadata.backgroundPath,
    })
    setAnalysisResult(null)
    setAnalysisError(null)
    setExportSuccess(false)
    reuseHistorySelection(audio, entry.metadata)
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#112344_0%,#07111f_42%,#03060b_100%)] px-5 py-8 text-slate-100 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <HeroPanel backendUrl={backendUrl} bridgeStatus={bridgeStatus} />

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6 opacity-0 animate-fade-in delay-100">
            <DropzonePanel
              dropError={dropError}
              isDraggingAudio={isDraggingAudio}
              selectedAudio={selectedAudio}
              onBrowse={selectFileManually}
            />
            <ConfigPanel
              formState={formState}
              onBackgroundBrowse={handleBrowseBackground}
              onFormChange={updateForm}
            />

            <div className="relative rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
              {isAnalyzing ? (
                <div className="absolute inset-0 z-10 rounded-[30px] border border-cyan-300/12 bg-slate-950/78 backdrop-blur-sm">
                  <div className="flex h-full flex-col items-center justify-center gap-3">
                    <div className="h-14 w-14 animate-spin rounded-full border-2 border-cyan-200/20 border-t-cyan-200" />
                    <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-100">
                      Processing AI mapping
                    </p>
                    <p className="text-sm text-slate-300">
                      The local rhythm pass is running in the Python sidecar.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
                    Pipeline execution
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Trigger the rhythm pass</h2>
                </div>

                <button
                  className={`rounded-full px-5 py-3 text-sm font-medium transition cursor-pointer ${
                    canStartAnalysis
                      ? 'border border-cyan-200/25 bg-cyan-200/12 text-cyan-50 hover:border-cyan-200/40 hover:bg-cyan-200/16'
                      : 'cursor-not-allowed border border-white/8 bg-white/5 text-slate-500'
                  }`}
                  disabled={!canStartAnalysis}
                  onClick={() => void handleAnalyze()}
                  type="button"
                >
                  Start analysis
                </button>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                El motor analiza la señal de audio y ejecuta predicciones espaciales en la red ONNX local, generando y copiando un archivo .osz empaquetado directamente en la carpeta de canciones de tu osu!.
              </p>
            </div>

            <ResultPanel analysisError={analysisError} analysisResult={analysisResult} exportSuccess={exportSuccess} />
          </div>

          <div className="grid gap-6 opacity-0 animate-fade-in delay-200">
            <HardwarePanel isAnalyzing={isAnalyzing} />
            <TelemetryPanel
              backendUrl={backendUrl}
              isAnalyzing={isAnalyzing}
              progressLines={progressLines}
            />
            <HistoryPanel
              historyEntries={historyEntries}
              onReuse={handleReuseHistory}
              onReorder={saveEntries}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default App


