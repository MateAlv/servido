import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantReservationDinerPage } from './RestaurantReservationDinerPage'

const api = vi.hoisted(() => ({
  fetchReservationDiner: vi.fn(),
  fetchReservationOrder: vi.fn(),
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
    api.fetchReservationOrder.mockResolvedValue({
      reservation_status: 'confirmed',
      order: null,
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

  it('US-36 S1 shows the confirmed order items and total', async () => {
    api.fetchReservationOrder.mockResolvedValue({
      reservation_status: 'confirmed',
      order: {
        items: [{ dish_name: 'Ravioles', quantity: 2, subtotal: '24000.00' }],
        payment: { total: '24000.00' },
      },
    })
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(await screen.findByText('Ravioles × 2')).toBeInTheDocument()
    expect(screen.getAllByText(/24\.000/)).toHaveLength(2)
    expect(screen.queryByText(/medio de pago|cocina|llegada/i)).not.toBeInTheDocument()
  })

  it('US-36 S2 says when a confirmed reservation has no order', async () => {
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(
      await screen.findByText('Esta reserva no tiene pedido anticipado confirmado.'),
    ).toBeInTheDocument()
  })

  it('US-36 S4 treats an unconfirmed order as missing', async () => {
    api.fetchReservationOrder.mockResolvedValue({
      reservation_status: 'confirmed',
      order: null,
    })
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(
      await screen.findByText('Esta reserva no tiene pedido anticipado confirmado.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Pedido confirmado|Ravioles ×/)).not.toBeInTheDocument()
  })

  it('keeps diner contact visible when the order request fails', async () => {
    api.fetchReservationOrder.mockRejectedValue(new Error('No pudimos ver el pedido.'))
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos ver el pedido.')
  })

  it('US-36 S3 says a cancelled reservation cancelled its order', async () => {
    api.fetchReservationOrder.mockResolvedValue({
      reservation_status: 'cancelled',
      order: {
        items: [{ dish_name: 'Ravioles', quantity: 2, subtotal: '24000.00' }],
        payment: { total: '24000.00' },
      },
    })
    renderWithProviders(<RestaurantReservationDinerPage />)

    expect(
      await screen.findByText('La reserva está cancelada: su pedido también se canceló.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Ravioles × 2')).not.toBeInTheDocument()
  })
})
