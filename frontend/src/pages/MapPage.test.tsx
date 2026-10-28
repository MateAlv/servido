import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRestaurants } from '../api/restaurants'
import { formatDistance, distanceKm } from '../lib/geo'
import { OCCUPANCY_REFRESH_MS } from '../lib/occupancy'
import { renderWithProviders } from '../test/renderWithProviders'
import { MapPage } from './MapPage'
import { RestaurantDetailPage } from './RestaurantDetailPage'

vi.mock('../api/restaurants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/restaurants')>()
  const { RESTAURANTS_FIXTURE } = await import('../data/restaurants.fixture')
  return { ...actual, fetchRestaurants: vi.fn(async () => RESTAURANTS_FIXTURE) }
})

const DINER = { lat: -34.59, lng: -58.43 }

/** Clicks a Leaflet marker and returns the card it opens. */
async function openCard(name: string) {
  fireEvent.click(screen.getByTitle(name))
  const title = await waitFor(() => {
    const found = document.querySelector('.leaflet-popup h3')
    expect(found).toHaveTextContent(name)
    return found as HTMLElement
  })
  return title.closest('.leaflet-popup') as HTMLElement
}
const originalGeolocation = navigator.geolocation

function mockGeolocationSuccess(point = DINER) {
  const getCurrentPosition = vi.fn((success: PositionCallback) => {
    success({
      coords: { latitude: point.lat, longitude: point.lng },
    } as GeolocationPosition)
  })
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
}

function mockGeolocationDenied() {
  const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => {
    error?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError)
  })
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  })
}

beforeEach(() => {
  vi.mocked(fetchRestaurants).mockClear()
  mockGeolocationSuccess()
})

afterEach(() => {
  vi.useRealTimers()
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: originalGeolocation,
  })
})

describe('MapPage (US-5)', () => {
  it('US-5 S1 shows the diner position and each restaurant as a marker', async () => {
    renderWithProviders(<MapPage />)

    expect(await screen.findByText('Tu ubicación')).toBeInTheDocument()
    expect(await screen.findByTitle('La Esquina de Palermo')).toBeInTheDocument()
    expect(screen.getByTitle('Terraza del Río')).toBeInTheDocument()
  })

  it('US-5 S2 shows the occupancy level of a restaurant when its marker is clicked', async () => {
    renderWithProviders(<MapPage />)

    // The pins carry only the name: occupancy appears in the card that opens on click.
    expect(await screen.findByTitle('Bodegón Estudiantil')).not.toHaveTextContent(/[●▲■]/)

    const card = await openCard('Bodegón Estudiantil')
    expect(within(card).getByRole('img', { name: 'Concurrencia baja' })).toBeInTheDocument()

    const other = await openCard('Terraza del Río')
    expect(within(other).getByRole('img', { name: 'Concurrencia alta' })).toBeInTheDocument()
  })

  it('US-5 S3 shows the distance to a restaurant when it is selected', async () => {
    renderWithProviders(<MapPage />)

    fireEvent.click(await screen.findByTitle('La Esquina de Palermo'))

    const expected = formatDistance(distanceKm(DINER, { lat: -34.5885, lng: -58.4265 }))
    expect(await screen.findByText(expected)).toBeInTheDocument()
    expect(screen.getByText('Distancia')).toBeInTheDocument()
  })

  it('US-5 S4 opens the restaurant detail from its marker', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
      </Routes>,
      { route: '/mapa' },
    )

    fireEvent.click(await screen.findByTitle('La Esquina de Palermo'))
    const popup = await screen.findByText('Barrio')
    fireEvent.click(
      within(popup.closest('.leaflet-popup') as HTMLElement).getByRole('link', {
        name: 'Ver detalle',
      }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'La Esquina de Palermo' }),
    ).toBeInTheDocument()
  })

  it('US-5 S5 refreshes occupancy after the refresh period', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.mocked(fetchRestaurants)
    renderWithProviders(<MapPage />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(OCCUPANCY_REFRESH_MS)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('US-5 edge keeps the last occupancy and warns when a refresh fails', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.mocked(fetchRestaurants)
    renderWithProviders(<MapPage />)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByTitle('La Esquina de Palermo')).toBeInTheDocument()

    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(OCCUPANCY_REFRESH_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(screen.getByText(/puede estar desactualizada/i)).toBeInTheDocument()
    expect(screen.getByTitle('La Esquina de Palermo')).toBeInTheDocument()
  })

  it('US-5 edge shows a real restaurant without any occupancy indicator', async () => {
    vi.mocked(fetchRestaurants).mockResolvedValueOnce([
      {
        id: '6f1c0000-0000-4000-8000-000000000001',
        name: 'Parrilla Real',
        description: '',
        cuisine: 'Parrilla',
        averageSpendPerPerson: null,
        priceTier: null,
        dietaryRestrictions: [],
        location: { lat: -34.58, lng: -58.43, address: 'Honduras 4800', neighborhood: 'Palermo' },
        occupancy: null,
        menu: [],
        reviews: [],
        photo: { cover: '/servido-logo.png', thumb: '/servido-logo.png' },
        bookable: true,
      },
    ])

    renderWithProviders(<MapPage />)

    // Without data nothing is said about occupancy: the pin shows only the name.
    expect(await screen.findByTitle('Parrilla Real')).toBeInTheDocument()
    const list = screen.getByRole('region', { name: '1 restaurante' })
    expect(within(list).queryByRole('img', { name: /Concurrencia/ })).not.toBeInTheDocument()
    expect(within(list).queryByLabelText(/^Precio/)).not.toBeInTheDocument()
    expect(screen.queryByText(/sin datos/i)).not.toBeInTheDocument()
    // With no occupancy anywhere, the live update time is not shown either.
    expect(screen.queryByText(/^Actualizado/)).not.toBeInTheDocument()

    const card = await openCard('Parrilla Real')
    expect(within(card).queryByRole('img', { name: /Concurrencia/ })).not.toBeInTheDocument()
  })

  it('US-5 edge hides restaurants without a valid location (FR-011)', async () => {
    vi.mocked(fetchRestaurants).mockResolvedValueOnce([
      {
        id: 'r-invalid',
        name: 'Sin Ubicación',
        description: 'No aparece en el mapa.',
        cuisine: 'Prueba',
        averageSpendPerPerson: 9000,
        priceTier: '$',
        dietaryRestrictions: [],
        location: { lat: Number.NaN, lng: Number.NaN, address: '', neighborhood: '' },
        occupancy: 'low',
        menu: [],
        reviews: [],
        photo: { cover: '', thumb: '' },
        bookable: false,
      },
    ])

    renderWithProviders(<MapPage />)

    expect(await screen.findByText(/no hay restaurantes para mostrar/i)).toBeInTheDocument()
    expect(screen.queryByTitle(/sin ubicación/i)).not.toBeInTheDocument()
  })

  it('US-5 edge falls back to Buenos Aires when the location is denied', async () => {
    mockGeolocationDenied()
    renderWithProviders(<MapPage />)

    expect(await screen.findByText(/no pudimos usar tu ubicación/i)).toBeInTheDocument()
    fireEvent.click(await screen.findByTitle('La Esquina de Palermo'))
    await waitFor(() => expect(screen.getByText('Barrio')).toBeInTheDocument())
    expect(screen.queryByText('Distancia')).not.toBeInTheDocument()
  })
})

