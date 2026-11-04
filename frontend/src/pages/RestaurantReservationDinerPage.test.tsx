import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantReservationDinerPage } from './RestaurantReservationDinerPage'

const api = vi.hoisted(() => ({
  fetchReservationDiner: vi.fn(),
}))

vi.mock('../api/restaurantReservations', () => api)
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router')
  return { ...actual, useParams: () => ({ reservationId: 'reservation-id' }) }
})

describe('RestaurantReservationDinerPage (US-16)', () => {
  beforeEach(() => {
    api.fetchReservationDiner.mockResolvedValue({
      reservation_id: 'reservation-id',
      diner: { id: 'diner-id', name: 'Ana Pérez', email: 'ana@example.com' },
    })
  })

  it('US-16 S1 shows the diner contact projection', async () => {
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(screen.queryByText('password_hash')).not.toBeInTheDocument()
  })

  it('US-16 S2 hides contact data for a foreign reservation', async () => {
    api.fetchReservationDiner.mockRejectedValue(new Error('La reserva no existe.'))
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('La reserva no existe.')
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument()
  })
})
