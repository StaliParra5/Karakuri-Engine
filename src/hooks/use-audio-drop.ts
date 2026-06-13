import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { useEffect, useState } from 'react'
import { createDefaultTitle, createSelectedAudio, isTauriRuntime } from '../lib/runtime'
import type { DashboardFormState, SelectedAudioFile } from '../types/dashboard'

interface UseAudioDropOptions {
  onAudioSelected(audio: SelectedAudioFile, suggestedTitle: string): void
}

export function useAudioDrop({ onAudioSelected }: UseAudioDropOptions) {
  const [selectedAudio, setSelectedAudio] = useState<SelectedAudioFile | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)
  const [isDraggingAudio, setIsDraggingAudio] = useState(false)

  useEffect(() => {
    if (isTauriRuntime()) {
      let unlisten: (() => void) | undefined

      void getCurrentWebview()
        .onDragDropEvent((event) => {
          const payload = event.payload

          if (payload.type === 'enter' || payload.type === 'over') {
            setIsDraggingAudio(true)
            return
          }

          if (payload.type === 'leave') {
            setIsDraggingAudio(false)
            return
          }

          if (payload.type === 'drop') {
            setIsDraggingAudio(false)
            const firstPath = payload.paths[0]
            const nextAudio = createSelectedAudio(firstPath)

            if (!nextAudio) {
              setDropError('Unsupported audio format. Use .mp3, .ogg or .wav.')
              return
            }

            setDropError(null)
            setSelectedAudio(nextAudio)
            onAudioSelected(nextAudio, createDefaultTitle(nextAudio.fileName))
          }
        })
        .then((dispose) => {
          unlisten = dispose
        })

      return () => {
        unlisten?.()
      }
    } else {
      // Standard HTML5 drag-and-drop fallback for web
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        setIsDraggingAudio(true)
      }

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault()
        setIsDraggingAudio(false)
      }

      const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        setIsDraggingAudio(false)
        const file = e.dataTransfer?.files?.[0]
        if (!file) return

        const extension = file.name.split('.').pop()?.toLowerCase()
        if (extension !== 'mp3' && extension !== 'ogg' && extension !== 'wav') {
          setDropError('Unsupported audio format. Use .mp3, .ogg or .wav.')
          return
        }

        const audio: SelectedAudioFile = {
          path: file.name,
          fileName: file.name,
          extension: extension as any,
        }
        setDropError(null)
        setSelectedAudio(audio)
        onAudioSelected(audio, createDefaultTitle(audio.fileName))
      }

      window.addEventListener('dragover', handleDragOver)
      window.addEventListener('dragleave', handleDragLeave)
      window.addEventListener('drop', handleDrop)

      return () => {
        window.removeEventListener('dragover', handleDragOver)
        window.removeEventListener('dragleave', handleDragLeave)
        window.removeEventListener('drop', handleDrop)
      }
    }
  }, [onAudioSelected])

  function reuseAudio(audio: SelectedAudioFile) {
    setDropError(null)
    setSelectedAudio(audio)
    onAudioSelected(audio, createDefaultTitle(audio.fileName))
  }

  function reuseHistorySelection(
    audio: SelectedAudioFile,
    metadata: DashboardFormState,
  ) {
    setDropError(null)
    setSelectedAudio(audio)
    onAudioSelected(audio, metadata.title || createDefaultTitle(audio.fileName))
  }

  function selectFileManually() {
    if (isTauriRuntime()) {
      void invoke<string | null>('select_audio_file')
        .then((path) => {
          if (!path) return
          const audio = createSelectedAudio(path)
          if (!audio) {
            setDropError('Unsupported audio format. Use .mp3, .ogg or .wav.')
            return
          }
          setDropError(null)
          setSelectedAudio(audio)
          onAudioSelected(audio, createDefaultTitle(audio.fileName))
        })
        .catch((err) => {
          setDropError(String(err))
        })
    } else {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.mp3,.ogg,.wav'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        const extension = file.name.split('.').pop()?.toLowerCase()
        const audio: SelectedAudioFile = {
          path: file.name,
          fileName: file.name,
          extension: extension as any || 'mp3',
        }
        setDropError(null)
        setSelectedAudio(audio)
        onAudioSelected(audio, createDefaultTitle(audio.fileName))
      }
      input.click()
    }
  }

  return {
    selectedAudio,
    dropError,
    isDraggingAudio,
    reuseAudio,
    reuseHistorySelection,
    selectFileManually,
  }
}
