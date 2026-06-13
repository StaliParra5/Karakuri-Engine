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
import { GripVertical, History, RefreshCw } from 'lucide-react'
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
      className="relative flex items-center gap-2 rounded-[28px] border border-white/10 bg-white/5 p-4 pl-2 shadow-sm transition-colors hover:border-cyan-500/30"
    >
      <div
        className="flex cursor-grab items-center p-2 text-slate-500 hover:text-cyan-300 focus:outline-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{entry.audioFileName}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {entry.metadata.artist || 'Unknown artist'} · {formatDuration(entry.result.durationMs)}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-200/40 hover:bg-cyan-300/15"
          onClick={() => onReuse(entry)}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
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

  return (
    <section className="rounded-[30px] border border-white/10 bg-slate-950/55 p-6 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
      <div className="mb-5 flex items-center gap-3">
        <History className="h-5 w-5 text-cyan-400" />
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-slate-400">
            Local CRM Storage
          </p>
          <h2 className="text-lg font-semibold text-white">Analysis Pipeline</h2>
        </div>
      </div>

      {historyEntries.length === 0 ? (
        <p className="text-sm leading-7 text-slate-400">
          No stored runs yet. Completed analyses will appear here for quick reuse.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={historyEntries} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {historyEntries.map((entry) => (
                <SortableHistoryItem key={entry.id} entry={entry} onReuse={onReuse} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}
