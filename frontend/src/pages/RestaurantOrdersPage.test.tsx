import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantOrdersPage } from './RestaurantOrdersPage'

const api = vi.hoisted(() => ({
  fetchCurrentShiftOrders: vi.fn(),
  fetchRestaurantOrder: vi.fn(),
}))

vi.mock('../api/restaurantOrders', () => api)

const order = {
  id: 'order-1',
  reservation_id: 'reservation-1',
  arrival_time: '10:00',
  prep_start_time: '09:40',
  prep_time_warning: false,
  items: [{ dish_name: 'Ravioles', quantity: 2, prep_time_minutes: 10 }],
}

describe('RestaurantOrdersPage (US-20)', () => {
  beforeEach(() => {
    api.fetchCurrentShiftOrders.mockResolvedValue({
      shift: { start_time: '08:00', end_time: '13:00' },
      orders: [order],
    })
    api.fetchRestaurantOrder.mockResolvedValue(order)
  })

  it('US-20 S2 shows order summary', async () => {
    renderWithProviders(<RestaurantOrdersPage />)

    expect(await screen.findByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('Reserva reservation-1')).toBeInTheDocument()
    expect(screen.getByText('Ravioles')).toBeInTheDocument()
    expect(screen.getByText('×2')).toBeInTheDocument()
  })

  it('US-20 S4 opens order detail', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantOrdersPage />)

    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await waitFor(() => expect(api.fetchRestaurantOrder).toHaveBeenCalledWith('order-1'))
    expect(await screen.findByRole('heading', { name: 'Detalle del pedido' })).toBeInTheDocument()
  })

  it('shows the empty state when there is no active shift', async () => {
    api.fetchCurrentShiftOrders.mockResolvedValue({ shift: null, orders: [] })
    renderWithProviders(<RestaurantOrdersPage />)

    expect(await screen.findByText('No hay un turno activo en este momento.')).toBeInTheDocument()
  })
})
