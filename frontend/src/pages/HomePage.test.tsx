import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { HomePage } from './HomePage'

vi.mock('../api/client', () => ({ api: { GET: vi.fn().mockResolvedValue({ data: {} }) } }))

describe('HomePage', () => {
  it('shows the promise of the product', () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Llegá y que la mesa ya esté servida',
    )
  })

  it('changes its calls to action for restaurants', () => {
    renderWithProviders(<HomePage />)

    fireEvent.click(screen.getByRole('radio', { name: 'Soy restaurante' }))

    expect(screen.getByRole('button', { name: 'Sumar mi local' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buscar mesa' })).not.toBeInTheDocument()
  })
})
