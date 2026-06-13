import { CheckCircle2, Circle, Loader2, Play, Server } from 'lucide-react'

interface TelemetryPanelProps {
  backendUrl: string | null
  isAnalyzing: boolean
  progressLines: string[]
}

export function TelemetryPanel({ backendUrl, isAnalyzing, progressLines }: TelemetryPanelProps) {
  const latestLog = progressLines[progressLines.length - 1] || ''
  
  let activePhase = 0 // 0 = idle, 1 = rhythm, 2 = spatial, 3 = polish/export, 4 = complete
  
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
  } else if (latestLog.includes('exitoso') || latestLog.includes('completado') || latestLog.includes('captured') || latestLog.includes('complete')) {
    activePhase = 4
  }

  const phases = [
    {
      id: 1,
      name: 'Rhythm Analysis (DSP)',
      desc: 'Librosa STFT & dynamic peak picking',
    },
    {
      id: 2,
      name: 'Spatial Prediction (ONNX)',
      desc: 'Deep neural network tensor inference',
    },
    {
      id: 3,
      name: 'Geometric Polish & Packing',
      desc: 'Catmull-Rom splines & .osz compilation',
    },
  ]

  return (
    <aside className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Server className="h-5 w-5 text-cyan-400" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
              Engine Status
            </p>
            <h2 className="text-lg font-semibold text-white">Runtime Pipelines</h2>
          </div>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold ${
            isAnalyzing
              ? 'border border-amber-500/25 bg-amber-500/10 text-amber-300 animate-pulse'
              : activePhase === 4
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border border-slate-700 bg-slate-800 text-slate-400'
          }`}
        >
          {isAnalyzing ? 'Processing' : activePhase === 4 ? 'Success' : 'Idle'}
        </div>
      </div>

      <div className="mb-5 space-y-3 rounded-2xl border border-white/5 bg-black/20 p-4">
        {phases.map((phase) => {
          const isDone = activePhase > phase.id || activePhase === 4
          const isActive = activePhase === phase.id

          return (
            <div
              key={phase.id}
              className={`flex items-start gap-3 rounded-xl p-2.5 transition duration-300 ${
                isActive ? 'bg-cyan-500/5 border border-cyan-500/15' : 'border border-transparent'
              }`}
            >
              <div className="mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="h-4.5 w-4.5 text-cyan-400 animate-spin" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-slate-600" />
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className={`text-xs font-semibold ${
                    isActive ? 'text-cyan-300' : isDone ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {phase.name}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">{phase.desc}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 block mb-2">Stdout stream</span>
        <div className="max-h-[100px] overflow-y-auto rounded-xl border border-white/5 bg-black/40 p-3 space-y-1 text-slate-400 scrollbar-thin scrollbar-thumb-slate-700">
          {progressLines.map((line, index) => (
            <div key={`${line}-${index}`} className="truncate animate-fade-in">
              <span className="text-cyan-500/70 mr-1.5">&gt;</span>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-500/10 bg-cyan-500/5 p-3 text-xs text-cyan-100/95">
        <div className="flex items-center gap-2 font-medium">
          <Play className="h-3.5 w-3.5 text-cyan-400" />
          Endpoint
        </div>
        <p className="mt-1 font-mono text-[10px] leading-5 text-cyan-300/80 truncate">
          {backendUrl ?? 'No loopback URL resolved yet.'}
        </p>
      </div>
    </aside>
  )
}
