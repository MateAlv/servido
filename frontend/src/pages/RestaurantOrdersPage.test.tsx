import { screen, waitFor, within } from '@testing-library/react'
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
  items: [
    {
      dish_name: 'Ravioles',
      quantity: 2,
      prep_time_minutes: 10,
      unit_price: '100.10',
      subtotal: '200.20',
    },
  ],
  payment: { status: 'pending', method: 'No seleccionado', total: '200.20' },
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

  it('US-20 S4 opens and closes order detail', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantOrdersPage />)

    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))

    await waitFor(() => expect(api.fetchRestaurantOrder).toHaveBeenCalledWith('order-1'))

    expect(await screen.findByRole('heading', { name: 'Detalle del pedido' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ocultar detalle' }))

    expect(screen.queryByRole('heading', { name: 'Detalle del pedido' })).not.toBeInTheDocument()

    expect(screen.getByRole('button', { name: 'Ver detalle' })).toBeVisible()
    expect(api.fetchRestaurantOrder).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when there is no active shift', async () => {
    api.fetchCurrentShiftOrders.mockResolvedValue({ shift: null, orders: [] })
    renderWithProviders(<RestaurantOrdersPage />)

    expect(await screen.findByText('No hay un turno activo en este momento.')).toBeInTheDocument()
  })
})

describe('RestaurantOrdersPage (US-22)', () => {
  beforeEach(() => {
    api.fetchCurrentShiftOrders.mockResolvedValue({
      shift: { start_time: '08:00', end_time: '13:00' },
      orders: [order],
    })
    api.fetchRestaurantOrder.mockResolvedValue(order)
  })

  it('US-22 S1 shows pending payment independently of order confirmation', async () => {
    renderWithProviders(<RestaurantOrdersPage />)
    expect(await screen.findByText('Pendiente de pago')).toBeVisible()
    expect(screen.queryByText('Pagado')).not.toBeInTheDocument()
  })

  it('US-22 S2 shows total and breakdown with taxes included', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantOrdersPage />)
    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    const detail = await screen.findByRole('region', { name: 'Detalle del pedido' })
    expect(within(detail).getByRole('list', { name: 'Desglose del pedido' })).toBeVisible()
    for (const text of [
      'Ravioles',
      'Cantidad: 2',
      /Precio unitario: \$\s*100,10/,
      /Subtotal: \$\s*200,20/,
      /Total: \$\s*200,20/,
      'Impuestos incluidos',
    ]) {
      expect(within(detail).getByText(text)).toBeVisible()
    }
  })

  it('US-22 S7 distinguishes payment states returned by the API with text and shapes', async () => {
    api.fetchCurrentShiftOrders.mockResolvedValue({
      shift: { start_time: '08:00', end_time: '13:00' },
      orders: [
        order,
        { ...order, id: 'paid-order', payment: { ...order.payment, status: 'paid' } },
      ],
    })
    renderWithProviders(<RestaurantOrdersPage />)
    const pending = await screen.findByText('Pendiente de pago')
    const paid = screen.getByText('Pagado')
    expect(pending).toBeVisible()
    expect(paid).toBeVisible()
    expect(pending.querySelector('[aria-hidden="true"]')).toHaveTextContent('▲')
    expect(paid.querySelector('[aria-hidden="true"]')).toHaveTextContent('●')
  })

  it('US-22 S3 shows no selected payment method and no collection actions', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantOrdersPage />)
    await user.click(await screen.findByRole('button', { name: 'Ver detalle' }))
    expect(await screen.findByText('Medio de pago: No seleccionado')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /cobrar|confirmar pago|registrar cobro/i }),
    ).not.toBeInTheDocument()
  })
})
