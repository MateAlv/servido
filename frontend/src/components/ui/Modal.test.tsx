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
})
