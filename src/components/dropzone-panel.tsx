import { DndContext, useDroppable } from '@dnd-kit/core'
import { AudioLines, FolderInput, Sparkles } from 'lucide-react'
import type { SelectedAudioFile } from '../types/dashboard'

interface DropzonePanelProps {
  dropError: string | null
  isDraggingAudio: boolean
  selectedAudio: SelectedAudioFile | null
  onBrowse(): void
}

function DropTarget({ dropError, isDraggingAudio, selectedAudio, onBrowse }: DropzonePanelProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'audio-dropzone' })
  const isActive = isOver || isDraggingAudio

  return (
    <div
      ref={setNodeRef}
      className={`relative overflow-hidden rounded-[30px] border p-6 transition duration-300 ${
        isActive
          ? 'border-cyan-200/45 bg-cyan-200/10 shadow-[0_0_0_1px_rgba(167,243,255,0.15),0_0_80px_rgba(59,130,246,0.2)]'
          : 'border-white/10 bg-slate-950/50'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_45%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-cyan-100/80">
              Audio intake
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Select an audio file</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBrowse}
              className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-cyan-200 transition hover:border-cyan-300/50 hover:bg-cyan-500/20 active:scale-95 cursor-pointer"
              type="button"
            >
              Browse File
            </button>
            <div className="rounded-full border border-white/12 bg-white/6 p-3 text-cyan-100">
              <FolderInput className="h-5 w-5" />
            </div>
          </div>
        </div>

        <p className="max-w-xl text-sm leading-7 text-slate-300">
          Usa drag and drop o haz clic en "Browse File". El dashboard aceptará
          rutas locales `.mp3`, `.ogg` y `.wav` para el motor.
        </p>

        <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-dashed border-white/14 bg-black/20 p-5">
            <div className="flex items-center gap-3 text-sm text-slate-200">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              {isActive ? 'Release to ingest the local asset.' : 'Waiting for audio file.'}
            </div>

            {dropError ? (
              <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {dropError}
              </p>
            ) : null}

            {selectedAudio ? (
              <div className="mt-4 grid gap-3 rounded-3xl border border-emerald-300/12 bg-emerald-300/8 p-4">
                <div className="flex items-center gap-3 text-white">
                  <AudioLines className="h-4 w-4 text-emerald-200" />
                  <span className="font-medium">{selectedAudio.fileName}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.24em] text-emerald-100/85">
                  <span className="rounded-full border border-emerald-200/20 px-3 py-1">
                    {selectedAudio.extension}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-slate-300">
                    Ready for `/analyze/rhythm`
                  </span>
                </div>
                <p className="text-sm text-slate-300">{selectedAudio.path}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Ningún audio seleccionado todavía.
              </p>
            )}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/6 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white/85">
              Supported formats
            </h3>
            <div className="mt-4 flex flex-wrap gap-3">
              {['mp3', 'ogg', 'wav'].map((extension) => (
                <span
                  key={extension}
                  className="rounded-full border border-white/12 bg-slate-950/45 px-3 py-1 text-sm text-slate-200"
                >
                  .{extension}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-400">
              La ruta se captura para evitar uploads intermedios en modo Tauri y mantener el contrato local-first.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DropzonePanel(props: DropzonePanelProps) {
  return (
    <DndContext>
      <DropTarget {...props} />
    </DndContext>
  )
}
