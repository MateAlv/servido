import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ToastProvider } from './Toast'
import { useToast } from './useToast'

function Trigger() {
  const toast = useToast()
  return <button onClick={() => toast('Reserva confirmada', { tone: 'ok' })}>Avisar</button>
}

describe('ToastProvider', () => {
  afterEach(() => vi.useRealTimers())

  it('shows a message and removes it after its duration', () => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Avisar' }))
    expect(screen.getByRole('status')).toHaveTextContent('Reserva confirmada')

    act(() => vi.advanceTimersByTime(3200))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
})
