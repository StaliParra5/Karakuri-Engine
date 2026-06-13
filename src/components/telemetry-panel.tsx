import { Check, Play } from 'lucide-react'

interface TelemetryPanelProps {
  backendUrl: string | null
  isAnalyzing: boolean
  progressLines: string[]
}

export function TelemetryPanel({ backendUrl, isAnalyzing, progressLines }: TelemetryPanelProps) {
  const latestLog = progressLines[progressLines.length - 1] || ''
  
  let activePhase = 0 // 0 = idle, 1 = rhythm, 2 = spatial, 3 = geometry, 4 = complete
  
  if (isAnalyzing) {
    activePhase = 1
    if (
      latestLog.includes('onnx') ||
      latestLog.includes('ONNX') ||
      latestLog.includes('inferencia') ||
      latestLog.includes('Fase 2') ||
      latestLog.includes('detecting') ||
      latestLog.includes('tracking')
    ) {
      activePhase = 2
    }
    if (
      latestLog.includes('pulido') ||
      latestLog.includes('Fase 3') ||
      latestLog.includes('Ensamblando') ||
      latestLog.includes('empaquetando')
    ) {
      activePhase = 3
    }
  } else if (
    latestLog.includes('exitoso') ||
    latestLog.includes('completado') ||
    latestLog.includes('captured') ||
    latestLog.includes('complete')
  ) {
    activePhase = 4
  }

  const phases = [
    {
      id: 1,
      name: 'Phase 1: Rhythm Analysis (DSP)',
      desc: 'Librosa spectral density & peak picking',
    },
    {
      id: 2,
      name: 'Phase 2: ONNX Inference',
      desc: 'Deep neural network spatial generation',
    },
    {
      id: 3,
      name: 'Phase 3: Geometry Polish',
      desc: 'Catmull-Rom splines & .osz compilation',
    },
  ]

  return (
    <section className="glass-panel rounded-xl p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#00f2ff] text-2xl">timeline</span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#b9cacb] font-label-mono">
              Engine Status
            </p>
            <h2 className="text-lg font-bold text-white font-display-lg">Runtime Pipeline</h2>
          </div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold border ${
            isAnalyzing
              ? 'border-amber-500/25 bg-amber-500/10 text-amber-300 animate-pulse'
              : activePhase === 4
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/5 text-slate-400'
          }`}
        >
          {isAnalyzing ? 'Processing' : activePhase === 4 ? 'Success' : 'Idle'}
        </div>
      </div>

      <div className="flex flex-col gap-5 relative pl-2">
        {/* Vertical Line */}
        <div className="absolute left-6 top-4 bottom-4 w-px bg-white/10"></div>
        
        {phases.map((phase) => {
          const isDone = activePhase > phase.id || activePhase === 4
          const isActive = activePhase === phase.id

          return (
            <div key={phase.id} className="flex items-start gap-4 relative z-10">
              <div className="flex items-center justify-center">
                {isDone ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                ) : isActive ? (
                  <div className="w-8 h-8 rounded-full bg-[#00f2ff]/20 border border-[#00f2ff] flex items-center justify-center shadow-[0_0_10px_rgba(0,242,255,0.4)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00f2ff] animate-ping"></span>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#0d1320] border border-white/10 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-white/20"></span>
                  </div>
                )}
              </div>
              <div className="flex flex-col pt-0.5">
                <span
                  className={`text-sm font-semibold transition-colors duration-300 ${
                    isActive ? 'text-[#00f2ff] neon-text-cyan' : isDone ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {phase.name}
                </span>
                <span className="text-xs text-[#b9cacb] mt-0.5">{phase.desc}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stdout Console */}
      <div className="space-y-1.5">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#b9cacb] block font-label-mono">Stdout stream</span>
        <div className="max-h-[120px] overflow-y-auto rounded-xl border border-white/5 bg-black/40 p-3 space-y-1 text-slate-400 font-label-mono text-xs custom-scrollbar">
          {progressLines.length === 0 ? (
            <div className="text-slate-600 italic">No output logged yet...</div>
          ) : (
            progressLines.map((line, index) => (
              <div key={`${line}-${index}`} className="truncate animate-fade-in flex items-start gap-1">
                <span className="text-[#00f2ff]/70 select-none">&gt;</span>
                <span className="break-all">{line}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Endpoint URL loopback */}
      <div className="rounded-xl border border-[#00f2ff]/10 bg-[#00f2ff]/5 p-3 text-xs text-[#00f2ff]/95">
        <div className="flex items-center gap-2 font-semibold font-display-lg uppercase tracking-wider text-[10px]">
          <Play className="h-3 w-3 text-[#00f2ff]" />
          Endpoint Loopback
        </div>
        <p className="mt-1 font-label-mono text-xs text-[#00f2ff]/80 truncate">
          {backendUrl ?? 'No loopback URL resolved yet.'}
        </p>
      </div>
    </section>
  )
}
