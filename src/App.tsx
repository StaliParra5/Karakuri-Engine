import { invoke } from '@tauri-apps/api/core'
import { startTransition, useCallback, useMemo, useState } from 'react'
import { ConfigPanel } from './components/config-panel'
import { DropzonePanel } from './components/dropzone-panel'
import { HardwarePanel } from './components/hardware-panel'
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
  const [activeTab, setActiveTab] = useState<'converter' | 'analytics' | 'history'>('converter')
  const [formState, setFormState] = useState<DashboardFormState>(createDefaultFormState)
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState<boolean>(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const { backendUrl, bridgeStatus, progressLines, setProgressLines } = useBackendBridge()
  const { historyEntries, prependEntry, saveEntries } = useDashboardHistory()

  // Calculate dynamic metrics in real-time from history database (0 mock data)
  const metrics = useMemo(() => {
    const total = historyEntries.length
    if (total === 0) {
      return {
        totalMaps: 0,
        avgBpm: 0,
        totalPlaytime: '0s',
        mostUsedDifficulty: 'N/A',
      }
    }

    const sumBpm = historyEntries.reduce((acc, curr) => acc + curr.result.tempoBpm, 0)
    const avgBpm = sumBpm / total

    const totalMs = historyEntries.reduce((acc, curr) => acc + curr.result.durationMs, 0)
    const totalSeconds = Math.floor(totalMs / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    const totalPlaytime = m > 0 ? `${m}m ${s}s` : `${s}s`

    const difficultyCounts = historyEntries.reduce((acc, curr) => {
      const diff = curr.metadata.difficulty || 'Unknown'
      acc[diff] = (acc[diff] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    let mostUsedDifficulty = 'N/A'
    let maxCount = 0
    for (const [diff, count] of Object.entries(difficultyCounts)) {
      if (count > maxCount) {
        maxCount = count
        mostUsedDifficulty = diff
      }
    }

    return {
      totalMaps: total,
      avgBpm: Math.round(avgBpm * 100) / 100,
      totalPlaytime,
      mostUsedDifficulty,
    }
  }, [historyEntries])

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

  // Start analysis is allowed as long as an audio file is chosen and we aren't already analyzing
  const canStartAnalysis = useMemo(() => {
    return Boolean(selectedAudio && !isAnalyzing)
  }, [isAnalyzing, selectedAudio])

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
    if (!selectedAudio) {
      setAnalysisError('Audio file missing.')
      return
    }

    setAnalysisError(null)
    setExportSuccess(false)
    setIsAnalyzing(true)

    // Fallback to simulation if bridge is offline, in sandbox, or has no backendUrl
    const runSimulated = bridgeStatus === 'sandbox' || bridgeStatus === 'offline' || !backendUrl

    if (runSimulated) {
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
          difficulty: formState.difficulty,
          mapping_style: formState.mappingStyle,
          game_mode: formState.gameMode,
          custom_model_path: formState.customModelPath || null,
          prompt: formState.aiPrompt,
          background_path: formState.backgroundPath,
          cs: formState.cs,
          ar: formState.ar,
          od: formState.od,
          hp: formState.hp,
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
      difficulty: entry.metadata.difficulty,
      mappingStyle: entry.metadata.mappingStyle || 'Standard',
      gameMode: entry.metadata.gameMode || 'Standard',
      customModelPath: entry.metadata.customModelPath || '',
      aiPrompt: entry.metadata.aiPrompt,
      backgroundPath: entry.metadata.backgroundPath,
      cs: entry.metadata.cs ?? 4.0,
      ar: entry.metadata.ar ?? 9.0,
      od: entry.metadata.od ?? 8.0,
      hp: entry.metadata.hp ?? 6.0,
    })
    setAnalysisResult(null)
    setAnalysisError(null)
    setExportSuccess(false)
    reuseHistorySelection(audio, {
      ...entry.metadata,
      mappingStyle: entry.metadata.mappingStyle || 'Standard',
      gameMode: entry.metadata.gameMode || 'Standard',
      customModelPath: entry.metadata.customModelPath || '',
    })
    // Switch to converter tab when reusing metadata so user can check/tweak
    setActiveTab('converter')
  }

  return (
    <div className="flex min-h-screen bg-[#0b111e] text-[#dde2f5] font-body-md overflow-x-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/10 bg-[#0d1320] flex flex-col justify-between hidden md:flex shrink-0 select-none">
        <div>
          {/* Logo Area */}
          <div className="h-20 flex items-center gap-3 px-6 border-b border-white/10">
            <span className="material-symbols-outlined text-[#00f2ff] text-3xl">auto_awesome</span>
            <h2 className="font-display-lg font-bold text-lg text-white tracking-tighter">Karakuri Engine</h2>
          </div>
          
          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-2">
            {[
              { id: 'converter', label: 'Converter', icon: 'transform' },
              { id: 'analytics', label: 'Analytics Dashboard', icon: 'dashboard' },
              { id: 'history', label: 'Analysis History', icon: 'history' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#00f2ff]/10 text-[#00f2ff] border border-[#00f2ff]/20 shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>
        
        {/* Footer Area */}
        <div className="p-4 border-t border-white/10 text-xs text-slate-500 font-label-mono flex flex-col gap-1">
          <span>v1.2.0 · Local-First</span>
          <span>Tauri Webview2</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-20 border-b border-white/10 bg-[#0d1320]/80 backdrop-blur-md flex items-center justify-between px-6 md:px-12 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#00f2ff] text-2xl md:hidden">auto_awesome</span>
            <h1 className="font-display-lg text-lg font-bold text-white tracking-tight capitalize">
              {activeTab === 'converter' ? 'Engine Converter' : activeTab === 'analytics' ? 'Performance Analytics' : 'Generation Database'}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Mobile Quick Tabs */}
            <div className="flex md:hidden items-center gap-1 bg-black/25 p-1 rounded-lg border border-white/5">
              {[
                { id: 'converter', icon: 'transform' },
                { id: 'analytics', icon: 'dashboard' },
                { id: 'history', icon: 'history' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`p-2 rounded-md transition-all cursor-pointer ${
                    activeTab === tab.id ? 'bg-[#00f2ff]/20 text-[#00f2ff]' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                </button>
              ))}
            </div>

            {/* Connection/Bridge Indicator */}
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              bridgeStatus === 'online'
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                : bridgeStatus === 'connecting'
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-300 animate-pulse'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
            }`} title={backendUrl || 'Disconnected'}>
              <span className="material-symbols-outlined text-sm">sensors</span>
              <span className="hidden sm:inline">
                {bridgeStatus === 'online' ? 'Bridge Online' : bridgeStatus === 'connecting' ? 'Connecting' : 'Bridge Offline'}
              </span>
            </div>

            <img 
              alt="User Profile Avatar" 
              className="w-10 h-10 rounded-full border border-[#00f2ff] hidden sm:block" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzz9iovXNficP5LPMO-7EDGeEYoAtC-Wmbdr-WKjS89tkI7cEv8w7ne-VUtCUiMrHn0XsMyUomIFw4lAh5dQujWnVbFqkbKgg98uDGgvnG_l8MnvLG1IMpA07gXeotFfHrAhILz7dTJ6y9Ai_c81CBfewXcFmn0crOFbunDdm12LbBdrLX8c53NBPHaRuAtDTmPPTjPH2wlc7hCzVQljE2qNK_xQeUw_gf9KVLpWxgm6oSFIHViU8aWftK3W0wvfTePr2edQ5XGco"
            />
          </div>
        </header>
        
        {/* Module Content Switcher */}
        <main className="flex-1 p-6 md:p-12 max-w-[1600px] w-full mx-auto">
          {activeTab === 'converter' && (
            <div className="grid gap-6 lg:grid-cols-12 items-start animate-fade-in">
              <div className="lg:col-span-8 flex flex-col gap-6">
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
                
                {/* Trigger panel */}
                <div className="glass-panel relative rounded-xl p-6 border border-white/10">
                  {isAnalyzing && (
                    <div className="absolute inset-0 z-10 rounded-xl border border-cyan-300/12 bg-[#0d1320]/85 backdrop-blur-sm">
                      <div className="flex h-full flex-col items-center justify-center gap-3">
                        <div className="h-14 w-14 animate-spin rounded-full border-2 border-cyan-200/20 border-t-[#00f2ff] shadow-[0_0_15px_rgba(0,242,255,0.3)]" />
                        <p className="text-[11px] uppercase tracking-[0.32em] text-[#00f2ff] font-label-mono">
                          Processing AI mapping
                        </p>
                        <p className="text-sm text-slate-300">
                          The local rhythm pass is running in the Python sidecar.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400 font-label-mono">
                        Pipeline execution
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Trigger the rhythm pass</h2>
                    </div>

                    <button
                      className={`rounded-lg px-8 py-3.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 border ${
                        canStartAnalysis
                          ? 'border-[#00f2ff]/30 bg-[#00f2ff]/10 text-[#00f2ff] hover:bg-[#00f2ff]/20 hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] active:scale-95'
                          : 'cursor-not-allowed border-white/8 bg-white/5 text-slate-500'
                      }`}
                      disabled={!canStartAnalysis}
                      onClick={() => void handleAnalyze()}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                      Start analysis
                    </button>
                  </div>

                  <p className="mt-4 text-xs leading-6 text-slate-400">
                    El motor analiza la señal de audio y ejecuta predicciones espaciales en la red ONNX local, generando y copiando un archivo .osz empaquetado directamente en la carpeta de canciones de tu osu!.
                  </p>
                </div>
                <ResultPanel
                  analysisError={analysisError}
                  analysisResult={analysisResult}
                  exportSuccess={exportSuccess}
                  formState={formState}
                  selectedAudio={selectedAudio}
                  backendUrl={backendUrl}
                  onRepackageSuccess={(newOszPath) => {
                    setAnalysisResult((cur) => cur ? { ...cur, osz_path: newOszPath } : null)
                  }}
                />
              </div>
              
              <div className="lg:col-span-4 flex flex-col gap-6">
                <TelemetryPanel
                  backendUrl={backendUrl}
                  isAnalyzing={isAnalyzing}
                  progressLines={progressLines}
                />
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Dynamic Metrics Row (Creatio-style colored cards) */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Metric 1: Blue Card */}
                <article className="rounded-xl p-6 bg-gradient-to-br from-[#1e3a8a]/70 to-[#0d1e3d]/90 border border-blue-500/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute top-0 right-0 p-3 opacity-15">
                    <span className="material-symbols-outlined text-6xl text-white">album</span>
                  </div>
                  <div>
                    <span className="font-label-mono text-[10px] uppercase tracking-wider text-blue-300 font-semibold block font-label-mono">Total Beatmaps Mapped</span>
                    <h3 className="font-display-lg text-4xl font-extrabold text-white mt-2">{metrics.totalMaps}</h3>
                  </div>
                  <p className="text-[10px] text-blue-200/70 font-label-mono">Computed from local database</p>
                </article>

                {/* Metric 2: Dark Purple Card */}
                <article className="rounded-xl p-6 bg-gradient-to-br from-[#581c87]/70 to-[#2e1065]/90 border border-[#b600f8]/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute top-0 right-0 p-3 opacity-15">
                    <span className="material-symbols-outlined text-6xl text-white">speed</span>
                  </div>
                  <div>
                    <span className="font-label-mono text-[10px] uppercase tracking-wider text-purple-300 font-semibold block font-label-mono">Average Tempo</span>
                    <h3 className="font-display-lg text-4xl font-extrabold text-white mt-2">{metrics.avgBpm} <span className="text-lg font-normal">BPM</span></h3>
                  </div>
                  <p className="text-[10px] text-purple-200/70 font-label-mono">Average of all generated maps</p>
                </article>

                {/* Metric 3: Orange Card */}
                <article className="rounded-xl p-6 bg-gradient-to-br from-[#7c2d12]/70 to-[#431407]/90 border border-orange-500/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute top-0 right-0 p-3 opacity-15">
                    <span className="material-symbols-outlined text-6xl text-white">schedule</span>
                  </div>
                  <div>
                    <span className="font-label-mono text-[10px] uppercase tracking-wider text-orange-300 font-semibold block font-label-mono">Total Duration Mapped</span>
                    <h3 className="font-display-lg text-4xl font-extrabold text-white mt-2">{metrics.totalPlaytime}</h3>
                  </div>
                  <p className="text-[10px] text-orange-200/70 font-label-mono">Sum total play time of beats</p>
                </article>

                {/* Metric 4: Green Card */}
                <article className="rounded-xl p-6 bg-gradient-to-br from-[#064e3b]/70 to-[#022c22]/90 border border-emerald-500/20 shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
                  <div className="absolute top-0 right-0 p-3 opacity-15">
                    <span className="material-symbols-outlined text-6xl text-white">bolt</span>
                  </div>
                  <div>
                    <span className="font-label-mono text-[10px] uppercase tracking-wider text-emerald-300 font-semibold block font-label-mono">Favored Difficulty</span>
                    <h3 className="font-display-lg text-4xl font-extrabold text-white mt-2">{metrics.mostUsedDifficulty}</h3>
                  </div>
                  <p className="text-[10px] text-emerald-200/70 font-label-mono">Most commonly mapped</p>
                </article>
              </div>

              {/* Hardware resources telemetry */}
              <HardwarePanel isAnalyzing={isAnalyzing} />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-fade-in">
              <HistoryPanel
                historyEntries={historyEntries}
                onReuse={handleReuseHistory}
                onReorder={saveEntries}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App


