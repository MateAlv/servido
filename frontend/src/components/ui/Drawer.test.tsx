import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('opens with its title and footer and closes from the button, Escape or the backdrop', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="Filtros" footer={<button>Ver resultados</button>}>
        <p>Precio</p>
      </Drawer>,
    )

    const drawer = screen.getByRole('dialog', { name: 'Filtros' })
    expect(drawer).toHaveAttribute('open')
    expect(screen.getByRole('button', { name: 'Ver resultados' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.keyDown(drawer, { key: 'Escape' })
    fireEvent.click(drawer)
    fireEvent.click(screen.getByText('Precio'))

    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('closes after its exit animation', () => {
    const { rerender } = render(
      <Drawer open onClose={vi.fn()} title="Filtros">
        <p>Precio</p>
      </Drawer>,
    )
    const drawer = screen.getByRole('dialog', { name: 'Filtros' })

    rerender(
      <Drawer open={false} onClose={vi.fn()} title="Filtros">
        <p>Precio</p>
      </Drawer>,
    )
    expect(drawer).toHaveAttribute('data-closing')
    fireEvent.animationEnd(drawer)

    expect(drawer).not.toHaveAttribute('open')
    expect(drawer).not.toHaveAttribute('data-closing')
  })
})
