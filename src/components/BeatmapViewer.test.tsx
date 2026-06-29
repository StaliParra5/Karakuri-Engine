import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BeatmapViewer } from './BeatmapViewer'

describe('BeatmapViewer', () => {
  it('renders canvas field and handles controls properly', () => {
    const mockObjects = [
      { time_ms: 100, x: 256, y: 192, object_type: 1 },
      { time_ms: 600, x: 100, y: 100, object_type: 2, slider_end_x: 200, slider_end_y: 200 },
    ]
    const onCloseMock = vi.fn()

    render(<BeatmapViewer objects={mockObjects} tempoBpm={120.0} onClose={onCloseMock} />)

    expect(screen.getByText(/Previsualizador.*Beatmap/i)).toBeInTheDocument()
    const canvas = screen.getByTestId('beatmap-canvas')
    expect(canvas).toBeInTheDocument()
    expect(canvas).toHaveAttribute('width', '512')
    expect(canvas).toHaveAttribute('height', '384')

    // Click play/pause button
    const playButton = screen.getAllByRole('button')[1] // 0 is close X, 1 is play
    fireEvent.click(playButton)

    // Click close button
    const closeButton = screen.getAllByRole('button')[0]
    fireEvent.click(closeButton)
    expect(onCloseMock).toHaveBeenCalled()
  })

  it('renders Kiai badge and repackage button when enabled', () => {
    const mockObjects = [{ time_ms: 100, x: 256, y: 192, object_type: 1 }]
    render(
      <BeatmapViewer
        objects={mockObjects}
        tempoBpm={120.0}
        kiaiRanges={[[0, 1000]]}
        backendUrl="http://localhost:8000"
        onClose={vi.fn()}
      />
    )
    expect(screen.getByText('KIAI ENABLED')).toBeInTheDocument()
    expect(screen.getByText('Re-empaquetar .osz')).toBeInTheDocument()
  })
})