function renderMapWithDetail(route = '/mapa') {
  return renderWithProviders(
    <Routes>
      <Route path="/mapa" element={<MapPage />} />
      <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
    </Routes>,
    { route },
  )
}

describe('MapPage price filter (US-7)', () => {
  it('US-7 S1 shows only the restaurants of the chosen price, on the map and in the list', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapPage />)
    await screen.findByTitle('Terraza del Río')

    await user.click(screen.getByRole('button', { name: '$$' }))

    expect(screen.getByRole('heading', { name: '2 restaurantes' })).toBeInTheDocument()
    expect(screen.getByTitle('La Esquina de Palermo')).toBeInTheDocument()
    expect(screen.getByTitle('Verde Que Te Quiero')).toBeInTheDocument()
    expect(screen.queryByTitle('Terraza del Río')).not.toBeInTheDocument()
  })

  it('US-7 S2 updates the result when the filter changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapPage />)
    await screen.findByTitle('Terraza del Río')

    await user.click(screen.getByRole('button', { name: '$$' }))
    await user.click(screen.getByRole('button', { name: '$' }))
    expect(screen.getByRole('heading', { name: '5 restaurantes' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '$$' }))
    expect(screen.getByRole('heading', { name: '3 restaurantes' })).toBeInTheDocument()
    expect(screen.getByTitle('Bodegón Estudiantil')).toBeInTheDocument()
    expect(screen.queryByTitle('La Esquina de Palermo')).not.toBeInTheDocument()
  })

  it('US-7 S3 shows every restaurant again when the filter is removed', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MapPage />, { route: '/mapa?precio=%24%24%24%24' })
    expect(await screen.findByRole('heading', { name: '1 restaurante' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar filtro de precio' }))

    expect(screen.getByRole('heading', { name: '7 restaurantes' })).toBeInTheDocument()
    expect(screen.getByTitle('La Esquina de Palermo')).toBeInTheDocument()
  })
})

