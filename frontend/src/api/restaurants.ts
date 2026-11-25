/**
 * Restaurants for the diner's map, list and detail: the bookable restaurants stored in the
 * database (`GET /api/restaurants`, decision D4 of 28/10 in spec 003). The test restaurants of
 * spec 002-elegir-restaurante stopped showing on 24/11.
 */
import {
  type MenuSection,
  type RestaurantPriceTier,
  type RestaurantPublic,
  type RestaurantPromotion,
} from '../data/restaurants.fixture'
import { restrictionLabel } from '../lib/dietary'
import { api } from './client'
import { getApiErrorMessage } from './errors'
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
      dietaryRestrictions: dish.dietary_restrictions.map(restrictionLabel),
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
  promotions: BookableRestaurantDetail['promotions'] = [],
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
    dietaryRestrictions: restaurant.dietary_restrictions.map(restrictionLabel),
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
      ...(opinion.photos?.length && { photos: opinion.photos }),
      date: opinion.visit_date,
      spendPerPerson: opinion.spend_per_person,
      reply: opinion.reply,
    })),
    promotions: promotions.map((promotion): RestaurantPromotion => ({
      name: promotion.name,
      description: promotion.description,
      discountType: promotion.discount_type as RestaurantPromotion['discountType'],
      discountValue: promotion.discount_value,
      minimumAmount: promotion.minimum_amount,
      startsOn: promotion.starts_on,
      endsOn: promotion.ends_on,
      weekdays: promotion.weekdays,
      startTime: promotion.start_time,
      endTime: promotion.end_time,
    })),
    rating: restaurant.rating,
    reviewCount: restaurant.review_count,
    photo: photo ? { cover: photo, thumb: photo } : null,
    hasMenu: restaurant.has_menu,
    maxPartySize: restaurant.max_party_size,
    dishRestrictionSets: restaurant.dish_restriction_sets,
    bookable: true,
  }
}

const RESTAURANTS_FAILED = 'No pudimos cargar los restaurantes.'

/** The map queries it again on a timer to refresh occupancy (US-5, S5). */
export async function fetchRestaurants(): Promise<RestaurantPublic[]> {
  const { data, error } = await api.GET('/api/restaurants')
  if (error || !data) throw new Error(getApiErrorMessage(error, RESTAURANTS_FAILED))
  return data.restaurants.map((restaurant) => fromApi(restaurant))
}

/** One bookable restaurant; `undefined` when it doesn't exist or can't be booked. */
export async function fetchRestaurant(id: string): Promise<RestaurantPublic | undefined> {
  const { data } = await api.GET('/api/restaurants/{restaurant_id}', {
    params: { path: { restaurant_id: id } },
  })
  return data ? fromApi(data, menuSections(data.menu), data.opinions, data.promotions) : undefined
}

const OPEN_FAILED = 'No pudimos consultar los horarios de los restaurantes.'

/**
 * Ids of the bookable restaurants where a reservation can start on `date` between `startFrom`
 * and `startTo`, inclusive (`GET /api/restaurants/open`, spec 027, F4). A point hour sends the
 * same time twice.
 */
export async function fetchOpenRestaurantIds(
  date: string,
  startFrom: string,
  startTo: string,
): Promise<string[]> {
  const { data, error } = await api.GET('/api/restaurants/open', {
    params: { query: { date, start_from: startFrom, start_to: startTo } },
  })
  if (error || !data) throw new Error(getApiErrorMessage(error, OPEN_FAILED))
  return data.restaurant_ids
}
