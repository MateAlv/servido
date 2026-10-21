import type { OccupancyLevel } from '../components/restaurant'
import type { GeoPoint } from '../lib/geo'

export type RestaurantPriceTier = '$' | '$$' | '$$$' | '$$$$'

export type RestaurantPublic = {
  id: string
  name: string
  description: string
  cuisine: string
  /** Price level loaded for demo. When US-50 lands, it may be computed from reviews. */
  priceTier: RestaurantPriceTier
  dietaryRestrictions: string[]
  /** Location must be valid so it appears on the map (FR-011). */
  location: GeoPoint & { address: string; neighborhood: string }
  /** Concurrence indicator levels: low/medium/high (spec 002, FR-002). */
  occupancy: OccupancyLevel
}

/**
 * Small fixture with valid locations in Buenos Aires (used on the home map).
 * Distances are not a problem to check by eye: these are around Palermo/Ciudad.
 */
export const RESTAURANTS_FIXTURE: RestaurantPublic[] = [
  {
    id: 'r-la-esquina',
    name: 'La Esquina de Palermo',
    description: 'Parrilla clásica porteña con cortes a la brasa y ensaladas frescas.',
    cuisine: 'Parrilla',
    priceTier: '$$',
    dietaryRestrictions: ['Sin TACC'],
    location: {
      lat: -34.5885,
      lng: -58.4265,
      address: 'Calle de Palermo 123',
      neighborhood: 'Palermo',
    },
    occupancy: 'medium',
  },
  {
    id: 'r-bodegon',
    name: 'Bodegón Estudiantil',
    description: 'Platos abundantes, cocina criolla y menú del día económico.',
    cuisine: 'Criolla',
    priceTier: '$',
    dietaryRestrictions: ['Vegetariano'],
    location: {
      lat: -34.597,
      lng: -58.4205,
      address: 'Av. Corrientes 2450',
      neighborhood: 'Almagro',
    },
    occupancy: 'low',
  },
  {
    id: 'r-verde',
    name: 'Verde Que Te Quiero',
    description: 'Bowls, wraps y opciones veganas 100% conscientes.',
    cuisine: 'Vegetariana/Vegana',
    priceTier: '$$',
    dietaryRestrictions: ['Vegetariano', 'Vegano', 'Sin lactosa'],
    location: {
      lat: -34.584,
      lng: -58.4365,
      address: 'Jorge Luis Borges 1500',
      neighborhood: 'Palermo',
    },
    occupancy: 'medium',
  },
  {
    id: 'r-terraza',
    name: 'Terraza del Río',
    description: 'Pescados y mariscos frescos, con una terraza amplia y ambiente relajado.',
    cuisine: 'Mariscos',
    priceTier: '$$$$',
    dietaryRestrictions: ['Sin TACC'],
    location: {
      lat: -34.6105,
      lng: -58.366,
      address: 'Puerto Madero 1000',
      neighborhood: 'Puerto Madero',
    },
    occupancy: 'high',
  },
  {
    id: 'r-cafe',
    name: 'Café San Telmo',
    description: 'Café de especialidad, medialunas y brunch todo el día.',
    cuisine: 'Café y Brunch',
    priceTier: '$',
    dietaryRestrictions: ['Vegetariano', 'Sin TACC'],
    location: {
      lat: -34.621,
      lng: -58.373,
      address: 'Defensa 1200',
      neighborhood: 'San Telmo',
    },
    occupancy: 'low',
  },
]

/**
 * Simulates `GET /api/restaurants` until spec 004 adds the real endpoint.
 * The map queries it again on a timer to refresh occupancy (US-5, S5).
 */
export async function fetchRestaurants(): Promise<RestaurantPublic[]> {
  return RESTAURANTS_FIXTURE
}
