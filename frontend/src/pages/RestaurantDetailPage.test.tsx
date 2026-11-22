import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
  promotions: [],
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

  describe('RestaurantDetailPage (US-55)', () => {
    it('US-55 S1 shows active promotions and conditions', async () => {
      vi.mocked(fetchRestaurant).mockResolvedValue({
        ...restaurant,
        promotions: [
          {
            name: 'Martes al mediodía',
            description: 'Para disfrutar el menú del día',
            discountType: 'percentage',
            discountValue: '20.00',
            minimumAmount: null,
            startsOn: '2026-11-01',
            endsOn: '2026-12-31',
            weekdays: [2],
            startTime: '12:00:00',
            endTime: '15:00:00',
          },
        ],
      })
      renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

      expect(await screen.findByText('Martes al mediodía')).toBeInTheDocument()
      expect(screen.getByText('20.00% de descuento')).toBeInTheDocument()
      expect(screen.getByText(/los martes/)).toBeInTheDocument()
    })
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

  it('US-57 S4 displays photos and S6 renders a photo-only opinion', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      reviewCount: 1,
      reviews: [
        {
          author: 'Ana P.',
          rating: 5,
          comment: null,
          date: '2026-11-02',
          photos: [{ id: 'photo', url: '/api/review-photos/photo' }],
        },
      ],
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })
    expect(await screen.findByRole('img', { name: 'Foto 1 de la reseña' })).toHaveAttribute(
      'src',
      '/api/review-photos/photo',
    )
  })

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

  function withReply(edited: boolean, text = 'Ya ajustamos la cocina.') {
    return {
      ...real,
      rating: 2,
      reviewCount: 1,
      reviews: [
        {
          author: 'Juan P.',
          rating: 2,
          comment: 'Tardaron mucho.',
          date: '2026-11-02',
          reply: { text, date: '2026-11-04', edited },
        },
      ],
    }
  }

  it("US-42 S2 shows the reply under its opinion as the restaurant's", async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue(withReply(false))
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    const opinion = await screen.findByRole('article', { name: 'Reseña de Juan P.' })
    const reply = within(opinion).getByRole('group', { name: 'Respuesta de La Mesa' })
    expect(reply).toHaveTextContent('Ya ajustamos la cocina.')
    expect(reply).toHaveTextContent('Respondió el miércoles, 4 de noviembre')
    expect(within(reply).queryByText('Editada')).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Respuesta de La Mesa' })).toBeNull()
  })

  it('US-42 S2 shortens a long reply until asked, so it stays below the review', async () => {
    const long = `${'Gracias por venir y por contarnos cómo fue la noche. '.repeat(4)}Final.`
    vi.mocked(fetchRestaurant).mockResolvedValue(withReply(false, long))
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    const reply = await screen.findByRole('group', { name: 'Respuesta de La Mesa' })
    expect(reply).not.toHaveTextContent('Final.')
    const toggle = within(reply).getByRole('button', { name: 'Leer más' })
    const controlled = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(controlled).not.toHaveTextContent('Final.')
    toggle.focus()
    fireEvent.click(toggle)
    expect(controlled).toHaveTextContent('Final.')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(reply).getByRole('button', { name: 'Ver menos' })).toHaveFocus()

    fireEvent.click(toggle)
    expect(reply).not.toHaveTextContent('Final.')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(reply).getByRole('button', { name: 'Leer más' })).toHaveFocus()
  })

  it('US-42 S4 marks an edited reply', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue(withReply(true))
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    const reply = await screen.findByRole('group', { name: 'Respuesta de La Mesa' })
    expect(reply).toHaveTextContent('Respondió el miércoles, 4 de noviembre · Editada')
  })

  it('US-50 S11 counts and lists a rating-only review', async () => {
    vi.mocked(fetchRestaurant).mockResolvedValue({
      ...real,
      rating: 4,
      reviewCount: 1,
      reviews: [{ ...opinions(1)[0], comment: null }],
    })
    renderWithProviders(<RestaurantDetailPage />, { route: '/restaurantes/real-1' })

    expect(await screen.findByText('1 reseña')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Opiniones' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: /Reseña de/ })).toBeInTheDocument()
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
