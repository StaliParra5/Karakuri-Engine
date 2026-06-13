import { Cpu, HardDrive } from 'lucide-react'
import { useHardwareTelemetry } from '../hooks/use-hardware-telemetry'

interface HardwarePanelProps {
  isAnalyzing: boolean
}

function CircularProgress({ value, strokeColor, shadowColor, label }: { value: number; strokeColor: string; shadowColor: string; label: string }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className="relative w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" fill="none" r={radius} stroke="#242a38" strokeWidth="8"></circle>
        <circle
          className="transition-all duration-300 ease-out"
          cx="50"
          cy="50"
          fill="none"
          r={radius}
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${shadowColor})` }}
        ></circle>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-label-mono text-xs text-white font-bold">{Math.round(value)}%</span>
        <span className="text-[8px] text-[#b9cacb] uppercase tracking-wider font-semibold">{label}</span>
      </div>
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
    <div className="relative mt-4 rounded-xl border border-white/5 bg-[#080e1b]/55 p-3 overflow-hidden">
      <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-[#b9cacb] mb-2 font-label-mono">
        <span>Real-time CPU Profile (30s)</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#00f2ff]" /> Host</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#b600f8]" /> AI Engine</span>
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
              <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00f2ff" />
            </linearGradient>
            <linearGradient id="engine-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#b600f8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#b600f8" />
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
    <section className="glass-panel rounded-xl p-6 glow-border">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#00f2ff] text-2xl">memory</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.32em] text-[#b9cacb] font-label-mono">System Analytics</p>
              {isSimulated && (
                <span className="rounded bg-[#00f2ff]/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-[#00f2ff] border border-[#00f2ff]/20">
                  Web Sandbox
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white font-display-lg">Performance Telemetry</h2>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* PANEL 1: SYSTEM RESOURCES */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#00f2ff] font-display-lg">PC Host</span>
            <div className="flex items-center gap-1.5 text-[10px] text-[#b9cacb] mt-1 font-label-mono">
              <Cpu className="h-3 w-3" />
              <span>Total CPU Load</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#b9cacb] font-label-mono">
              <HardDrive className="h-3 w-3" />
              <span>{usedMemGb}/{totalMemGb} GB ({Math.round(globalRamPercent)}%)</span>
            </div>
          </div>
          <div className="flex gap-2">
            <CircularProgress value={globalCpu} strokeColor="#00f2ff" shadowColor="rgba(0, 242, 255, 0.4)" label="CPU" />
            <CircularProgress value={globalRamPercent} strokeColor="#00f2ff" shadowColor="rgba(0, 242, 255, 0.4)" label="RAM" />
          </div>
        </div>

        {/* PANEL 2: ENGINE RESOURCES */}
        <div className="rounded-xl border border-white/5 bg-white/5 p-4 flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#ebb2ff] font-display-lg">AI Engine</span>
            <div className="flex items-center gap-1.5 text-[10px] text-[#b9cacb] mt-1 font-label-mono">
              <Cpu className="h-3 w-3 text-[#ebb2ff]" />
              <span>AI Thread Load</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[#b9cacb] font-label-mono">
              <HardDrive className="h-3 w-3 text-[#ebb2ff]" />
              <span>{engineMemMb} MB RAM</span>
            </div>
          </div>
          <div className="flex gap-2">
            <CircularProgress value={engineCpu} strokeColor="#b600f8" shadowColor="rgba(182, 0, 248, 0.4)" label="CPU" />
            <CircularProgress value={engineRamPercent} strokeColor="#b600f8" shadowColor="rgba(182, 0, 248, 0.4)" label="RAM" />
          </div>
        </div>
      </div>

      <PerformanceChart cpuHistory={cpuHistory} engineCpuHistory={engineCpuHistory} />

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#00f2ff]/5 p-3 text-[11px] text-[#00f2ff]/90 border border-[#00f2ff]/10">
        <span className="material-symbols-outlined text-[#00f2ff] text-base animate-pulse">auto_awesome</span>
        <p>
          {isAnalyzing 
            ? "El motor está ejecutando análisis espectral e inferencia. Observa el pico de esfuerzo en el gráfico."
            : "Sistema listo. Esperando inicio de procesamiento para registrar carga de Librosa y ONNX."}
        </p>
      </div>
    </section>
  )
}
