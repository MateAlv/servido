import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { PromotionsPage } from './PromotionsPage'

const api = vi.hoisted(() => ({
  fetchPromotions: vi.fn(),
  changePromotionState: vi.fn(),
  createPromotion: vi.fn(),
  updatePolicy: vi.fn(),
  updatePromotion: vi.fn(),
}))

vi.mock('../api/promotions', () => api)
vi.mock('../api/session', () => ({
  useAccount: () => ({
    data: {
      rol: 'restaurant',
      id: 'restaurant-1',
      nombre: 'La Esquina',
      email: 'restaurante@example.com',
      email_verificado: true,
    },
  }),
}))

const promotion = {
  id: 'promotion-1',
  name: '20% los martes',
  description: null,
  discount_type: 'percentage' as const,
  discount_value: '20.00',
  minimum_amount: null,
  starts_on: null,
  ends_on: null,
  weekdays: [2],
  start_time: '20:00:00',
  end_time: '23:00:00',
  active: true,
  stackable: true,
  state: 'active' as const,
}

describe('PromotionsPage (US-48)', () => {
  beforeEach(() => {
    api.fetchPromotions.mockResolvedValue({
      stack_promotions: false,
      promotions: [promotion],
    })
    api.changePromotionState.mockResolvedValue({ ...promotion, active: false, state: 'paused' })
  })

  it('US-48 S3 lists the discount, validity and state', async () => {
    renderWithProviders(<PromotionsPage />)

    expect(await screen.findByText('20% los martes')).toBeVisible()
    expect(screen.getByText('20.00% de descuento')).toBeVisible()
    expect(screen.getByText('los Mar · de 20:00:00 a 23:00:00')).toBeVisible()
    expect(screen.getByText('Activa')).toBeVisible()
  })

  it('US-48 S4 pauses an existing promotion', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PromotionsPage />)

    await user.click(await screen.findByRole('button', { name: 'Pausar' }))

    await waitFor(() => expect(api.changePromotionState).toHaveBeenCalledWith('promotion-1', false))
  })

  it('US-48 S1 shows creation as an in-page editor instead of a popup', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PromotionsPage />)

    await user.click(await screen.findByRole('button', { name: 'Nueva promoción' }))

    expect(screen.getByRole('heading', { name: 'Crear promoción' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('US-48 S4 shows editing as an in-page editor', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PromotionsPage />)

    await user.click(await screen.findByRole('button', { name: 'Editar' }))

    expect(screen.getByRole('heading', { name: '20% los martes' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
