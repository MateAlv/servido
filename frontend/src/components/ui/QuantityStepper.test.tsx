import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { QuantityStepper } from './QuantityStepper'

describe('QuantityStepper', () => {
  it('adds and removes one unit', () => {
    const onChange = vi.fn()
    render(<QuantityStepper label="Cantidad" value={2} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Agregar uno' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar uno' }))

    expect(onChange.mock.calls).toEqual([[3], [1]])
  })

  it('cannot go below the minimum or above the maximum', () => {
    const { rerender } = render(
      <QuantityStepper label="Cantidad" value={1} min={1} max={3} onChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Quitar uno' })).toBeDisabled()

    rerender(<QuantityStepper label="Cantidad" value={3} min={1} max={3} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Agregar uno' })).toBeDisabled()
  })
})
