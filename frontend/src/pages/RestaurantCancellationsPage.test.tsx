import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantCancellationsPage } from './RestaurantCancellationsPage'

const api = vi.hoisted(() => ({
  fetchRestaurantCancellations: vi.fn(),
}))

vi.mock('../api/restaurantReservations', () => api)

describe('RestaurantCancellationsPage (US-18)', () => {
  beforeEach(() => {
    api.fetchRestaurantCancellations.mockResolvedValue({
      restaurant_id: 'restaurant-id',
      date: '2026-11-02',
      cancellations: [
        {
          reservation_id: 'reservation-id',
          reservation_date: '2026-11-02',
          start_time: '20:00',
          end_time: '21:30',
          party_size: 3,
          table: { capacity: 4, seating_area: 'terrace' },
          status: 'cancelled',
          cancelled_at: '2026-11-01T18:00:00-03:00',
          preordered_order: null,
        },
      ],
    })
  })

  it('US-18 S1 lists cancelled reservations and shows the cancelled state', async () => {
    renderWithProviders(<RestaurantCancellationsPage />)

    expect(await screen.findByText('Cancelada')).toBeInTheDocument()
    expect(screen.getByText('20:00 a 21:30')).toBeInTheDocument()
    expect(screen.getByText('Mesa para 4 · Terraza')).toBeInTheDocument()
  })

  it('US-18 S4 filters cancellations by date', async () => {
    renderWithProviders(<RestaurantCancellationsPage />)

    const dateInput = await screen.findByLabelText('Fecha de cancelaciones')
    fireEvent.change(dateInput, { target: { value: '2026-11-03' } })

    await waitFor(() =>
      expect(api.fetchRestaurantCancellations).toHaveBeenLastCalledWith('2026-11-03'),
    )
  })
})
