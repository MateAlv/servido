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