describe('RestaurantDetailPage (US-9)', () => {
  it('US-9 S1 opens the detail from the restaurant chosen on the map', async () => {
    const user = userEvent.setup()
    renderMapWithDetail()

    const list = await screen.findByRole('region', { name: '7 restaurantes' })
    const card = within(list).getByRole('heading', { name: 'Café San Telmo' }).closest('li')
    await user.click(within(card as HTMLElement).getByRole('link', { name: 'Ver detalle' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Café San Telmo' }),
    ).toBeInTheDocument()
  })

  it('US-9 S2 shows the price level, so the diner can check it matches the filter', async () => {
    const user = userEvent.setup()
    renderMapWithDetail('/mapa?precio=%24%24%24')

    const list = await screen.findByRole('region', { name: '1 restaurante' })
    await user.click(within(list).getByRole('link', { name: 'Ver detalle' }))

    await screen.findByRole('heading', { level: 1, name: 'Sushi Cañitas' })
    const facts = screen.getByRole('list', { name: 'Características' })
    expect(within(facts).getByText('$$$')).toBeInTheDocument()
  })

  it('US-9 S3 shows the menu with its prices', async () => {
    renderMapWithDetail('/restaurantes/r-la-esquina')

    expect(await screen.findByText('Bife de chorizo con papas')).toBeInTheDocument()
    expect(screen.getByText(/24\.500/)).toBeInTheDocument()
  })

  it('US-9 S4 shows the description, a photo and the opinions of the restaurant', async () => {
    renderMapWithDetail('/restaurantes/r-la-esquina')

    expect(
      await screen.findByRole('img', { name: 'Foto de La Esquina de Palermo' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/parrilla clásica porteña/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Opiniones' })).toBeInTheDocument()
    expect(screen.getByText(/el bife llegó justo cuando nos sentamos/i)).toBeInTheDocument()
  })

  it('US-9 edge goes back to the map with the same price filter', async () => {
    const user = userEvent.setup()
    renderMapWithDetail('/mapa?precio=%24%24')

    const list = await screen.findByRole('region', { name: '2 restaurantes' })
    await user.click(within(list).getAllByRole('link', { name: 'Ver detalle' })[0])
    await user.click(await screen.findByRole('link', { name: /volver a los restaurantes/i }))

    expect(await screen.findByRole('button', { name: '$$' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('heading', { name: '2 restaurantes' })).toBeInTheDocument()
  })
})

describe('Restaurant list next to the map (US-33)', () => {
  function listItem(list: HTMLElement, name: string) {
    return within(list).getByRole('heading', { name }).closest('li') as HTMLElement
  }

  it('US-33 S1 shows the distance to each restaurant', async () => {
    renderWithProviders(<MapPage />)

    const list = await screen.findByRole('region', { name: '7 restaurantes' })
    const expected = formatDistance(distanceKm(DINER, { lat: -34.5885, lng: -58.4265 }))
    expect(
      within(listItem(list, 'La Esquina de Palermo')).getByText(new RegExp(expected)),
    ).toBeInTheDocument()
  })

  it('US-33 S2 shows the occupancy of each restaurant', async () => {
    renderWithProviders(<MapPage />)

    const list = await screen.findByRole('region', { name: '7 restaurantes' })
    expect(
      within(listItem(list, 'Terraza del Río')).getByRole('img', { name: 'Concurrencia alta' }),
    ).toBeInTheDocument()
    expect(
      within(listItem(list, 'Bodegón Estudiantil')).getByRole('img', { name: 'Concurrencia baja' }),
    ).toBeInTheDocument()
  })

  it('US-33 S3 updates the occupancy in the list after the refresh period', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.mocked(fetchRestaurants)
    const restaurants = await fetchRestaurants()
    renderWithProviders(<MapPage />)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const list = screen.getByRole('region', { name: '7 restaurantes' })
    expect(
      within(listItem(list, 'Bodegón Estudiantil')).getByRole('img', { name: 'Concurrencia baja' }),
    ).toBeInTheDocument()

    fetchMock.mockResolvedValueOnce(
      restaurants.map((restaurant) =>
        restaurant.id === 'r-bodegon' ? { ...restaurant, occupancy: 'high' } : restaurant,
      ),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(OCCUPANCY_REFRESH_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(
      within(listItem(list, 'Bodegón Estudiantil')).getByRole('img', { name: 'Concurrencia alta' }),
    ).toBeInTheDocument()
  })

  it('US-33 S4 opens the detail of a restaurant chosen in the list', async () => {
    const user = userEvent.setup()
    renderMapWithDetail()

    const list = await screen.findByRole('region', { name: '7 restaurantes' })
    await user.click(
      within(listItem(list, 'Verde Que Te Quiero')).getByRole('link', { name: 'Ver detalle' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Verde Que Te Quiero' }),
    ).toBeInTheDocument()
  })
})
