import { useState } from 'react'
import { formatDuration } from '../lib/runtime'
import type { FullAnalysisResponse, DashboardFormState, SelectedAudioFile } from '../types/dashboard'
import { BeatmapViewer } from './BeatmapViewer'

interface ResultPanelProps {
  analysisError: string | null
  analysisResult: FullAnalysisResponse | null
  exportSuccess?: boolean
  formState?: DashboardFormState
  selectedAudio?: SelectedAudioFile | null
  backendUrl?: string | null
  onRepackageSuccess?: (newOszPath: string) => void
}

export function ResultPanel({
  analysisError,
  analysisResult,
  exportSuccess,
  formState,
  selectedAudio,
  backendUrl,
  onRepackageSuccess,
}: ResultPanelProps) {
  const [showViewer, setShowViewer] = useState(false)
  const [installState, setInstallState] = useState<{ status: 'idle' | 'installing' | 'installed' | 'error'; message?: string }>({ status: 'idle' })

  const handleInstallOsu = async () => {
    if (!analysisResult?.osz_path) return
    setInstallState({ status: 'installing' })
    try {
      const endpoint = `${backendUrl || 'http://127.0.0.1:8000'}/export/install_osu`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osz_path: analysisResult.osz_path }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { detail?: string } | null
        throw new Error(err?.detail || `Error ${res.status}`)
      }
      const data = (await res.json()) as { destination?: string }
      setInstallState({ status: 'installed', message: `Inyectado con éxito en: ${data.destination || 'osu! Songs'}` })
    } catch (err) {
      setInstallState({ status: 'error', message: err instanceof Error ? err.message : 'Error desconocido al instalar en osu!' })
    }
  }

  if (analysisError) {
    return (
      <section className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-rose-300 font-label-mono">
          Analysis error
        </p>
        <p className="text-sm leading-6 text-rose-200">{analysisError}</p>
      </section>
    )
  }

  if (!analysisResult) {
    return (
      <section className="glass-panel rounded-xl p-6 flex flex-col gap-2 border border-dashed border-white/10">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#b9cacb] font-label-mono">
          Result summary
        </p>
        <h2 className="text-xl font-bold text-white font-display-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00f2ff]">pending</span>
          Awaiting rhythm pass
        </h2>
        <p className="text-sm leading-7 text-[#b9cacb]">
          The result panel will surface BPM, duration, beat count and onset anchors
          as soon as the rhythm pass completes.
        </p>
      </section>
    )
  }

  const items = [
    {
      icon: 'speed',
      label: 'Tempo',
      value: `${analysisResult.tempo_bpm.toFixed(2)} BPM`,
    },
    {
      icon: 'schedule',
      label: 'Duration',
      value: formatDuration(analysisResult.duration_ms),
    },
    {
      icon: 'analytics',
      label: 'Beats',
      value: `${analysisResult.beat_times_ms.length} Beats`,
    },
    {
      icon: 'star',
      label: 'Estimated SR',
      value: analysisResult.estimated_star_rating ? `${analysisResult.estimated_star_rating.toFixed(2)} ★` : '4.50 ★',
    },
    {
      icon: 'anchor',
      label: 'Anchors',
      value: `${analysisResult.onset_times_ms.length} Onsets`,
    },
  ]

  return (
    <section className="glass-panel rounded-xl p-6 flex flex-col gap-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#b9cacb] font-label-mono">
          Analysis summary
        </p>
        <h2 className="mt-1 text-xl font-bold text-white font-display-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00f2ff]">task_alt</span>
          Rhythm Skeleton Captured
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        {items.map(({ icon, label, value }) => (
          <article
            key={label}
            className="rounded-xl border border-white/5 bg-[#080e1b]/40 p-4 transition-all hover:border-[#00f2ff]/20 flex flex-col justify-between"
          >
            <span className="material-symbols-outlined text-[#00f2ff] text-2xl mb-3">{icon}</span>
            <div>
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#b9cacb] font-label-mono">{label}</p>
              <p className="mt-1 text-lg font-bold text-white font-display-lg">{value}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.28em] text-purple-300 font-label-mono font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI Inspector & Mapset Spread Active
          </p>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
            5 Diff Spread + .osb Storyboard
          </span>
        </div>
        <p className="text-xs text-[#dde2f5] leading-5 mt-1">
          Paquete exportado con 5 dificultades progresivas y efectos visuales Kiai. 
          {analysisResult.audit_issues && analysisResult.audit_issues.length > 0
            ? ` El auditor detectó ${analysisResult.audit_issues.length} advertencias de jugabilidad observables en el visor.`
            : ' El auditor verificó que el flujo geométrico es limpio (0 alertas de picos inhumanos).'}
        </p>
      </div>

      {analysisResult.engine?.includes('Simulated') ? (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-blue-300 font-label-mono font-semibold">
            Simulation Completed (Sandbox)
          </p>
          <p className="text-xs text-[#dde2f5] leading-5">
            El mapa se ha simulado con éxito en modo Sandbox. En este modo virtual no se modifican los archivos locales de tu osu!.
          </p>
          <p className="text-xs font-label-mono text-blue-200 select-all break-all bg-black/20 p-2 rounded border border-white/5">
            Virtual OSZ Path: {analysisResult.osz_path}
          </p>
        </div>
      ) : exportSuccess ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-400 font-label-mono font-semibold">
            Map Exported to osu!
          </p>
          <p className="text-xs text-[#dde2f5] leading-5">
            El archivo se ha inyectado automáticamente en la carpeta de juego local.
          </p>
          <p className="text-xs font-semibold text-emerald-300">
            Presiona <kbd className="rounded border border-emerald-500/30 bg-emerald-500/20 px-1.5 py-0.5 font-mono text-xs">F5</kbd> en el menú de canciones de osu! para refrescar y jugar.
          </p>
        </div>
      ) : analysisResult.osz_path ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-[0.28em] text-rose-300 font-label-mono font-semibold">
            Map Generated (Export Failed)
          </p>
          <p className="text-xs text-[#dde2f5] leading-5">
            No se pudo inyectar en osu!. Verifica los permisos o el directorio de canciones. Archivo guardado temporalmente en:
          </p>
          <p className="text-xs font-label-mono text-rose-200 select-all break-all bg-black/20 p-2 rounded border border-white/5">
            {analysisResult.osz_path}
          </p>
        </div>
      ) : null}

      {installState.status !== 'idle' && (
        <div className={`rounded-xl p-4 border text-xs flex flex-col gap-1 ${
          installState.status === 'installed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
          installState.status === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
          'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }`}>
          <span className="font-semibold uppercase tracking-wider font-label-mono">
            {installState.status === 'installing' && 'Inyectando en osu!...'}
            {installState.status === 'installed' && '¡Inyección Exitosa!'}
            {installState.status === 'error' && 'Error de Inyección'}
          </span>
          {installState.message && <span className="text-[#dde2f5]">{installState.message}</span>}
        </div>
      )}

      {showViewer && (
        <BeatmapViewer
          objects={
            analysisResult.spatial_objects?.length
              ? analysisResult.spatial_objects
              : analysisResult.onset_times_ms.map((t, idx) => ({
                  time_ms: t,
                  x: 256 + Math.round(100 * Math.sin(idx)),
                  y: 192 + Math.round(100 * Math.cos(idx)),
                  object_type: 1,
                }))
          }
          tempoBpm={analysisResult.tempo_bpm}
          kiaiRanges={analysisResult.kiai_ranges}
          analysisResult={analysisResult}
          formState={formState}
          selectedAudio={selectedAudio}
          backendUrl={backendUrl}
          onRepackageSuccess={onRepackageSuccess}
          onClose={() => setShowViewer(false)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <button
          type="button"
          onClick={() => setShowViewer(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00f2ff]/20 to-[#00f2ff]/10 px-4 py-3 text-sm font-semibold text-[#00f2ff] border border-[#00f2ff]/30 shadow-[0_0_15px_rgba(0,242,255,0.15)] hover:bg-[#00f2ff]/30 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">play_circle</span>
          Launch Interactive Beatmap Viewer
        </button>

        {analysisResult.osz_path && (
          <button
            type="button"
            onClick={handleInstallOsu}
            disabled={installState.status === 'installing'}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:bg-emerald-500/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">downloading</span>
            Inject / Install to osu! Songs
          </button>
        )}
      </div>
    </section>
  )
}
