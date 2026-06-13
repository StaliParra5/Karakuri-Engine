import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import type { BridgeStatus } from '../types/dashboard'
import { isTauriRuntime, sanitizeProgressLine } from '../lib/runtime'

export function useBackendBridge() {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('offline')
  const [backendUrl, setBackendUrl] = useState<string | null>(null)
  const [progressLines, setProgressLines] = useState<string[]>(['Frontend ready'])
  const deferredProgressLines = useDeferredValue(progressLines)

  useEffect(() => {
    if (!isTauriRuntime()) {
      const defaultUrl = 'http://127.0.0.1:8000'
      setBridgeStatus('connecting')
      fetch(`${defaultUrl}/health`)
        .then(async (response) => {
          if (response.ok) {
            setBackendUrl(defaultUrl)
            setBridgeStatus('online')
            setProgressLines(['Connected to Local Python API'])
          } else {
            throw new Error()
          }
        })
        .catch(() => {
          setBridgeStatus('sandbox')
          setBackendUrl('http://sandbox-api.local')
          setProgressLines(['Running in Web Sandbox Mode (Simulated AI Engine)'])
        })
      return
    }

    let unlisten: (() => void) | undefined

    startTransition(() => {
      setBridgeStatus('connecting')
    })

    void listen<string>('ai_progress_status', (event) => {
      const nextLine = sanitizeProgressLine(event.payload)
      if (!nextLine) {
        return
      }
      setProgressLines((current) => [...current, nextLine].slice(-8))
    }).then((dispose) => {
      unlisten = dispose
    })

    void invoke<string>('get_backend_url')
      .then(async (url) => {
        setBackendUrl(url)
        const response = await fetch(`${url}/health`)
        if (!response.ok) {
          throw new Error(`Health check failed with ${response.status}`)
        }
        startTransition(() => {
          setBridgeStatus('online')
        })
      })
      .catch(() => {
        startTransition(() => {
          setBridgeStatus('offline')
        })
      })

    return () => {
      unlisten?.()
    }
  }, [])

  return {
    bridgeStatus,
    backendUrl,
    progressLines: deferredProgressLines,
    setProgressLines,
  }
}
