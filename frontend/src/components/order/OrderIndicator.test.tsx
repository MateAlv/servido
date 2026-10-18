import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OrderIndicator } from './OrderIndicator'

describe('OrderIndicator', () => {
  it('says how many dishes the order has', () => {
    const { rerender } = render(<OrderIndicator count={1} />)
    expect(screen.getByRole('button', { name: 'Tu pedido: 1 plato' })).toBeInTheDocument()

    rerender(<OrderIndicator count={3} />)
    expect(screen.getByRole('button', { name: 'Tu pedido: 3 platos' })).toHaveTextContent('3')
  })
})
