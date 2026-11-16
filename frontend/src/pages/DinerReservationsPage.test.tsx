import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { DinerReservationsPage } from './DinerReservationsPage'

const reservationsApi = vi.hoisted(() => ({
  fetchActiveReservations: vi.fn(),
  cancelReservation: vi.fn(),
}))

vi.mock('../api/reservations', () => reservationsApi)

const reservation = {
  id: 'reservation-1',
  restaurant: { id: 'restaurant-1', nombre: 'La Esquina' },
  date: '2026-11-03',
  start_time: '20:00',
  end_time: '21:30',
  party_size: 3,
  table: { capacity: 4, seating_area: 'terrace' as const },
  status: 'confirmed',
  has_order: false,
  has_cart: false,
  order_open: false,
  order_deadline: '2026-11-03T19:15:00-03:00',
}

describe('DinerReservationsPage', () => {
  beforeEach(() => {
    reservationsApi.fetchActiveReservations.mockResolvedValue([reservation])
    reservationsApi.cancelReservation.mockResolvedValue({
      ok: true,
      cancellation: {
        reservation,
        message: 'La reserva se canceló correctamente.',
      },
    })
  })

  it('US-23 S2 shows reservation detail', async () => {
    renderWithProviders(<DinerReservationsPage />)

    fireEvent.click(await screen.findByRole('button', { name: /La Esquina/ }))

    expect(screen.getByText('Mesa para 4 · Terraza')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getAllByText(/martes, 3 de noviembre/)).toHaveLength(2)
  })

  it('US-23 S4 reports no active reservations', async () => {
    reservationsApi.fetchActiveReservations.mockResolvedValue([])
    renderWithProviders(<DinerReservationsPage />)

    expect(await screen.findByText('No tenés reservas activas.')).toBeInTheDocument()
  })

  it('US-25 S1 asks before cancelling and US-25 S2 keeps it after dismissal', async () => {
    renderWithProviders(<DinerReservationsPage />)
    fireEvent.click(await screen.findByRole('button', { name: /La Esquina/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))

    expect(screen.getByText('¿Cancelar reserva?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'No, volver' }))

    expect(reservationsApi.cancelReservation).not.toHaveBeenCalled()
    expect(screen.getAllByText('La Esquina')).toHaveLength(2)
  })

  it('US-25 S4 reports successful cancellation', async () => {
    renderWithProviders(<DinerReservationsPage />)
    fireEvent.click(await screen.findByRole('button', { name: /La Esquina/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar reserva' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))

    await waitFor(() =>
      expect(reservationsApi.cancelReservation).toHaveBeenCalledWith('reservation-1'),
    )
    expect(await screen.findByText('La reserva se canceló correctamente.')).toBeInTheDocument()
  })
})
