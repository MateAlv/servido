import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantReservationsPage } from './RestaurantReservationsPage'

const reservationsApi = vi.hoisted(() => ({
  fetchRestaurantReservations: vi.fn(),
  cancelRestaurantReservation: vi.fn(),
}))
const configurationApi = vi.hoisted(() => ({
  getHours: vi.fn(),
}))

vi.mock('../api/restaurantReservations', () => reservationsApi)
vi.mock('../api/restaurantConfiguration', () => ({ configurationApi }))

describe('RestaurantReservationsPage (US-14)', () => {
  beforeEach(() => {
    reservationsApi.cancelRestaurantReservation.mockResolvedValue({
      reservation_id: 'reservation-id',
      status: 'cancelled',
      message: 'La reserva se canceló y el reembolso se completó correctamente.',
      refund: { status: 'completed', amount: '12500.00', method: 'online' },
      notification_created: true,
    })
    reservationsApi.fetchRestaurantReservations.mockResolvedValue({
      restaurant_id: 'restaurant-id',
      date: '2026-10-29',
      reservations: [
        {
          id: 'reservation-id',
          start_time: '20:00',
          end_time: '21:30',
          party_size: 3,
          table: { capacity: 4, seating_area: 'terrace' },
          status: 'confirmed',
        },
      ],
    })
    configurationApi.getHours.mockResolvedValue([
      { day_of_week: 4, start_time: '20:00', end_time: '23:30', active: true },
    ])
  })

  it('US-14 S2 shows time, table, party size, status and the reservation code', async () => {
    renderWithProviders(<RestaurantReservationsPage />)

    expect(await screen.findByText('20:00 a 21:30')).toBeInTheDocument()
    expect(screen.getByText('RESERVAT')).toBeInTheDocument()
    expect(screen.getByText('Mesa para 4 · Terraza')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
  })

  it('US-14 S1 groups a reservation that starts with the shift under that shift', async () => {
    configurationApi.getHours.mockResolvedValue(
      [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        day_of_week: day,
        start_time: '20:00:00',
        end_time: '23:30:00',
        active: true,
      })),
    )
    renderWithProviders(<RestaurantReservationsPage />)

    expect(
      await screen.findByRole('heading', { name: 'Turno de 20:00 a 23:30' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Otros horarios' })).not.toBeInTheDocument()
  })

  it('US-14 S4 changes the selected date', async () => {
    renderWithProviders(<RestaurantReservationsPage />)

    const dateInput = await screen.findByLabelText('Fecha de reservas')
    fireEvent.change(dateInput, { target: { value: '2026-10-30' } })

    await waitFor(() =>
      expect(reservationsApi.fetchRestaurantReservations).toHaveBeenLastCalledWith('2026-10-30'),
    )
  })

  it('US-14 S4 names the selected day once', async () => {
    renderWithProviders(<RestaurantReservationsPage />)

    fireEvent.change(await screen.findByLabelText('Fecha de reservas'), {
      target: { value: '2026-11-23' },
    })

    expect(
      await screen.findByRole('heading', { name: 'lunes, 23 de noviembre' }),
    ).toBeInTheDocument()
  })

  it('US-38 S2 reports cancellation and refund success', async () => {
    renderWithProviders(<RestaurantReservationsPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar reserva' }))
    expect(
      await screen.findByRole('heading', { name: 'Confirmar cancelación' }),
    ).toBeInTheDocument()
    expect(reservationsApi.cancelRestaurantReservation).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelación' }))
    await waitFor(() =>
      expect(
        screen.getByText('La reserva se canceló y el reembolso se completó correctamente.'),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
  })
})
