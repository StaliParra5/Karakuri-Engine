import { formatDuration } from '../lib/runtime'
import type { FullAnalysisResponse } from '../types/dashboard'

interface ResultPanelProps {
  analysisError: string | null
  analysisResult: FullAnalysisResponse | null
  exportSuccess?: boolean
}

export function ResultPanel({ analysisError, analysisResult, exportSuccess }: ResultPanelProps) {
  if (analysisError) {
    return (
      <section className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-6 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-rose-300 font-label-mono">
          Analysis error
        </p>
        <h2 className="text-xl font-bold text-white font-display-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400">error</span>
          Execution Interrupted
        </h2>
        <p className="text-sm leading-7 text-[#dde2f5]">{analysisError}</p>
      </section>
    )
  }

  if (!analysisResult) {
    return (
      <section className="glass-panel rounded-xl p-6 flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#b9cacb] font-label-mono">
          Analysis summary
        </p>
        <h2 className="text-xl font-bold text-white font-display-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00f2ff]">pending</span>
          Awaiting First Run
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

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
    </section>
  )
}
