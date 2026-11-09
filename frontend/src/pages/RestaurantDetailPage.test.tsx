import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRestaurant } from '../api/restaurants'
import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantDetailPage } from './RestaurantDetailPage'

vi.mock('../api/restaurants', () => ({ fetchRestaurant: vi.fn() }))
vi.mock('../api/session', () => ({ useAccount: () => ({ data: null }) }))

const restaurant = {
  id: 'real-1',
  name: 'La Mesa',
  description: 'Cocina casera.',
  cuisine: 'Casera',
  averageSpendPerPerson: null,
  priceTier: '$$' as const,
  dietaryRestrictions: [],
  location: { lat: -34.6, lng: -58.4, address: 'Calle 123', neighborhood: 'Centro' },
  occupancy: null,
  menu: [
    {
      category: 'Entradas',
      dishes: [
        {
          id: 'dish-1',
          name: 'Empanada',
          price: 2500,
          description: 'De carne.',
          photo: '/empanada.jpg',
          dietaryRestrictions: ['Sin TACC'],
        },
        {
          id: 'dish-2',
          name: 'Pan',
          price: 1000,
          dietaryRestrictions: [],
        },
      ],
    },
    {
      category: 'Principales',
      dishes: [{ id: 'dish-3', name: 'Milanesa', price: 8500, dietaryRestrictions: [] }],
    },
  ],
  reviews: [],
  photo: null,
  bookable: false,
}

beforeEach(() => {
  vi.mocked(fetchRestaurant).mockResolvedValue(restaurant)
})

describe('RestaurantDetailPage (US-15)', () => {
  it('US-15 S1 shows dish name, description and formatted price', async () => {
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('Empanada')).toBeInTheDocument()
    expect(screen.getByText('De carne.')).toBeInTheDocument()
    expect(screen.getByText(/2\.500/)).toBeInTheDocument()
  })

  it('US-15 S2 renders only dishes returned as available by the API', async () => {
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('Empanada')).toBeInTheDocument()
    expect(screen.queryByText('Agotado')).not.toBeInTheDocument()
  })

  it('US-15 S3 shows category headings in fixed order', async () => {
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    await screen.findByText('Empanada')
    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(headings).toEqual(['Entradas', 'Principales'])
  })

  it('US-15 S4 opens a photo and closes with button or Escape; no photo shows fallback', async () => {
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    fireEvent.click(await screen.findByRole('button', { name: /Empanada/ }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Foto de Empanada' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /Pan/ }))
    expect(screen.getByText('Sin foto')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('RestaurantDetailPage (spec 014)', () => {
  const real = { ...restaurant, bookable: true }

  it('US-27 S11 shows the average next to the count', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({ ...real, rating: 4.5, reviewCount: 3 })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('3 reseñas')).toBeInTheDocument()
    expect(screen.getByText('4,5')).toBeInTheDocument()
  })

  it('US-27 S11 keeps the decimal of a whole average', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({ ...real, rating: 4, reviewCount: 1 })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('4,0')).toBeInTheDocument()
  })

  it('US-27 S13 shows nothing about reviews when there are none', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({ ...real, rating: null, reviewCount: 0 })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    await screen.findByText('Empanada')
    expect(screen.queryByText(/reseña/)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Opiniones' })).not.toBeInTheDocument()
  })

  it('US-50 S8 shows the opinion with its author, visit and spend', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      rating: 5,
      reviewCount: 1,
      reviews: [
        {
          author: 'Juan P.',
          rating: 5,
          comment: 'Muy rico.',
          date: '2026-11-02',
          spendPerPerson: 25000,
        },
      ],
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByRole('heading', { name: 'Opiniones' })).toBeInTheDocument()
    expect(screen.getByText('Juan P.')).toBeInTheDocument()
    expect(screen.getByText('Muy rico.')).toBeInTheDocument()
    expect(screen.getByText(/2 de noviembre/)).toBeInTheDocument()
    expect(screen.getByText(/\$\s?25\.000 por persona/)).toBeInTheDocument()
    expect(screen.queryByText(/No todos dejan comentario/)).not.toBeInTheDocument()
  })

  function opinions(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      author: `Persona ${index}`,
      rating: 5,
      comment: 'Muy rico.',
      date: '2026-11-02',
    }))
  }

  it('US-50 S11 explains why the list is shorter than the count', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      rating: 4,
      reviewCount: 7,
      reviews: opinions(4),
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(
      await screen.findByText('4 comentarios de 7 reseñas. No todos dejan comentario.'),
    ).toBeInTheDocument()
  })

  it('US-50 S8 shows 5 opinions at first and the rest on demand', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      rating: 5,
      reviewCount: 7,
      reviews: opinions(7),
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findAllByRole('article', { name: /Reseña de/ })).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Ver más opiniones (2)' }))
    expect(screen.getAllByRole('article', { name: /Reseña de/ })).toHaveLength(7)
    expect(screen.queryByRole('button', { name: /Ver más opiniones/ })).not.toBeInTheDocument()
  })

  it('US-50 S8 shortens a long comment until asked', async () => {
    const long = `${'palabra '.repeat(50)}final`
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      rating: 5,
      reviewCount: 1,
      reviews: [{ author: 'Juan P.', rating: 5, comment: long, date: '2026-11-02' }],
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByRole('button', { name: 'Leer más' })).toBeInTheDocument()
    expect(screen.queryByText(/final/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Leer más' }))
    expect(screen.getByText(/final/)).toBeInTheDocument()
  })

  it('US-50 S11 counts a review without comment, with no section for it', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({ ...real, rating: 4, reviewCount: 1 })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('1 reseña')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Opiniones' })).not.toBeInTheDocument()
  })

  it('US-7 S5 shows the calculated tier with its average spend', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      priceTier: '$$$',
      averageSpendPerPerson: 30000,
      spendPeople: 5,
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('$$$')).toBeInTheDocument()
    expect(screen.getByText(/30\.000 por persona, según 5 comensales/)).toBeInTheDocument()
  })
})
