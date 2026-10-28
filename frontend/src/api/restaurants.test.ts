import { describe, expect, it, vi } from 'vitest'

import { RESTAURANTS_FIXTURE } from '../data/restaurants.fixture'
import { api } from './client'
import { fetchRestaurant, fetchRestaurants } from './restaurants'

vi.mock('./client', () => ({ api: { GET: vi.fn() } }))

const get = vi.mocked(api.GET)

const REAL = {
  id: '6f1c0000-0000-4000-8000-000000000001',
  name: 'Parrilla Real',
  description: null,
  cuisine: 'Parrilla',
  price_tier: '$$',
  dietary_restrictions: [],
  address: 'Honduras 4800',
  neighborhood: 'Palermo',
  lat: -34.58,
  lng: -58.43,
  photo_url: null,
}

describe('restaurants (decision D4 of spec 005)', () => {
  it('lists the bookable restaurants first, next to the test ones', async () => {
    get.mockResolvedValue({ data: { restaurants: [REAL] }, error: undefined } as never)

    const restaurants = await fetchRestaurants()

    expect(restaurants[0]).toMatchObject({
      id: REAL.id,
      name: 'Parrilla Real',
      priceTier: '$$',
      occupancy: null,
      reviews: [],
      bookable: true,
    })
    expect(restaurants.slice(1)).toEqual(RESTAURANTS_FIXTURE)
    expect(RESTAURANTS_FIXTURE.every((restaurant) => !restaurant.bookable)).toBe(true)
  })

  it('keeps the test restaurants when the API cannot be reached', async () => {
    get.mockImplementation(async () => {
      throw new TypeError('offline')
    })

    expect(await fetchRestaurants()).toEqual(RESTAURANTS_FIXTURE)
  })

  it('groups the menu of a real restaurant by category', async () => {
    get.mockResolvedValue({
      data: {
        ...REAL,
        menu: [
          {
            id: 'd-1',
            name: 'Bife de chorizo',
            description: null,
            category: 'plato_principal',
            price: '18500.00',
            photo_url: null,
            dietary_restrictions: [],
          },
          {
            id: 'd-2',
            name: 'Flan',
            description: 'Con dulce de leche.',
            category: 'postre',
            price: '6000.00',
            photo_url: null,
            dietary_restrictions: [],
          },
        ],
      },
      error: undefined,
    } as never)

    const restaurant = await fetchRestaurant(REAL.id)

    expect(restaurant?.menu).toEqual([
      { category: 'Principales', dishes: [{ name: 'Bife de chorizo', price: 18500 }] },
      {
        category: 'Postres',
        dishes: [{ name: 'Flan', price: 6000, description: 'Con dulce de leche.' }],
      },
    ])
  })

  it('answers a test restaurant without calling the API', async () => {
    get.mockClear()
    expect(await fetchRestaurant('r-la-esquina')).toMatchObject({ bookable: false })
    expect(get).not.toHaveBeenCalled()
  })
})
