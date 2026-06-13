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
    // Helper function to poll the health endpoint until it responds or retries run out
    const pollHealthEndpoint = async (url: string, retries = 15, delayMs = 1000): Promise<boolean> => {
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch(`${url}/health`)
          if (response.ok) {
            const data = await response.json().catch(() => null)
            if (data && data.status === 'ok') {
              return true
            }
          }
        } catch (e) {
          // ignore error and try again
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      return false
    }

    if (!isTauriRuntime()) {
      const defaultUrl = 'http://127.0.0.1:8000'
      setBridgeStatus('connecting')
      
      void pollHealthEndpoint(defaultUrl, 4, 1000).then((isOnline) => {
        if (isOnline) {
          setBackendUrl(defaultUrl)
          setBridgeStatus('online')
          setProgressLines(['Connected to Local Python API'])
        } else {
          setBridgeStatus('sandbox')
          setBackendUrl('http://sandbox-api.local')
          setProgressLines(['Running in Web Sandbox Mode (Simulated AI Engine)'])
        }
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
        setProgressLines(['Python API starting...'])
        
        // Wait up to 15 seconds for Uvicorn to start and load ONNX/Librosa
        const isOnline = await pollHealthEndpoint(url, 15, 1000)
        
        if (isOnline) {
          startTransition(() => {
            setBridgeStatus('online')
            setProgressLines(['Connected to Local Python API'])
          })
        } else {
          startTransition(() => {
            setBridgeStatus('offline')
            setProgressLines(['Python API failed to start. Click to retry.'])
          })
        }
      })
      .catch(() => {
        startTransition(() => {
          setBridgeStatus('offline')
          setProgressLines(['Tauri bridge failed.'])
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
