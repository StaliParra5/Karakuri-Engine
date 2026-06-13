import { Activity, Cpu, HardDrive, Sparkles } from 'lucide-react'
import { useHardwareTelemetry } from '../hooks/use-hardware-telemetry'

interface HardwarePanelProps {
  isAnalyzing: boolean
}

function CircularProgress({ value, color, label }: { value: number; color: string; label: string }) {
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center">
        <svg className="h-16 w-16 -rotate-90 transform">
          <circle
            className="text-white/10"
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="3.5"
            fill="transparent"
          />
          <circle
            className={`transition-all duration-300 ease-out ${color}`}
            cx="32"
            cy="32"
            r={radius}
            stroke="currentColor"
            strokeWidth="3.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[10px] font-bold text-white">{Math.round(value)}%</span>
      </div>
      <span className="mt-1 text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{label}</span>
    </div>
  )
}

function PerformanceChart({ cpuHistory, engineCpuHistory }: { cpuHistory: number[]; engineCpuHistory: number[] }) {
  const width = 400
  const height = 90
  const maxVal = 100

  const getPath = (data: number[]) => {
    if (data.length < 2) return ''
    const stepX = width / (data.length - 1)
    return data.map((val, i) => {
      const x = i * stepX
      const y = height - (Math.min(maxVal, val) / maxVal) * (height - 10) - 5
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }

  const systemPath = getPath(cpuHistory)
  const enginePath = getPath(engineCpuHistory)

  return (
    <div className="relative mt-4 rounded-2xl border border-white/5 bg-black/30 p-3 overflow-hidden">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2">
        <span>Real-time CPU Profile (30s)</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-400" /> System</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> AI Engine</span>
        </div>
      </div>
      <div className="relative h-[90px] w-full">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="white" strokeWidth="1" strokeOpacity="0.05" strokeDasharray="3,3" />
          <line x1="0" y1={height - 5} x2={width} y2={height - 5} stroke="white" strokeWidth="1" strokeOpacity="0.1" />

          {systemPath && (
            <path
              d={systemPath}
              fill="none"
              stroke="url(#system-grad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          )}

          {enginePath && (
            <path
              d={enginePath}
              fill="none"
              stroke="url(#engine-grad)"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          )}

          <defs>
            <linearGradient id="system-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            <linearGradient id="engine-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}

export function HardwarePanel({ isAnalyzing }: HardwarePanelProps) {
  const { telemetry, cpuHistory, engineCpuHistory, isSimulated } = useHardwareTelemetry(isAnalyzing)

  const globalCpu = telemetry.cpuUsage
  const engineCpu = telemetry.engineCpuUsage
  
  const totalMem = telemetry.totalMemory || 16 * 1024 * 1024 * 1024
  const usedMem = telemetry.usedMemory
  const globalRamPercent = (usedMem / totalMem) * 100
  
  const engineMem = telemetry.engineMemory
  const engineRamPercent = (engineMem / (8 * 1024 * 1024 * 1024)) * 100

  const usedMemGb = (usedMem / 1024 / 1024 / 1024).toFixed(1)
  const totalMemGb = (totalMem / 1024 / 1024 / 1024).toFixed(0)
  
  const engineMemMb = (engineMem / 1024 / 1024).toFixed(1)

  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-md transition-all hover:bg-slate-900/60 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-cyan-400" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">System Analytics</p>
              {isSimulated && (
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-cyan-400">
                  Web Sandbox
                </span>
              )}
            </div>
            <h2 className="text-lg font-semibold text-white">Performance Telemetry</h2>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* PANEL 1: SYSTEM RESOURCES */}
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">PC Host</span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
              <Cpu className="h-3.5 w-3.5" />
              <span>Total CPU Load</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <HardDrive className="h-3.5 w-3.5" />
              <span>{usedMemGb}/{totalMemGb} GB ({Math.round(globalRamPercent)}%)</span>
            </div>
          </div>
          <div className="flex gap-2">
            <CircularProgress value={globalCpu} color="text-cyan-400" label="CPU" />
            <CircularProgress value={globalRamPercent} color="text-cyan-500" label="RAM" />
          </div>
        </div>

        {/* PANEL 2: ENGINE RESOURCES */}
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">Karakuri Engine</span>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
              <Cpu className="h-3.5 w-3.5 text-violet-400" />
              <span>AI Thread Load</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <HardDrive className="h-3.5 w-3.5 text-violet-400" />
              <span>{engineMemMb} MB RAM</span>
            </div>
          </div>
          <div className="flex gap-2">
            <CircularProgress value={engineCpu} color="text-violet-400" label="CPU" />
            <CircularProgress value={engineRamPercent} color="text-violet-500" label="RAM" />
          </div>
        </div>
      </div>

      <PerformanceChart cpuHistory={cpuHistory} engineCpuHistory={engineCpuHistory} />

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-cyan-500/5 p-3 text-[11px] text-cyan-200/90 border border-cyan-500/10">
        <Sparkles className="h-3.5 w-3.5 text-cyan-300 flex-shrink-0" />
        <p>
          {isAnalyzing 
            ? "El motor está ejecutando análisis espectral e inferencia. Observa el pico de esfuerzo en el gráfico."
            : "Sistema listo. Esperando inicio de procesamiento para registrar carga de Librosa y ONNX."}
        </p>
      </div>
    </section>
  )
}
