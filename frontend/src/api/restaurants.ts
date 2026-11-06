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
const CATEGORY_ORDER = ['entrada', 'plato_principal', 'postre', 'bebida']
const RESTRICTION_LABELS: Record<string, string> = {
  sin_tacc: 'Sin TACC',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
}

function menuSections(dishes: BookableRestaurantDetail['menu']): MenuSection[] {
  const sections = new Map<string, MenuSection>()
  for (const dish of dishes) {
    const category = CATEGORY_LABELS[dish.category] ?? dish.category
    const section = sections.get(dish.category) ?? { category, dishes: [] }
    section.dishes.push({
      id: dish.id,
      name: dish.name,
      price: Number(dish.price),
      description: dish.description ?? undefined,
      photo: dish.photo_url ?? undefined,
      dietaryRestrictions: dish.dietary_restrictions.map(
        (restriction) => RESTRICTION_LABELS[restriction] ?? restriction,
      ),
    })
    sections.set(dish.category, section)
  }
  return [...sections.entries()]
    .sort(([first], [second]) => {
      const firstIndex = CATEGORY_ORDER.indexOf(first)
      const secondIndex = CATEGORY_ORDER.indexOf(second)
      return (
        (firstIndex < 0 ? CATEGORY_ORDER.length : firstIndex) -
        (secondIndex < 0 ? CATEGORY_ORDER.length : secondIndex)
      )
    })
    .map(([, section]) => ({
      ...section,
      dishes: section.dishes.sort((first, second) => first.name.localeCompare(second.name, 'es')),
    }))
}

/** What the database doesn't know yet stays empty, and the UI leaves it out. */
function fromApi(
  restaurant: BookableRestaurant,
  menu: MenuSection[] = [],
  opinions: BookableRestaurantDetail['opinions'] = [],
): RestaurantPublic {
  const photo = restaurant.photo_url
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description ?? '',
    cuisine: restaurant.cuisine ?? '',
    averageSpendPerPerson: restaurant.average_spend_per_person,
    spendPeople: restaurant.spend_people,
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
    reviews: opinions.map((opinion) => ({
      author: opinion.author,
      rating: opinion.rating,
      comment: opinion.comment,
      date: opinion.visit_date,
      spendPerPerson: opinion.spend_per_person,
    })),
    rating: restaurant.rating,
    reviewCount: restaurant.review_count,
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
  return data ? fromApi(data, menuSections(data.menu), data.opinions) : undefined
}
