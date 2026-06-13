import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, RefreshCw } from 'lucide-react'
import { formatDuration } from '../lib/runtime'
import type { DashboardHistoryEntry } from '../types/dashboard'

interface SortableHistoryItemProps {
  entry: DashboardHistoryEntry
  onReuse: (entry: DashboardHistoryEntry) => void
}

function SortableHistoryItem({ entry, onReuse }: SortableHistoryItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 rounded-xl border border-white/5 bg-[#080e1b]/40 p-4 transition-all hover:bg-[#080e1b]/80 hover:border-[#00f2ff]/20 group"
    >
      <div
        className="flex cursor-grab items-center p-1.5 text-slate-500 hover:text-[#00f2ff] focus:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4.5 w-4.5" />
      </div>

      <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-3 overflow-hidden">
        <div className="overflow-hidden">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white group-hover:text-[#00f2ff] transition-colors truncate text-sm">
              {entry.audioFileName}
            </span>
            <span className="font-label-mono text-[9px] text-[#ebb2ff] bg-[#b600f8]/20 px-1.5 py-0.5 rounded border border-[#ebb2ff]/20 flex-shrink-0">
              {Math.round(entry.result.tempoBpm)} BPM
            </span>
          </div>
          <p className="text-xs text-[#b9cacb] font-label-mono truncate">
            {entry.metadata.artist || 'Unknown artist'} · {formatDuration(entry.result.durationMs)} · Intensity: {entry.metadata.intensity}
          </p>
        </div>
        <button
          className="bg-[#00f2ff]/10 border border-[#00f2ff]/30 text-[#00f2ff] hover:bg-[#00f2ff]/20 hover:border-[#00f2ff]/50 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-center flex-shrink-0"
          onClick={() => onReuse(entry)}
          type="button"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reuse
        </button>
      </div>
    </article>
  )
}

interface HistoryPanelProps {
  historyEntries: DashboardHistoryEntry[]
  onReuse(entry: DashboardHistoryEntry): void
  onReorder(entries: DashboardHistoryEntry[]): void
}

export function HistoryPanel({ historyEntries, onReuse, onReorder }: HistoryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = historyEntries.findIndex((item) => item.id === active.id)
      const newIndex = historyEntries.findIndex((item) => item.id === over.id)

      const newOrder = arrayMove(historyEntries, oldIndex, newIndex)
      onReorder(newOrder)
    }
  }

  // Filter entries dynamically based on title, artist, or creator
  const filteredEntries = historyEntries.filter((entry) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const titleMatch = entry.audioFileName.toLowerCase().includes(query)
    const artistMatch = (entry.metadata.artist || '').toLowerCase().includes(query)
    const creatorMatch = (entry.metadata.creator || '').toLowerCase().includes(query)
    
    return titleMatch || artistMatch || creatorMatch
  })

  return (
    <section className="glass-panel rounded-xl p-6">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#00f2ff] text-2xl">history</span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-[#b9cacb] font-label-mono">
              Local CRM Storage
            </p>
            <h2 className="text-lg font-bold text-white font-display-lg">Analysis History</h2>
          </div>
        </div>

        {/* Search bar inside the header area */}
        {historyEntries.length > 0 && (
          <div className="relative max-w-xs w-full sm:w-64">
            <span className="material-symbols-outlined text-[#b9cacb] absolute left-3 top-2.5 text-lg select-none">search</span>
            <input
              type="text"
              placeholder="Search by title, artist, creator..."
              className="w-full bg-[#080e1b] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-[#00f2ff] focus:ring-1 focus:ring-[#00f2ff] transition-all font-body-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {historyEntries.length === 0 ? (
        <p className="text-xs leading-6 text-[#b9cacb]">
          No stored runs yet. Completed analyses will appear here for quick parameter reuse and dnd organization.
        </p>
      ) : filteredEntries.length === 0 ? (
        <p className="text-xs leading-6 text-[#b9cacb] italic">
          No beatmaps found matching "{searchQuery}".
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredEntries} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredEntries.map((entry) => (
                <SortableHistoryItem key={entry.id} entry={entry} onReuse={onReuse} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
