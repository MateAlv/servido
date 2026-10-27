import type { OccupancyLevel } from '../components/restaurant'
import { priceTierFromAverageSpend } from '../components/restaurant/priceFilterUtils'
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

export type RestaurantReview = {
  author: string
  /** 1 to 5 stars. */
  rating: number
  comment: string
  /** ISO date of the visit. */
  date: string
}

export type RestaurantPublic = {
  id: string
  name: string
  description: string
  cuisine: string
  /** Mock average spend per person in pesos (spec 002); later it comes from reviews (US-50). */
  averageSpendPerPerson: number
  /** Derived from the average spend with priceTierFromAverageSpend. */
  priceTier: RestaurantPriceTier
  dietaryRestrictions: string[]
  /** Location must be valid so it appears on the map (FR-011). */
  location: GeoPoint & { address: string; neighborhood: string }
  /** Concurrence indicator levels: low/medium/high (spec 002, FR-002). */
  occupancy: OccupancyLevel
  /** Dishes with their current prices (US-9 S3). Empty until the restaurant loads its menu. */
  menu: MenuSection[]
  /** Opinions of past diners shown in the detail (US-9); real reviews arrive with US-24. */
  reviews: RestaurantReview[]
  /** Cover photo, and a square version for lists (`frontend/public/restaurants`). */
  photo: { cover: string; thumb: string }
  foto_url?: string | null
}

/**
 * Small fixture with valid locations in Buenos Aires (used on the home map).
 * Distances are not a problem to check by eye: these are around Palermo/Ciudad.
 */
const TEST_RESTAURANTS: Omit<RestaurantPublic, 'priceTier' | 'photo'>[] = [
  {
    id: 'r-la-esquina',
    name: 'La Esquina de Palermo',
    description: 'Parrilla clásica porteña con cortes a la brasa y ensaladas frescas.',
    cuisine: 'Parrilla',
    averageSpendPerPerson: 21000,
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
    reviews: [
      {
        author: 'Lucía M.',
        rating: 5,
        comment: 'El bife llegó justo cuando nos sentamos. Atención impecable.',
        date: '2026-10-12',
      },
      {
        author: 'Diego R.',
        rating: 4,
        comment: 'Muy buena parrilla, la provoleta es imperdible. Un poco de ruido.',
        date: '2026-10-05',
      },
      {
        author: 'Sofía P.',
        rating: 5,
        comment: 'Pedimos antes de llegar y no esperamos nada. Volvemos seguro.',
        date: '2026-09-28',
      },
    ],
  },
  {
    id: 'r-bodegon',
    name: 'Bodegón Estudiantil',
    description: 'Platos abundantes, cocina criolla y menú del día económico.',
    cuisine: 'Criolla',
    averageSpendPerPerson: 11000,
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
    reviews: [
      {
        author: 'Martín G.',
        rating: 5,
        comment: 'Milanesa enorme y barata, como en casa.',
        date: '2026-10-14',
      },
      {
        author: 'Carla V.',
        rating: 4,
        comment: 'El guiso de lentejas es un abrazo. Se llena al mediodía.',
        date: '2026-10-02',
      },
    ],
  },
  {
    id: 'r-verde',
    name: 'Verde Que Te Quiero',
    description: 'Bowls, wraps y opciones veganas 100% conscientes.',
    cuisine: 'Vegetariana/Vegana',
    averageSpendPerPerson: 17500,
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
    reviews: [
      {
        author: 'Jazmín T.',
        rating: 5,
        comment: 'Por fin un lugar con opciones veganas de verdad. El bowl es increíble.',
        date: '2026-10-11',
      },
      {
        author: 'Tomás A.',
        rating: 4,
        comment: 'Rico y liviano, ideal para almorzar rápido.',
        date: '2026-09-30',
      },
    ],
  },
  {
    id: 'r-terraza',
    name: 'Terraza del Río',
    description: 'Pescados y mariscos frescos, con una terraza amplia y ambiente relajado.',
    cuisine: 'Mariscos',
    averageSpendPerPerson: 52000,
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
    reviews: [
      {
        author: 'Valeria S.',
        rating: 5,
        comment: 'La terraza al atardecer y el salmón, un lujo.',
        date: '2026-10-09',
      },
      {
        author: 'Nicolás F.',
        rating: 4,
        comment: 'Caro pero vale la pena. La paella para dos alcanza para tres.',
        date: '2026-09-21',
      },
    ],
  },
  {
    id: 'r-cafe',
    name: 'Café San Telmo',
    description: 'Café de especialidad, medialunas y brunch todo el día.',
    cuisine: 'Café y Brunch',
    averageSpendPerPerson: 9500,
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
    reviews: [
      {
        author: 'Ana P.',
        rating: 5,
        comment: 'El mejor flat white de San Telmo.',
        date: '2026-10-15',
      },
      {
        author: 'Joaquín L.',
        rating: 4,
        comment: 'Brunch rico y rápido. Los domingos hay fila.',
        date: '2026-10-04',
      },
    ],
  },
  {
    id: 'r-canitas',
    name: 'Sushi Cañitas',
    description: 'Barra de sushi y cocina nikkei, con opciones sin TACC.',
    cuisine: 'Japonesa',
    averageSpendPerPerson: 33000,
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
    reviews: [
      {
        author: 'Camila R.',
        rating: 5,
        comment: 'El combinado es fresquísimo y tienen opciones sin TACC.',
        date: '2026-10-13',
      },
      {
        author: 'Federico N.',
        rating: 4,
        comment: 'Muy buen ceviche. Reservar es clave los viernes.',
        date: '2026-10-01',
      },
    ],
  },
  {
    id: 'r-obelisco',
    name: 'Pizzería del Centro',
    description: 'Pizza al molde y fainá, de las de siempre, a metros del Obelisco.',
    cuisine: 'Pizzería',
    averageSpendPerPerson: 13000,
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
    reviews: [
      {
        author: 'Germán D.',
        rating: 4,
        comment: 'Pizza al molde de las de antes. Rápida y abundante.',
        date: '2026-10-16',
      },
      {
        author: 'Paula C.',
        rating: 4,
        comment: 'La fugazzeta rellena no falla. Siempre lleno.',
        date: '2026-10-06',
      },
      {
        author: 'Rocío B.',
        rating: 3,
        comment: 'Rica, pero a la noche se demora bastante.',
        date: '2026-09-27',
      },
    ],
  },
]

export const RESTAURANTS_FIXTURE: RestaurantPublic[] = TEST_RESTAURANTS.map((restaurant) => ({
  ...restaurant,
  priceTier: priceTierFromAverageSpend(restaurant.averageSpendPerPerson),
  photo: {
    cover: `/restaurants/${restaurant.id}.webp`,
    thumb: `/restaurants/${restaurant.id}-thumb.webp`,
  },
}))

/** Average of the reviews, or null when there are none yet. */
export function averageRating(restaurant: RestaurantPublic): number | null {
  if (restaurant.reviews.length === 0) return null
  const total = restaurant.reviews.reduce((sum, review) => sum + review.rating, 0)
  return total / restaurant.reviews.length
}

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
