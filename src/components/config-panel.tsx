import type { DashboardFormState } from '../types/dashboard'

interface ConfigPanelProps {
  formState: DashboardFormState
  onBackgroundBrowse(): void
  onFormChange<K extends keyof DashboardFormState>(key: K, value: DashboardFormState[K]): void
}

export function ConfigPanel({ formState, onBackgroundBrowse, onFormChange }: ConfigPanelProps) {
  // Determine intensity label
  let intensityLabel = 'TECHNICAL'
  if (formState.intensity < 35) {
    intensityLabel = 'CHILL'
  } else if (formState.intensity > 75) {
    intensityLabel = 'EXPERT'
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Song Configuration */}
      <section className="glass-panel rounded-xl p-6 flex flex-col gap-6">
        <h3 className="font-display-lg text-lg font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00f2ff]">tune</span>
          Track Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-label-mono text-xs text-[#00dbe7] uppercase tracking-wider">Song Title</label>
            <input
              className="bg-[#080e1b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-colors font-body-md"
              placeholder="e.g. Brain Power"
              type="text"
              value={formState.title}
              onChange={(event) => onFormChange('title', event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-mono text-xs text-[#00dbe7] uppercase tracking-wider">Artist</label>
            <input
              className="bg-[#080e1b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-colors font-body-md"
              placeholder="e.g. NOMA"
              type="text"
              value={formState.artist}
              onChange={(event) => onFormChange('artist', event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="font-label-mono text-xs text-[#00dbe7] uppercase tracking-wider">Beatmap Creator</label>
            <input
              className="bg-[#080e1b] border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-colors font-body-md"
              placeholder="Your username"
              type="text"
              value={formState.creator}
              onChange={(event) => onFormChange('creator', event.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Intensity Slider */}
      <section className="glass-panel rounded-xl p-6 flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <h3 className="font-display-lg text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00f2ff]">speed</span>
            Mapping Intensity
          </h3>
          <span className="font-label-mono text-xs text-[#ebb2ff] bg-[#b600f8]/20 px-3 py-1 rounded border border-[#ebb2ff]/30">
            {intensityLabel}
          </span>
        </div>
        <div className="pt-4 pb-2">
          <input
            className="w-full"
            max="100"
            min="0"
            type="range"
            value={formState.intensity}
            onChange={(event) => onFormChange('intensity', Number(event.target.value))}
          />
        </div>
        <div className="flex justify-between font-label-mono text-xs text-[#b9cacb]">
          <span>Chill</span>
          <span>Technical ({formState.intensity})</span>
          <span>Brain Power</span>
        </div>
      </section>

      {/* Background Image Selection */}
      <section className="glass-panel rounded-xl p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3 text-white">
          <span className="material-symbols-outlined text-[#00f2ff]">image</span>
          <span className="font-semibold text-sm">Background asset (optional)</span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={onBackgroundBrowse}
            className="bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/20 hover:border-[#00f2ff]/50 px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">folder_open</span>
            Select Image
          </button>
          <span className="text-xs text-[#b9cacb] font-label-mono truncate max-w-sm">
            {formState.backgroundPath || 'No background selected yet.'}
          </span>
        </div>
      </section>
    </div>
  )
}
