import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRestaurants } from '../data/restaurants.fixture'
import { formatDistance, distanceKm } from '../lib/geo'
import { OCCUPANCY_REFRESH_MS } from '../lib/occupancy'
import { renderWithProviders } from '../test/renderWithProviders'
import { MapPage } from './MapPage'
import { RestaurantDetailPage } from './RestaurantDetailPage'

vi.mock('../data/restaurants.fixture', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data/restaurants.fixture')>()
  return { ...actual, fetchRestaurants: vi.fn(actual.fetchRestaurants) }
})

const DINER = { lat: -34.59, lng: -58.43 }
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
    expect(await screen.findByLabelText('La Esquina de Palermo: Media')).toBeInTheDocument()
    expect(screen.getByLabelText('Terraza del Río: Alta')).toBeInTheDocument()
  })

  it('US-5 S2 shows the occupancy level of every restaurant', async () => {
    renderWithProviders(<MapPage />)

    expect(await screen.findByLabelText('Bodegón Estudiantil: Baja')).toBeInTheDocument()
    expect(screen.getByLabelText('La Esquina de Palermo: Media')).toBeInTheDocument()
    expect(screen.getByLabelText('Terraza del Río: Alta')).toBeInTheDocument()
  })

  it('US-5 S3 shows the distance to a restaurant when it is selected', async () => {
    renderWithProviders(<MapPage />)

    fireEvent.click(await screen.findByLabelText('La Esquina de Palermo: Media'))

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

    fireEvent.click(await screen.findByLabelText('La Esquina de Palermo: Media'))
    fireEvent.click(await screen.findByRole('link', { name: 'Ver detalle' }))

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
    expect(screen.getByLabelText('La Esquina de Palermo: Media')).toBeInTheDocument()

    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(OCCUPANCY_REFRESH_MS)
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })

    expect(screen.getByText(/puede estar desactualizada/i)).toBeInTheDocument()
    expect(screen.getByLabelText('La Esquina de Palermo: Media')).toBeInTheDocument()
  })

  it('US-5 edge hides restaurants without a valid location (FR-011)', async () => {
    vi.mocked(fetchRestaurants).mockResolvedValueOnce([
      {
        id: 'r-invalid',
        name: 'Sin Ubicación',
        description: 'No aparece en el mapa.',
        cuisine: 'Prueba',
        priceTier: '$',
        dietaryRestrictions: [],
        location: { lat: Number.NaN, lng: Number.NaN, address: '', neighborhood: '' },
        occupancy: 'low',
      },
    ])

    renderWithProviders(<MapPage />)

    expect(await screen.findByText(/todavía no hay restaurantes/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/sin ubicación/i)).not.toBeInTheDocument()
  })

  it('US-5 edge falls back to Buenos Aires when the location is denied', async () => {
    mockGeolocationDenied()
    renderWithProviders(<MapPage />)

    expect(await screen.findByText(/no pudimos usar tu ubicación/i)).toBeInTheDocument()
    fireEvent.click(await screen.findByLabelText('La Esquina de Palermo: Media'))
    await waitFor(() => expect(screen.getByText('Barrio')).toBeInTheDocument())
    expect(screen.queryByText('Distancia')).not.toBeInTheDocument()
  })
})
