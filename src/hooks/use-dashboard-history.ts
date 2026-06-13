import { invoke } from '@tauri-apps/api/core'
import { useCallback, useEffect, useState } from 'react'
import { HISTORY_STORAGE_KEY, isTauriRuntime } from '../lib/runtime'
import type { DashboardHistoryEntry } from '../types/dashboard'

export function useDashboardHistory() {
  const [historyEntries, setHistoryEntries] = useState<DashboardHistoryEntry[]>([])

  const saveEntries = useCallback(async (entries: DashboardHistoryEntry[]) => {
    setHistoryEntries(entries)

    if (isTauriRuntime()) {
      await invoke('save_dashboard_history', { entries })
      return
    }

    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  }, [])

  useEffect(() => {
    async function loadHistory() {
      if (isTauriRuntime()) {
        const entries = await invoke<DashboardHistoryEntry[]>('load_dashboard_history')
        setHistoryEntries(entries)
        return
      }

      const rawEntries = window.localStorage.getItem(HISTORY_STORAGE_KEY)
      setHistoryEntries(rawEntries ? (JSON.parse(rawEntries) as DashboardHistoryEntry[]) : [])
    }

    void loadHistory()
  }, [])

  async function prependEntry(entry: DashboardHistoryEntry) {
    const nextEntries = [entry, ...historyEntries].slice(0, 8)
    await saveEntries(nextEntries)
  }

  return {
    historyEntries,
    prependEntry,
    saveEntries,
  }
}
