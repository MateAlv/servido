import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ClockDialog } from './ClockDialog'

const ALL_DAY = Array.from({ length: 48 }, (_, index) =>
  [Math.floor(index / 2), (index % 2) * 30].map((part) => String(part).padStart(2, '0')).join(':'),
)

function renderClock(value: string, selectable = ALL_DAY) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  render(
    <ClockDialog
      open
      title="Llegar desde"
      value={value}
      selectable={selectable}
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  )
  const clock = screen.getByRole('dialog', { name: 'Llegar desde' })
  return {
    onConfirm,
    onClose,
    button: (name: string) => within(clock).getByRole('button', { name }),
  }
}

describe('ClockDialog', () => {
  it('chooses the hour, then the minutes, and confirms', () => {
    const { onConfirm, button } = renderClock('20:00')

    fireEvent.click(button('Las 13'))
    fireEvent.click(button('Y media'))
    fireEvent.click(button('Listo'))

    expect(onConfirm).toHaveBeenCalledWith('13:30')
  })

  it('offers only :00 and :30', () => {
    const { button } = renderClock('20:00')

    fireEvent.click(button('Minutos: 00. Cambiar los minutos'))

    expect(button('En punto')).toBeInTheDocument()
    expect(button('Y media')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /15/ })).not.toBeInTheDocument()
  })

  it('disables what cannot be chosen and moves to the half hour that can', () => {
    const { onConfirm, button } = renderClock(
      '20:00',
      ALL_DAY.filter((hour) => hour > '19:10'),
    )

    expect(button('Las 18')).toBeDisabled()
    fireEvent.click(button('Las 19'))
    expect(button('En punto')).toBeDisabled()
    fireEvent.click(button('Listo'))

    expect(onConfirm).toHaveBeenCalledWith('19:30')
  })

  it('closes without choosing', () => {
    const { onConfirm, onClose, button } = renderClock('20:00')

    fireEvent.click(button('Cancelar'))

    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
