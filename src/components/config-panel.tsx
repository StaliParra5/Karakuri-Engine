import { Image, SlidersHorizontal } from 'lucide-react'
import type { DashboardFormState } from '../types/dashboard'

interface ConfigPanelProps {
  formState: DashboardFormState
  onBackgroundBrowse(): void
  onFormChange<K extends keyof DashboardFormState>(key: K, value: DashboardFormState[K]): void
}

export function ConfigPanel({ formState, onBackgroundBrowse, onFormChange }: ConfigPanelProps) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">
            Metadata pipeline
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Session parameters</h2>
        </div>
        <SlidersHorizontal className="h-5 w-5 text-cyan-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-300">
          <span className="font-medium text-white">Title</span>
          <input
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
            value={formState.title}
            onChange={(event) => onFormChange('title', event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          <span className="font-medium text-white">Artist</span>
          <input
            aria-label="Artist"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
            value={formState.artist}
            onChange={(event) => onFormChange('artist', event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          <span className="font-medium text-white">Creator</span>
          <input
            aria-label="Creator"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/40"
            value={formState.creator}
            onChange={(event) => onFormChange('creator', event.target.value)}
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          <span className="font-medium text-white">Intensity</span>
          <input
            type="range"
            min="0"
            max="100"
            value={formState.intensity}
            onChange={(event) => onFormChange('intensity', Number(event.target.value))}
          />
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
            <span>restrained</span>
            <span>{formState.intensity}</span>
            <span>aggressive</span>
          </div>
        </label>
      </div>

      <div className="mt-5 rounded-[28px] border border-white/10 bg-black/20 p-5">
        <div className="flex items-center gap-3 text-white">
          <Image className="h-4 w-4 text-cyan-200" />
          <span className="font-medium">Background asset (optional)</span>
        </div>
        <button
          onClick={onBackgroundBrowse}
          className="mt-4 inline-flex cursor-pointer items-center gap-3 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/20 active:scale-95"
          type="button"
        >
          Select Image
        </button>
        <p className="mt-3 text-sm text-slate-400">
          {formState.backgroundPath || 'No background selected yet.'}
        </p>
      </div>
    </section>
  )
}
