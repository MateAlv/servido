import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AddToOrderButton } from './AddToOrderButton'

describe('AddToOrderButton', () => {
  afterEach(() => vi.useRealTimers())

  it('adds the dish, confirms it and goes back to its label', () => {
    vi.useFakeTimers()
    const onAdd = vi.fn()
    render(<AddToOrderButton onAdd={onAdd} />)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar al pedido' }))

    expect(onAdd).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '¡Agregado!' })).toBeInTheDocument()
    expect(screen.getByText('Plato agregado al pedido')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1600))
    expect(screen.getByRole('button', { name: 'Agregar al pedido' })).toBeInTheDocument()
  })
})
