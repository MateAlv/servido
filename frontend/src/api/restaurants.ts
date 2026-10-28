/**
 * Restaurants for the diner's map, list and detail: the bookable restaurants stored in the
 * database (`GET /api/restaurants`, decision D4 of 28/10 in spec 005) next to the test
 * restaurants of spec 002. Only the real ones can be booked.
 */
import {
  RESTAURANTS_FIXTURE,
  testRestaurant,
  type MenuSection,
  type RestaurantPriceTier,
  type RestaurantPublic,
} from '../data/restaurants.fixture'
import { api } from './client'
import type { components } from './schema'

type BookableRestaurant = components['schemas']['PublicRestaurant']
type BookableRestaurantDetail = components['schemas']['PublicRestaurantDetail']

const CATEGORY_LABELS: Record<string, string> = {
  entrada: 'Entradas',
  plato_principal: 'Principales',
  postre: 'Postres',
  bebida: 'Bebidas',
}

function menuSections(dishes: BookableRestaurantDetail['menu']): MenuSection[] {
  const sections = new Map<string, MenuSection>()
  for (const dish of dishes) {
    const category = CATEGORY_LABELS[dish.category] ?? dish.category
    const section = sections.get(category) ?? { category, dishes: [] }
    section.dishes.push({
      name: dish.name,
      price: Number(dish.price),
      description: dish.description ?? undefined,
    })
    sections.set(category, section)
  }
  return [...sections.values()]
}

/** What the database doesn't know yet stays empty, and the UI leaves it out. */
function fromApi(restaurant: BookableRestaurant, menu: MenuSection[] = []): RestaurantPublic {
  const photo = restaurant.photo_url
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description ?? '',
    cuisine: restaurant.cuisine ?? '',
    averageSpendPerPerson: null,
    priceTier: (restaurant.price_tier as RestaurantPriceTier | null) ?? null,
    dietaryRestrictions: restaurant.dietary_restrictions,
    location: {
      lat: restaurant.lat,
      lng: restaurant.lng,
      address: restaurant.address ?? '',
      neighborhood: restaurant.neighborhood ?? '',
    },
    occupancy: null,
    menu,
    reviews: [],
    photo: photo ? { cover: photo, thumb: photo } : null,
    hasMenu: restaurant.has_menu,
    bookable: true,
  }
}

/**
 * Real restaurants first, then the test ones. If the API can't be reached, the map still shows
 * the test restaurants. The map queries it again on a timer to refresh occupancy (US-5, S5).
 */
export async function fetchRestaurants(): Promise<RestaurantPublic[]> {
  try {
    const { data } = await api.GET('/api/restaurants')
    const real = data?.restaurants.map((restaurant) => fromApi(restaurant)) ?? []
    // A real restaurant replaces the test one with its name: never two with the same name.
    const realNames = new Set(real.map((restaurant) => restaurant.name.toLocaleLowerCase('es')))
    const tests = RESTAURANTS_FIXTURE.filter(
      (restaurant) => !realNames.has(restaurant.name.toLocaleLowerCase('es')),
    )
    return [...real, ...tests]
  } catch {
    return RESTAURANTS_FIXTURE
  }
}

/** One restaurant, real or test; `undefined` when it doesn't exist or can't be booked. */
export async function fetchRestaurant(id: string): Promise<RestaurantPublic | undefined> {
  const test = testRestaurant(id)
  if (test) return test
  const { data } = await api.GET('/api/restaurants/{restaurant_id}', {
    params: { path: { restaurant_id: id } },
  })
  return data ? fromApi(data, menuSections(data.menu)) : undefined
}
