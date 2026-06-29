import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import type { BridgeStatus, PreflightStatus } from '../types/dashboard'
import { isTauriRuntime, sanitizeProgressLine } from '../lib/runtime'

export function useBackendBridge() {
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('offline')
  const [backendUrl, setBackendUrl] = useState<string | null>(null)
  const [progressLines, setProgressLines] = useState<string[]>(['Frontend ready'])
  const [progressPercent, setProgressPercent] = useState<number>(0)
  const [preflightStatus, setPreflightStatus] = useState<PreflightStatus | null>(null)
  const deferredProgressLines = useDeferredValue(progressLines)

  useEffect(() => {
    const isTest = (globalThis as any).process?.env?.NODE_ENV === 'test' || import.meta.env.MODE === 'test'
    const pollHealthEndpoint = async (url: string, retries = isTest ? 1 : 15, delayMs = isTest ? 10 : 1000): Promise<boolean> => {
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
      
      void pollHealthEndpoint(defaultUrl, isTest ? 1 : 4, isTest ? 10 : 1000).then(async (isOnline) => {
        if (isOnline) {
          setBackendUrl(defaultUrl)
          try {
            const res = await fetch(`${defaultUrl}/preflight`)
            if (res.ok) setPreflightStatus(await res.json())
          } catch (e) {}
          setBridgeStatus('online')
          setProgressLines(['Connected to Local Python API'])
        } else {
          setBridgeStatus('sandbox')
          setBackendUrl('http://sandbox-api.local')
          setProgressLines(['Running in Web Sandbox Mode (Simulated AI Engine)'])
          setPreflightStatus({
            status: 'sandbox',
            checks: { librosa: 'simulated', numpy: 'simulated', onnx_runtime: 'simulated' }
          })
        }
      })
      return
    }

    let unlisten: (() => void) | undefined

    startTransition(() => {
      setBridgeStatus('connecting')
    })

    void listen<string>('ai_progress_status', (event) => {
      const sanitized = sanitizeProgressLine(event.payload)
      if (!sanitized) {
        return
      }

      let messageText = sanitized
      if (sanitized.startsWith('{')) {
        try {
          const parsed = JSON.parse(sanitized) as { stage?: number; progress?: number; message?: string }
          if (parsed.message) messageText = parsed.message
          if (typeof parsed.progress === 'number') setProgressPercent(parsed.progress)
        } catch (e) {}
      }

      setProgressLines((current) => [...current, messageText].slice(-8))
    }).then((dispose) => {
      unlisten = dispose
    })

    void invoke<string>('get_backend_url')
      .then(async (url) => {
        setBackendUrl(url)
        setProgressLines(['Python API starting...'])
        
        const isOnline = await pollHealthEndpoint(url, isTest ? 1 : 15, isTest ? 10 : 1000)
        
        if (isOnline) {
          try {
            const res = await fetch(`${url}/preflight`)
            if (res.ok) setPreflightStatus(await res.json())
          } catch (e) {}
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
    progressPercent,
    setProgressPercent,
    preflightStatus,
    setProgressLines,
  }
}
