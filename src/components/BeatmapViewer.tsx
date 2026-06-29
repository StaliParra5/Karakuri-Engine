import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { SpatialObject, FullAnalysisResponse, DashboardFormState, SelectedAudioFile } from '../types/dashboard'
import { Play, Pause, X, Save, CheckCircle } from 'lucide-react'

interface BeatmapViewerProps {
  objects: SpatialObject[]
  tempoBpm: number
  kiaiRanges?: [number, number][]
  analysisResult?: FullAnalysisResponse | null
  formState?: DashboardFormState
  selectedAudio?: SelectedAudioFile | null
  backendUrl?: string | null
  onRepackageSuccess?: (newOszPath: string) => void
  onClose: () => void
}

export function BeatmapViewer({
  objects,
  tempoBpm,
  kiaiRanges,
  analysisResult,
  formState,
  selectedAudio,
  backendUrl,
  onRepackageSuccess,
  onClose,
}: BeatmapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [editableObjects, setEditableObjects] = useState<SpatialObject[]>(objects)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isRepackaging, setIsRepackaging] = useState(false)
  const [repackageMsg, setRepackageMsg] = useState<string | null>(null)
  const [copilotDirective, setCopilotDirective] = useState('stream')
  const [isCopilotRunning, setIsCopilotRunning] = useState(false)

  const maxTimeMs = editableObjects.length > 0 ? Math.max(...editableObjects.map((o) => o.time_ms)) + 1000 : 5000

  const handleRunCopilot = async () => {
    if (!backendUrl) return
    setIsCopilotRunning(true)
    setRepackageMsg(null)
    try {
      const response = await fetch(`${backendUrl}/analyze/copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objects: editableObjects,
          start_ms: Math.max(0, currentTimeMs),
          end_ms: Math.min(maxTimeMs, currentTimeMs + 4000),
          directive: copilotDirective,
          tempo_bpm: tempoBpm,
          game_mode: formState?.gameMode || 'Standard',
          cs: formState?.cs || 4.0,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        if (data.spatial_objects) {
          setEditableObjects(data.spatial_objects)
          setRepackageMsg('🤖 AI Copilot regeneró los siguientes 4 segundos exitosamente.')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsCopilotRunning(false)
    }
  }

  useEffect(() => {
    setEditableObjects(objects)
  }, [objects])

  useEffect(() => {
    let animationFrameId: number
    let lastTimestamp: number | null = null

    const renderLoop = (timestamp: number) => {
      if (isPlaying) {
        if (lastTimestamp !== null) {
          const delta = timestamp - lastTimestamp
          setCurrentTimeMs((prev) => {
            const next = prev + delta
            if (next > maxTimeMs) {
              setIsPlaying(false)
              return 0
            }
            return next
          })
        }
        lastTimestamp = timestamp
      } else {
        lastTimestamp = null
      }

      drawPlayfield()
      animationFrameId = requestAnimationFrame(renderLoop)
    }

    animationFrameId = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPlaying, currentTimeMs, editableObjects, kiaiRanges])

  const drawPlayfield = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const inKiai = kiaiRanges?.some(([s, e]) => currentTimeMs >= s && currentTimeMs <= e)

    // Clear background (Dark theme playfield, pulse indigo during Kiai)
    ctx.fillStyle = inKiai ? '#1e1b4b' : '#0f172a'
    ctx.fillRect(0, 0, 512, 384)

    if (inKiai) {
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 4
      ctx.strokeRect(2, 2, 508, 380)
      ctx.fillStyle = '#facc15'
      ctx.font = 'bold 14px sans-serif'
      ctx.fillText('⚡ KIAI TIME ⚡', 200, 24)
    }

    // Draw subtle grid
    ctx.strokeStyle = inKiai ? '#312e81' : '#1e293b'
    ctx.lineWidth = 1
    for (let x = 0; x < 512; x += 64) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 384)
      ctx.stroke()
    }
    for (let y = 0; y < 384; y += 64) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }

    const approachWindow = 800 // ms before note hit
    const fadeWindow = 200 // ms after hit

    // Filter notes visible at currentTimeMs
    const visibleObjects = editableObjects.filter(
      (obj) => obj.time_ms >= currentTimeMs - fadeWindow && obj.time_ms <= currentTimeMs + approachWindow
    )

    visibleObjects.forEach((obj) => {
      const timeDiff = obj.time_ms - currentTimeMs
      const isPast = timeDiff < 0
      const alpha = isPast ? 1 - Math.abs(timeDiff) / fadeWindow : Math.min(1, (approachWindow - timeDiff) / 200)

      ctx.save()
      ctx.globalAlpha = Math.max(0, alpha)

      // Draw slider path if applicable
      if (obj.slider_end_x !== undefined && obj.slider_end_y !== undefined) {
        ctx.strokeStyle = inKiai ? '#facc15' : '#38bdf8'
        ctx.lineWidth = 24
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(obj.x, obj.y)
        ctx.lineTo(obj.slider_end_x, obj.slider_end_y)
        ctx.stroke()

        // Inner path
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 16
        ctx.beginPath()
        ctx.moveTo(obj.x, obj.y)
        ctx.lineTo(obj.slider_end_x, obj.slider_end_y)
        ctx.stroke()
      }

      // Draw Hit Circle
      ctx.fillStyle = isPast ? '#f43f5e' : inKiai ? '#facc15' : '#38bdf8'
      ctx.beginPath()
      ctx.arc(obj.x, obj.y, 20, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#ffffff'
      ctx.stroke()

      // Hitsound badge if Whistle or Clap
      if (obj.hit_sound && obj.hit_sound > 0) {
        ctx.fillStyle = '#ffffff'
        ctx.font = '10px monospace'
        const hsLabel = obj.hit_sound & 2 ? 'W' : obj.hit_sound & 8 ? 'C' : 'H'
        ctx.fillText(hsLabel, obj.x - 3, obj.y + 3)
      }

      // Draw Approach Circle if coming
      if (!isPast) {
        const approachScale = 1 + (timeDiff / approachWindow) * 2
        ctx.beginPath()
        ctx.arc(obj.x, obj.y, 20 * approachScale, 0, Math.PI * 2)
        ctx.strokeStyle = inKiai ? '#facc15' : '#38bdf8'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.restore()
    })

    // Draw Audit Issue warnings if close to currentTimeMs
    const auditIssues = analysisResult?.audit_issues || []
    auditIssues.forEach((issue) => {
      if (Math.abs(issue.time_ms - currentTimeMs) < 600) {
        ctx.save()
        ctx.fillStyle = issue.severity === 'error' ? '#ef4444' : '#f59e0b'
        ctx.beginPath()
        ctx.moveTo(issue.x, issue.y - 18)
        ctx.lineTo(issue.x - 14, issue.y + 12)
        ctx.lineTo(issue.x + 14, issue.y + 12)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#000000'
        ctx.font = 'bold 12px sans-serif'
        ctx.fillText('!', issue.x - 3, issue.y + 7)
        ctx.restore()
      }
    })
  }

  const getCanvasCoords = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = 512 / rect.width
    const scaleY = 384 / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return
    const { x, y } = getCanvasCoords(e)
    const approachWindow = 800
    const fadeWindow = 200

    // Find clicked object visible right now
    for (let i = editableObjects.length - 1; i >= 0; i--) {
      const obj = editableObjects[i]
      if (obj.time_ms >= currentTimeMs - fadeWindow && obj.time_ms <= currentTimeMs + approachWindow) {
        const dist = Math.hypot(obj.x - x, obj.y - y)
        if (dist <= 25) {
          setDraggingIdx(i)
          setDragOffset({ x: obj.x - x, y: obj.y - y })
          break
        }
      }
    }
  }

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (draggingIdx === null) return
    const { x, y } = getCanvasCoords(e)
    const newX = Math.max(0, Math.min(512, Math.round(x + dragOffset.x)))
    const newY = Math.max(0, Math.min(384, Math.round(y + dragOffset.y)))

    setEditableObjects((prev) => {
      const copy = [...prev]
      const target = { ...copy[draggingIdx] }
      const deltaX = newX - target.x
      const deltaY = newY - target.y
      target.x = newX
      target.y = newY
      if (target.slider_end_x !== undefined && target.slider_end_y !== undefined) {
        target.slider_end_x = Math.max(0, Math.min(512, Math.round(target.slider_end_x + deltaX)))
        target.slider_end_y = Math.max(0, Math.min(384, Math.round(target.slider_end_y + deltaY)))
      }
      copy[draggingIdx] = target
      return copy
    })
  }

  const handleMouseUp = () => {
    setDraggingIdx(null)
  }

  const handleRepackage = async () => {
    if (!backendUrl) return
    setIsRepackaging(true)
    setRepackageMsg(null)
    try {
      const payload = {
        request: {
          audio_path: selectedAudio?.path || '',
          title: formState?.title || 'Unknown Title',
          artist: formState?.artist || 'Unknown Artist',
          creator: formState?.creator || 'Automapper',
          difficulty: formState?.difficulty || 'Normal',
          mapping_style: formState?.mappingStyle || 'Standard',
          prompt: formState?.aiPrompt || '',
          background_path: formState?.backgroundPath || null,
          cs: formState?.cs || 4.0,
          ar: formState?.ar || 9.0,
          od: formState?.od || 8.0,
          hp: formState?.hp || 6.0,
        },
        tempo_bpm: tempoBpm,
        beat_times_ms: analysisResult?.beat_times_ms || [],
        polished_objects: editableObjects,
        kiai_ranges: kiaiRanges || null,
      }
      const resp = await fetch(`${backendUrl}/analyze/repackage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data = await resp.json()
      if (data.status === 'ok' && data.osz_path) {
        onRepackageSuccess?.(data.osz_path)
        setRepackageMsg('¡Re-empaquetado .osz guardado exitosamente en osu!')
        setTimeout(() => setRepackageMsg(null), 4000)
      }
    } catch (err) {
      setRepackageMsg('Error al re-empaquetar beatmap.')
    } finally {
      setIsRepackaging(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex flex-col w-full max-w-3xl bg-slate-900/90 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Previsualizador y Editor Live de Beatmap
              {kiaiRanges && kiaiRanges.length > 0 && (
                <span className="text-[10px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-2 py-0.5 rounded-full font-mono">
                  KIAI ENABLED
                </span>
              )}
              {analysisResult?.estimated_star_rating && (
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono">
                  ★ {analysisResult.estimated_star_rating.toFixed(2)} SR
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Arrastra objetos pausados para editar coordenadas en vivo | {tempoBpm.toFixed(1)} BPM
              {analysisResult?.audit_issues && analysisResult.audit_issues.length > 0 && (
                <span className="ml-2 text-amber-400 font-semibold">
                  ({analysisResult.audit_issues.length} alertas de auditoría)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Playfield Area */}
        <div className="flex items-center justify-center p-6 bg-black/40">
          <div className="relative border-2 border-slate-700/80 rounded-lg overflow-hidden shadow-inner bg-slate-950">
            <canvas
              ref={canvasRef}
              width={512}
              height={384}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`block ${draggingIdx !== null ? 'cursor-grabbing' : 'cursor-grab'}`}
              data-testid="beatmap-canvas"
            />
          </div>
        </div>

        {/* Repackage Feedback Banner */}
        {repackageMsg && (
          <div className="mx-6 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center gap-2 text-cyan-300 text-xs">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span>{repackageMsg}</span>
          </div>
        )}

        {/* AI Copilot Toolbar when paused */}
        {!isPlaying && (
          <div className="mx-6 my-2 px-4 py-3 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold">
              <span>🤖 AI Copilot (próx. 4s):</span>
              <select
                value={copilotDirective}
                onChange={(e) => setCopilotDirective(e.target.value)}
                className="bg-purple-900/60 border border-purple-500/40 rounded px-2 py-1 text-white text-xs outline-none cursor-pointer"
              >
                <option value="stream">Stream 1/4 Rápido</option>
                <option value="jump">Saltos Triangulares 1/2</option>
                <option value="slider">Flow Sliders</option>
              </select>
            </div>
            <button
              onClick={handleRunCopilot}
              disabled={isCopilotRunning}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
            >
              {isCopilotRunning ? 'Generando...' : '✨ Regenerar Sección'}
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <input
                type="range"
                min={0}
                max={maxTimeMs}
                value={currentTimeMs}
                onChange={(e) => {
                  setIsPlaying(false)
                  setCurrentTimeMs(Number(e.target.value))
                }}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-xs font-mono text-slate-400 min-w-[60px] text-right">
                {(currentTimeMs / 1000).toFixed(2)}s
              </span>
            </div>

            {backendUrl && (
              <button
                onClick={handleRepackage}
                disabled={isRepackaging}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isRepackaging ? 'Empaquetando...' : 'Re-empaquetar .osz'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
