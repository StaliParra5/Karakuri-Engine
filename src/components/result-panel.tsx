import { GaugeCircle, TimerReset } from 'lucide-react'
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
      <section className="rounded-[30px] border border-rose-300/15 bg-rose-500/10 p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-rose-100/70">
          Analysis error
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Execution interrupted</h2>
        <p className="mt-3 text-sm leading-7 text-rose-100">{analysisError}</p>
      </section>
    )
  }

  if (!analysisResult) {
    return (
      <section className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
          Analysis summary
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Awaiting first run</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          The result panel will surface BPM, duration, beat count and onset anchors
          as soon as the rhythm pass completes.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
      <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
        Analysis summary
      </p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Rhythm skeleton captured</h2>

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        {[
          {
            icon: GaugeCircle,
            label: 'Tempo',
            value: `${analysisResult.tempo_bpm.toFixed(2)} BPM`,
          },
          {
            icon: TimerReset,
            label: 'Duration',
            value: formatDuration(analysisResult.duration_ms),
          },
          {
            icon: GaugeCircle,
            label: 'Beats',
            value: `${analysisResult.beat_times_ms.length} beats detected`,
          },
          {
            icon: GaugeCircle,
            label: 'Anchors',
            value: `${analysisResult.onset_times_ms.length} anchors`,
          },
        ].map(({ icon: Icon, label, value }) => (
          <article
            key={label}
            className="rounded-3xl border border-white/10 bg-white/6 p-4"
          >
            <Icon className="mb-3 h-5 w-5 text-cyan-200" />
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{value}</p>
          </article>
        ))}
      </div>
      {exportSuccess ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200">
            Map Exported to osu!
          </p>
          <p className="mt-1 text-sm text-emerald-50">
            El archivo se ha inyectado automáticamente en la carpeta de juego local.
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-100">
            Presiona <kbd className="rounded border border-emerald-400/30 bg-emerald-400/20 px-1 py-0.5 font-mono text-xs text-emerald-300">F5</kbd> en el menú de canciones de osu! para refrescar y jugar.
          </p>
        </div>
      ) : analysisResult.osz_path ? (
        <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">
            Map Generated (Export Failed)
          </p>
          <p className="mt-1 text-sm text-amber-50">
            No se pudo inyectar en osu!. Archivo guardado temporalmente en: <span className="font-mono text-amber-300">{analysisResult.osz_path}</span>
          </p>
        </div>
      ) : null}
    </section>
  )
}
