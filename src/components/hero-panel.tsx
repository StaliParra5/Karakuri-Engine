import { Activity, Cable, Disc3 } from 'lucide-react'
import type { BridgeStatus } from '../types/dashboard'

interface HeroPanelProps {
  backendUrl: string | null
  bridgeStatus: BridgeStatus
}

export function HeroPanel({ backendUrl, bridgeStatus }: HeroPanelProps) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/12 bg-white/7 p-8 shadow-[0_24px_120px_rgba(8,14,30,0.55)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(110,231,255,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(70,85,255,0.14),transparent_30%)]" />

      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/8 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-cyan-100">
            <Cable className="h-3.5 w-3.5" />
            Fase 3 · Frontend Premium
          </div>

          <h1 className="font-['Palatino_Linotype','Book_Antiqua',serif] text-5xl leading-none tracking-tight text-white sm:text-6xl">
            Karakuri Engine
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Dashboard operativo para ingestión de audio, configuración base,
            telemetría del sidecar y resultados rítmicos del motor local.
          </p>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: Disc3,
                title: 'Audio-first intake',
                body: 'Importación validada para .mp3, .ogg y .wav en loopback local.',
              },
              {
                icon: Activity,
                title: 'Telemetry orbit',
                body: 'Progreso en tiempo real desde stdout con render concurrente.',
              },
              {
                icon: Cable,
                title: 'Reusable memory',
                body: 'Historial JSON local para relanzar variantes sin repetir captura.',
              },
            ].map(({ body, icon: Icon, title }) => (
              <article
                key={title}
                className="rounded-3xl border border-white/10 bg-slate-950/40 p-4"
              >
                <Icon className="mb-3 h-5 w-5 text-cyan-200" />
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="grid min-w-[280px] gap-4 rounded-[30px] border border-white/10 bg-slate-950/55 p-5">
          <div>
            <span className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
              Bridge status
            </span>
            <p className="mt-3 text-2xl font-medium text-white">
              {bridgeStatus === 'online'
                ? 'Bridge online'
                : bridgeStatus === 'connecting'
                  ? 'Bridge connecting'
                  : 'Bridge offline'}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {backendUrl ?? 'Awaiting backend URL from Tauri'}
            </p>
          </div>

          <div className="rounded-3xl border border-cyan-200/12 bg-cyan-200/7 p-4 text-sm text-cyan-100">
            Tauri decide el puerto, lanza el backend y reenvía stdout como
            <code className="ml-1 rounded bg-black/20 px-1.5 py-0.5">ai_progress_status</code>.
          </div>
        </aside>
      </div>
    </section>
  )
}
