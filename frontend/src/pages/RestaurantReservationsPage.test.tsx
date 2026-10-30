import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantReservationsPage } from './RestaurantReservationsPage'

const reservationsApi = vi.hoisted(() => ({
  fetchRestaurantReservations: vi.fn(),
}))
const configurationApi = vi.hoisted(() => ({
  getHours: vi.fn(),
}))

vi.mock('../api/restaurantReservations', () => reservationsApi)
vi.mock('../api/restaurantConfiguration', () => ({ configurationApi }))

describe('RestaurantReservationsPage (US-14)', () => {
  beforeEach(() => {
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

  it('US-14 S2 shows time, table, party size and status', async () => {
    renderWithProviders(<RestaurantReservationsPage />)

    expect(await screen.findByText('20:00 a 21:30')).toBeInTheDocument()
    expect(screen.getByText('Mesa para 4 · Terraza')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Confirmada')).toBeInTheDocument()
  })

  it('US-14 S4 changes the selected date', async () => {
    renderWithProviders(<RestaurantReservationsPage />)

    const dateInput = await screen.findByLabelText('Fecha de reservas')
    fireEvent.change(dateInput, { target: { value: '2026-10-30' } })

    await waitFor(() =>
      expect(reservationsApi.fetchRestaurantReservations).toHaveBeenLastCalledWith('2026-10-30'),
    )
  })
})
