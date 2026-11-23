import { Route, Routes } from 'react-router'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { CancelledReservationPage } from './CancelledReservationPage'

const reservationsApi = vi.hoisted(() => ({
  fetchCancelledReservation: vi.fn(),
}))

vi.mock('../api/reservations', () => reservationsApi)

const baseReservation = {
  id: 'reservation-1',
  restaurant: { id: 'restaurant-1', nombre: 'La Esquina' },
  date: '2026-11-03',
  start_time: '20:00',
  end_time: '21:30',
  party_size: 2,
  table: { capacity: 4, seating_area: 'terrace' as const },
  cancelled_by: 'diner',
  cancelled_at: '2026-11-02T12:00:00-03:00',
  refund_status: null,
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/reservas/canceladas/:reservationId" element={<CancelledReservationPage />} />
    </Routes>,
    { route: '/reservas/canceladas/reservation-1' },
  )
}

describe('CancelledReservationPage (US-49)', () => {
  beforeEach(() => {
    reservationsApi.fetchCancelledReservation.mockResolvedValue(baseReservation)
  })

  it('US-49 S2 shows who cancelled', async () => {
    renderDetail()

    expect(await screen.findByText('Cancelada por vos')).toBeInTheDocument()
  })

  it('US-49 S3 hides refund when there was no payment', async () => {
    renderDetail()

    expect(await screen.findByText('La Esquina')).toBeInTheDocument()
    expect(screen.queryByText('Reembolso pendiente')).not.toBeInTheDocument()
  })

  it('US-49 S3 shows refund pending when a paid order existed', async () => {
    reservationsApi.fetchCancelledReservation.mockResolvedValue({
      ...baseReservation,
      cancelled_by: 'restaurant',
      refund_status: 'pending',
    })
    renderDetail()

    expect(await screen.findByText('Cancelada por el restaurante')).toBeInTheDocument()
    expect(screen.getByText('Reembolso pendiente')).toBeInTheDocument()
  })

  it('US-56 edge says the payment was returned once the refund completed', async () => {
    reservationsApi.fetchCancelledReservation.mockResolvedValue({
      ...baseReservation,
      refund_status: 'completed',
      refund_amount: '8280.00',
    })
    renderDetail()

    expect(await screen.findByText('Te devolvimos el pago')).toBeInTheDocument()
    expect(screen.getByText(/a tu tarjeta/)).toHaveTextContent('8.280')
    expect(screen.queryByText('Reembolso pendiente')).not.toBeInTheDocument()
  })
})
