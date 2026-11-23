import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Modal } from './Modal'

describe('Modal', () => {
  it('opens with its title and asks to close from the close button', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Cancelar reserva">
        <p>Podés cancelar sin costo.</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog', { name: 'Cancelar reserva' })).toHaveAttribute('open')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on a click on the backdrop but not after a press that started inside', () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Pagar el pedido">
        <p>Tarjeta de crédito o débito</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Pagar el pedido' })

    fireEvent.mouseDown(screen.getByText('Tarjeta de crédito o débito'))
    fireEvent.click(dialog)
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(dialog)
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('says when it finished closing, so the page can take the focus back', () => {
    const onClosed = vi.fn()
    const { rerender } = render(
      <Modal open onClose={vi.fn()} onClosed={onClosed} title="Cancelar reserva">
        <p>Podés cancelar sin costo.</p>
      </Modal>,
    )
    rerender(
      <Modal open={false} onClose={vi.fn()} onClosed={onClosed} title="Cancelar reserva">
        <p>Podés cancelar sin costo.</p>
      </Modal>,
    )
    expect(onClosed).not.toHaveBeenCalled()

    fireEvent.animationEnd(screen.getByRole('dialog', { hidden: true }))

    expect(onClosed).toHaveBeenCalledOnce()
  })
})
