import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantReviewsPage } from './RestaurantReviewsPage'

const api = vi.hoisted(() => ({ fetchRestaurantReviews: vi.fn() }))
const session = vi.hoisted(() => ({
  account: { data: { rol: 'restaurant' } as unknown, isPending: false },
}))

vi.mock('../api/reviews', () => api)
vi.mock('../api/session', () => ({
  useAccount: () => session.account,
  signOut: vi.fn(),
}))

const REVIEW = {
  id: 'review-1',
  author: 'Ana P.',
  visit_date: '2026-11-02',
  visit_time: '21:00',
  rating: 5,
  comment: 'Muy rico.',
  spend_per_person: 25000,
  published_at: '2026-11-03T10:00:00-03:00',
  counts_in_average: true,
}

function page(overrides = {}) {
  return {
    rating: 4.5,
    review_count: 3,
    total_reviews: 5,
    price_tier: '$$',
    average_spend_per_person: null,
    spend_people: 0,
    reviews: [REVIEW],
    next_offset: null,
    ...overrides,
  }
}

describe('RestaurantReviewsPage (US-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.account = { data: { rol: 'restaurant' }, isPending: false }
    api.fetchRestaurantReviews.mockResolvedValue(page())
  })

  it('US-24 S1 shows each review with its author, visit, stars, comment and spend', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText('Ana P.')).toBeInTheDocument()
    expect(screen.getByText('Muy rico.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '5 de 5 estrellas' })).toBeInTheDocument()
    expect(screen.getByText(/2 de noviembre a las 21:00/)).toBeInTheDocument()
    expect(screen.getByText(/\$\s?25\.000 por persona/)).toBeInTheDocument()
  })

  it('US-24 S3 shows the average, the people who count and the total', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText('Los comensales ven 4,5 · 3 reseñas.')).toBeInTheDocument()
    expect(screen.getByText(/Recibiste 5 en total/)).toBeInTheDocument()
  })

  it('US-24 S3 marks the older visit that does not count', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ reviews: [REVIEW, { ...REVIEW, id: 'review-2', counts_in_average: false }] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findAllByText(/no cuenta en el promedio/)).toHaveLength(1)
  })

  it('US-7 S5 says where a calculated price tier comes from', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ price_tier: '$$$', average_spend_per_person: 30000, spend_people: 5 }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText(/Tu categoría de precio es \$\$\$/)).toHaveTextContent(
      /gasto medio de 5 comensales, \$\s?30\.000/,
    )
  })

  it('US-7 S4 says nothing about a declared price tier', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    await screen.findByText('Ana P.')
    expect(screen.queryByText(/Tu categoría de precio/)).toBeNull()
  })

  it('US-24 S4 offers no way to change or delete a review', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    await screen.findByText('Ana P.')
    expect(screen.queryByRole('button', { name: /editar|borrar|eliminar/i })).toBeNull()
  })

  it('US-24 S5 sends a diner home and a visitor to sign in', async () => {
    session.account = { data: { rol: 'diner' }, isPending: false }
    const { unmount } = renderWithProviders(<RestaurantReviewsPage />)
    expect(screen.queryByRole('heading', { name: 'Reseñas' })).toBeNull()
    unmount()

    session.account = { data: null, isPending: false }
    renderWithProviders(<RestaurantReviewsPage />)
    expect(screen.queryByRole('heading', { name: 'Reseñas' })).toBeNull()
    expect(api.fetchRestaurantReviews).not.toHaveBeenCalled()
  })

  it('US-24 S7 explains the empty state', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ rating: null, review_count: 0, total_reviews: 0, reviews: [] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText(/Todavía no tenés reseñas/)).toBeInTheDocument()
  })

  it('US-24 S8 loads the next reviews with «Ver más»', async () => {
    api.fetchRestaurantReviews.mockImplementation(async (offset: number) =>
      offset === 0
        ? page({ next_offset: 20 })
        : page({ reviews: [{ ...REVIEW, id: 'review-2', author: 'Beto' }] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText('Viendo 1 de 5.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))

    expect(await screen.findByText('Beto')).toBeInTheDocument()
    expect(screen.getByText('Ana P.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull())
    expect(api.fetchRestaurantReviews).toHaveBeenCalledWith(20)
  })
})
