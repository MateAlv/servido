import type { OccupancyLevel } from '../components/restaurant'
import type { GeoPoint } from '../lib/geo'

export type RestaurantPriceTier = '$' | '$$' | '$$$' | '$$$$'

export type MenuDish = {
  name: string
  /** Price in Argentine pesos. */
  price: number
  description?: string
}

export type MenuSection = {
  category: string
  dishes: MenuDish[]
}

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
  /** Dishes with their current prices (US-9 S3). Empty until the restaurant loads its menu. */
  menu: MenuSection[]
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
    menu: [
      {
        category: 'Entradas',
        dishes: [
          { name: 'Provoleta a la parrilla', price: 9800 },
          { name: 'Empanada de carne cortada a cuchillo', price: 3200 },
        ],
      },
      {
        category: 'Principales',
        dishes: [
          { name: 'Bife de chorizo con papas', price: 24500, description: '400 g, a punto' },
          { name: 'Entraña con ensalada mixta', price: 21900 },
        ],
      },
      { category: 'Postres', dishes: [{ name: 'Flan con dulce de leche', price: 6200 }] },
    ],
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
    menu: [
      {
        category: 'Principales',
        dishes: [
          { name: 'Milanesa napolitana con puré', price: 12900 },
          { name: 'Guiso de lentejas', price: 9500, description: 'Opción vegetariana' },
        ],
      },
      { category: 'Postres', dishes: [{ name: 'Budín de pan', price: 4800 }] },
    ],
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
    menu: [
      {
        category: 'Principales',
        dishes: [
          { name: 'Bowl de quinoa y palta', price: 16800, description: 'Vegano' },
          { name: 'Wrap de falafel', price: 14500 },
        ],
      },
      { category: 'Bebidas', dishes: [{ name: 'Limonada con jengibre', price: 5200 }] },
    ],
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
    menu: [
      {
        category: 'Entradas',
        dishes: [{ name: 'Rabas con alioli', price: 21500 }],
      },
      {
        category: 'Principales',
        dishes: [
          { name: 'Salmón grillado con vegetales', price: 46800 },
          { name: 'Paella para dos', price: 79000 },
        ],
      },
    ],
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
    menu: [
      {
        category: 'Brunch',
        dishes: [
          { name: 'Tostado de jamón y queso', price: 7900 },
          { name: 'Huevos revueltos con palta', price: 11200 },
        ],
      },
      { category: 'Bebidas', dishes: [{ name: 'Flat white', price: 4300 }] },
    ],
  },
  {
    id: 'r-canitas',
    name: 'Sushi Cañitas',
    description: 'Barra de sushi y cocina nikkei, con opciones sin TACC.',
    cuisine: 'Japonesa',
    priceTier: '$$$',
    dietaryRestrictions: ['Sin TACC'],
    location: {
      lat: -34.5705,
      lng: -58.4345,
      address: 'Báez 280',
      neighborhood: 'Las Cañitas',
    },
    occupancy: 'medium',
    menu: [
      {
        category: 'Principales',
        dishes: [
          { name: 'Combinado de 15 piezas', price: 32500 },
          { name: 'Ceviche nikkei', price: 27800 },
        ],
      },
      { category: 'Postres', dishes: [{ name: 'Mochi de matcha', price: 8900 }] },
    ],
  },
  {
    id: 'r-obelisco',
    name: 'Pizzería del Centro',
    description: 'Pizza al molde y fainá, de las de siempre, a metros del Obelisco.',
    cuisine: 'Pizzería',
    priceTier: '$',
    dietaryRestrictions: [],
    location: {
      lat: -34.6045,
      lng: -58.3838,
      address: 'Av. Corrientes 1150',
      neighborhood: 'San Nicolás',
    },
    occupancy: 'high',
    menu: [
      {
        category: 'Pizzas',
        dishes: [
          { name: 'Muzzarella grande', price: 13500 },
          { name: 'Fugazzeta rellena', price: 14900 },
        ],
      },
      { category: 'Bebidas', dishes: [{ name: 'Gaseosa 500 ml', price: 2900 }] },
    ],
  },
]

/**
 * Simulates `GET /api/restaurants` until spec 004 adds the real endpoint.
 * The map queries it again on a timer to refresh occupancy (US-5, S5).
 */
export async function fetchRestaurants(): Promise<RestaurantPublic[]> {
  return RESTAURANTS_FIXTURE
}

/** Simulates `GET /api/restaurants/{id}`; `undefined` when it does not exist. */
export async function fetchRestaurant(id: string): Promise<RestaurantPublic | undefined> {
  return RESTAURANTS_FIXTURE.find((restaurant) => restaurant.id === id)
}
