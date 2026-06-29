import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const { invokeMock, listenMock, onDragDropEventMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  listenMock: vi.fn(),
  onDragDropEventMock: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: listenMock,
}))

vi.mock('@tauri-apps/api/webview', () => ({
  getCurrentWebview: () => ({
    onDragDropEvent: onDragDropEventMock,
  }),
}))

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    invokeMock.mockReset()
    listenMock.mockReset()
    onDragDropEventMock.mockReset()
    delete (window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders the premium dashboard empty state outside tauri', async () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /karakuri engine/i }),
    ).toBeInTheDocument()
    expect(await screen.findByText(/bridge offline/i)).toBeInTheDocument()
    expect(screen.getByText(/import audio track/i)).toBeInTheDocument()
    expect(screen.getByText(/track metadata/i)).toBeInTheDocument()
  })

  it('accepts a dropped wav file and displays the audio selection', async () => {
    ;(window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {}
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'get_backend_url') {
        return 'http://127.0.0.1:8123'
      }
      if (command === 'load_dashboard_history') {
        return []
      }
      return undefined
    })
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', engine: 'Karakuri v1.0' }),
    })
    onDragDropEventMock.mockImplementation(async (handler: (event: { payload: { type: string; paths: string[] } }) => void) => {
      handler({
        payload: {
          type: 'drop',
          paths: ['C:/Music/anthem.wav'],
        },
      })
      return () => undefined
    })
    listenMock.mockResolvedValue(() => undefined)

    render(<App />)

    expect((await screen.findAllByText(/anthem\.wav/i)).length).toBeGreaterThan(0)
    expect(screen.getByText(/^wav$/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('anthem')).toBeInTheDocument()
  })

  it('rejects unsupported dropped files', async () => {
    ;(window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {}
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'get_backend_url') {
        return 'http://127.0.0.1:8123'
      }
      if (command === 'load_dashboard_history') {
        return []
      }
      return undefined
    })
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', engine: 'Karakuri v1.0' }),
    })
    onDragDropEventMock.mockImplementation(async (handler: (event: { payload: { type: string; paths: string[] } }) => void) => {
      handler({
        payload: {
          type: 'drop',
          paths: ['C:/Music/readme.txt'],
        },
      })
      return () => undefined
    })
    listenMock.mockResolvedValue(() => undefined)

    render(<App />)

    expect(await screen.findByText(/unsupported audio format/i)).toBeInTheDocument()
  })

  it('runs rhythm analysis and renders the result summary', async () => {
    ;(window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {}
    invokeMock.mockImplementation(async (command: string, payload?: unknown) => {
      if (command === 'get_backend_url') {
        return 'http://127.0.0.1:8123'
      }
      if (command === 'load_dashboard_history') {
        return []
      }
      if (command === 'save_dashboard_history') {
        return payload
      }
      return undefined
    })
    ;(fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes('/analyze/full')) {
        return {
          ok: true,
          json: async () => ({
            status: 'ok',
            engine: 'Karakuri v1.0',
            sample_rate: 22050,
            duration_ms: 4000,
            tempo_bpm: 117.45,
            beat_times_ms: [0, 511, 1022, 1533],
            onset_times_ms: [0, 500, 1000],
            frame_hop_length: 512,
            analysis_window_fft: 2048,
          }),
        }
      }
      return {
        ok: true,
        json: async () => ({ status: 'ok', engine: 'Karakuri v1.0' }),
      }
    })
    onDragDropEventMock.mockImplementation(async (handler: (event: { payload: { type: string; paths: string[] } }) => void) => {
      handler({
        payload: {
          type: 'drop',
          paths: ['C:/Music/anthem.wav'],
        },
      })
      return () => undefined
    })
    listenMock.mockImplementation(async (_event, handler: (event: { payload: string }) => void) => {
      handler({ payload: 'STATUS: loading audio' })
      handler({ payload: 'STATUS: tracking beats' })
      return () => undefined
    })

    render(<App />)

    fireEvent.change(screen.getByLabelText(/artist/i), { target: { value: 'Camellia' } })
    fireEvent.change(screen.getByLabelText(/creator/i), { target: { value: 'Stanley' } })
    fireEvent.click(await screen.findByRole('button', { name: /start analysis/i }))

    expect((await screen.findAllByText(/117\.45 bpm/i)).length).toBeGreaterThan(0)
    expect(screen.getByText(/4 beats/i)).toBeInTheDocument()
    expect(screen.getByText(/3 onsets/i)).toBeInTheDocument()
    expect(invokeMock).toHaveBeenCalledWith('save_dashboard_history', expect.anything())

    const launchViewerBtn = screen.getByRole('button', { name: /launch interactive beatmap viewer/i })
    fireEvent.click(launchViewerBtn)
    expect(screen.getByTestId('beatmap-canvas')).toBeInTheDocument()
  })

  it('loads a history entry and restores its configuration', async () => {
    ;(window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {}
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'get_backend_url') {
        return 'http://127.0.0.1:8123'
      }
      if (command === 'load_dashboard_history') {
        return [
          {
            id: 'job-1',
            timestamp: '2026-06-12T20:00:00.000Z',
            audioPath: 'C:/Music/anthem.wav',
            audioFileName: 'anthem.wav',
            audioExtension: 'wav',
            metadata: {
              title: 'Anthem',
              artist: 'Camellia',
              creator: 'Stanley',
              intensity: 72,
              backgroundPath: 'C:/Music/bg.png',
            },
            result: {
              tempoBpm: 117.45,
              durationMs: 4000,
              beatCount: 8,
              onsetCount: 12,
            },
          },
        ]
      }
      return undefined
    })
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok', engine: 'Karakuri v1.0' }),
    })
    listenMock.mockResolvedValue(() => undefined)
    onDragDropEventMock.mockResolvedValue(() => undefined)

    render(<App />)

    fireEvent.click(screen.getAllByText(/Analysis History/i)[0])
    fireEvent.click(await screen.findByRole('button', { name: /reuse anthem\.wav/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Anthem')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Camellia')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Stanley')).toBeInTheDocument()
    })
  })
})
