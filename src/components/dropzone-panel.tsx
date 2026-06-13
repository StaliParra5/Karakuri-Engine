import { DndContext, useDroppable } from '@dnd-kit/core'
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
    <section
      ref={setNodeRef}
      onClick={onBrowse}
      className={`glass-panel rounded-xl p-8 flex flex-col items-center justify-center min-h-[260px] border-2 border-dashed transition-all cursor-pointer relative group overflow-hidden ${
        isActive
          ? 'border-[#00f2ff] bg-[#00f2ff]/10 shadow-[0_0_20px_rgba(0,242,255,0.2)]'
          : 'border-white/10 hover:border-[#00f2ff]/70'
      }`}
    >
      <div className="absolute inset-0 bg-[#00f2ff]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="z-10 flex flex-col items-center text-center w-full">
        <span className="material-symbols-outlined text-6xl text-[#00f2ff] mb-3 group-hover:scale-110 transition-transform duration-300 neon-text-cyan">
          upload_file
        </span>
        <h2 className="font-display-lg text-xl font-bold text-white mb-2 neon-text-cyan">
          Import Audio Track
        </h2>
        <p className="text-sm text-[#b9cacb] max-w-md mb-4">
          Drag and drop your <code className="text-[#00f2ff]">.mp3</code>, <code className="text-[#00f2ff]">.ogg</code>, or <code className="text-[#00f2ff]">.wav</code> file here, or click to browse.
        </p>

        {dropError && (
          <div className="w-full max-w-md rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300 mb-2">
            {dropError}
          </div>
        )}

        {selectedAudio ? (
          <div className="w-full max-w-lg rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-left cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white truncate max-w-[70%]">
                {selectedAudio.fileName}
              </span>
              <span className="font-label-mono text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/20">
                {selectedAudio.extension.toUpperCase()}
              </span>
            </div>
            <p className="text-xs font-label-mono text-[#b9cacb] truncate mb-1">{selectedAudio.path}</p>
            <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-semibold">
              Ready for /analyze/rhythm
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-label-mono">
            No audio track selected yet.
          </span>
        )}
      </div>
    </section>
  )
}

export function DropzonePanel(props: DropzonePanelProps) {
  return (
    <DndContext>
      <DropTarget {...props} />
    </DndContext>
  )
}
