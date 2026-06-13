import { listen } from '@tauri-apps/api/event'
import { useEffect, useState, useRef } from 'react'
import { isTauriRuntime } from '../lib/runtime'

export interface HardwareTelemetry {
  cpuUsage: number
  totalMemory: number
  usedMemory: number
  engineCpuUsage: number
  engineMemory: number
}

export function useHardwareTelemetry(isAnalyzing: boolean) {
  const [telemetry, setTelemetry] = useState<HardwareTelemetry>({
    cpuUsage: 0,
    totalMemory: 16 * 1024 * 1024 * 1024,
    usedMemory: 4 * 1024 * 1024 * 1024,
    engineCpuUsage: 0,
    engineMemory: 0,
  })

  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0))
  const [engineCpuHistory, setEngineCpuHistory] = useState<number[]>(Array(30).fill(0))

  const analysisTimeRef = useRef<number>(0)
  const isAnalyzingRef = useRef(isAnalyzing)

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing
    if (!isAnalyzing) {
      analysisTimeRef.current = 0
    }
  }, [isAnalyzing])

  useEffect(() => {
    // Keep history updated when telemetry changes
    setCpuHistory((prev) => [...prev.slice(1), telemetry.cpuUsage])
    setEngineCpuHistory((prev) => [...prev.slice(1), telemetry.engineCpuUsage])
  }, [telemetry])

  useEffect(() => {
    if (isTauriRuntime()) {
      let unlisten: (() => void) | undefined

      async function setupListener() {
        unlisten = await listen<HardwareTelemetry>('hardware_telemetry', (event) => {
          setTelemetry(event.payload)
        })
      }

      setupListener()

      return () => {
        if (unlisten) unlisten()
      }
    } else {
      // Browser Mock/Demo Mode
      const interval = setInterval(() => {
        let cpu = 5 + Math.random() * 8
        let engineCpu = 0.1 + Math.random() * 0.4
        let totalMem = 16 * 1024 * 1024 * 1024
        let usedMem = 8.2 * 1024 * 1024 * 1024 + Math.random() * 200 * 1024 * 1024
        let engineMem = 48 * 1024 * 1024 + Math.random() * 5 * 1024 * 1024

        if (isAnalyzingRef.current) {
          analysisTimeRef.current += 1
          const t = analysisTimeRef.current

          if (t <= 3) {
            // Phase 1: Librosa DSP
            engineCpu = 78 + Math.random() * 14
            cpu = cpu + engineCpu * 0.8
            engineMem = 182 * 1024 * 1024 + Math.random() * 10 * 1024 * 1024
          } else if (t <= 8) {
            // Phase 2: ONNX Inference
            engineCpu = 45 + Math.random() * 12
            cpu = cpu + engineCpu * 0.8
            engineMem = 248 * 1024 * 1024 + Math.random() * 15 * 1024 * 1024
          } else if (t <= 10) {
            // Phase 3: Geometry & IO
            engineCpu = 12 + Math.random() * 6
            cpu = cpu + engineCpu * 0.8
            engineMem = 250 * 1024 * 1024 + Math.random() * 2 * 1024 * 1024
          } else {
            // Finished
            engineCpu = 0.2
            engineMem = 85 * 1024 * 1024
          }
        } else {
          analysisTimeRef.current = 0
        }

        setTelemetry({
          cpuUsage: Math.min(cpu, 100),
          totalMemory: totalMem,
          usedMemory: usedMem,
          engineCpuUsage: engineCpu,
          engineMemory: engineMem,
        })
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [])

  return {
    telemetry,
    cpuHistory,
    engineCpuHistory,
    isSimulated: !isTauriRuntime(),
  }
}
