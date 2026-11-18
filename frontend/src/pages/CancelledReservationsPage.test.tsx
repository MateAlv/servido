import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { CancelledReservationsPage } from './CancelledReservationsPage'

const reservationsApi = vi.hoisted(() => ({
  fetchCancelledReservations: vi.fn(),
}))

vi.mock('../api/reservations', () => reservationsApi)

describe('CancelledReservationsPage (US-49)', () => {
  beforeEach(() => {
    reservationsApi.fetchCancelledReservations.mockResolvedValue([
      {
        id: 'reservation-1',
        restaurant: { id: 'restaurant-1', nombre: 'La Esquina' },
        date: '2026-11-03',
        start_time: '20:00',
        end_time: '21:30',
        party_size: 2,
        table: { capacity: 4, seating_area: 'terrace' },
        cancelled_by: 'diner',
        cancelled_at: '2026-11-02T12:00:00-03:00',
        refund_status: null,
      },
    ])
  })

  it('US-49 S1 lists cancelled reservations', async () => {
    renderWithProviders(<CancelledReservationsPage />)

    expect(await screen.findByText('La Esquina')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/reservas/canceladas/reservation-1',
    )
  })

  it('US-49 S1 shows the empty state', async () => {
    reservationsApi.fetchCancelledReservations.mockResolvedValue([])
    renderWithProviders(<CancelledReservationsPage />)

    expect(await screen.findByText('No tenés reservas canceladas.')).toBeInTheDocument()
  })
})
