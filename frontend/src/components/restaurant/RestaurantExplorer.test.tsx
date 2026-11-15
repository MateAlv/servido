import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchOpenRestaurantIds, fetchRestaurant, fetchRestaurants } from '../../api/restaurants'
import { RESTAURANTS_FIXTURE, type RestaurantPublic } from '../../data/restaurants.fixture'
import { addDays, todayInBuenosAires } from '../../lib/date'
import { MapPage } from '../../pages/MapPage'
import { RestaurantDetailPage } from '../../pages/RestaurantDetailPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { shortDayLabel } from './searchFilters'

vi.mock('../../api/restaurants', () => ({
  fetchRestaurants: vi.fn(),
  fetchRestaurant: vi.fn(),
  fetchOpenRestaurantIds: vi.fn(),
}))

vi.mock('../../api/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/session')>()
  return {
    ...actual,
    useAccount: () => ({
      data: { rol: 'diner', id: 'c-1', nombre: 'Ana', email: 'ana@example.com' },
    }),
  }
})

function real(overrides: Partial<RestaurantPublic> & Pick<RestaurantPublic, 'id' | 'name'>) {
  return {
    description: '',
    cuisine: '',
    averageSpendPerPerson: null,
    priceTier: '$$',
    dietaryRestrictions: [],
    location: { lat: -34.58, lng: -58.43, address: '', neighborhood: '' },
    occupancy: null,
    menu: [],
    reviews: [],
    rating: null,
    reviewCount: 0,
    photo: null,
    hasMenu: true,
    maxPartySize: 4,
    dishRestrictionSets: [],
    bookable: true,
    ...overrides,
  } satisfies RestaurantPublic
}

// Real restaurants next to the test ones (ratings 4,7 · 4,5 ×5 · 3,7).
const PARRILLA = real({
  id: 'real-parrilla',
  name: 'Parrilla Real',
  rating: 3.96,
  reviewCount: 25,
  maxPartySize: 4,
  dishRestrictionSets: [['sin_tacc']],
})
const HUERTA = real({
  id: 'real-huerta',
  name: 'Huerta Real',
  rating: 4.8,
  reviewCount: 5,
  maxPartySize: 8,
  dishRestrictionSets: [['sin_tacc', 'vegano', 'vegetariano']],
})
const NUEVO = real({ id: 'real-nuevo', name: 'Bodegón Nuevo', priceTier: '$' })
const ALL = [PARRILLA, HUERTA, NUEVO, ...RESTAURANTS_FIXTURE]

const today = todayInBuenosAires()
const tomorrow = addDays(today, 1)

beforeEach(() => {
  vi.mocked(fetchRestaurants).mockReset().mockResolvedValue(ALL)
  vi.mocked(fetchOpenRestaurantIds).mockReset().mockResolvedValue([HUERTA.id])
  vi.mocked(fetchRestaurant)
    .mockReset()
    .mockImplementation(async (id) => ALL.find((restaurant) => restaurant.id === id))
})

function renderMap(route = '/mapa') {
  return renderWithProviders(
    <Routes>
      <Route path="/mapa" element={<MapPage />} />
      <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
    </Routes>,
    { route },
  )
}

/** Names in the list; the map shows the same restaurants as markers. */
function listed(): string[] {
  const list = screen.queryByRole('region', { name: /restaurantes?$/ })
  if (!list) return []
  return within(list)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent ?? '')
    .sort()
}

function onMap(name: string) {
  return screen.queryByTitle(name)
}

async function openFilters(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(screen.queryByText('Buscando restaurantes…')).not.toBeInTheDocument())
  await user.click(screen.getByRole('button', { name: /^Filtros/ }))
  return screen.getByRole('dialog', { name: 'Filtros' })
}

const RATED_4 = [
  'Bodegón Estudiantil',
  'Café San Telmo',
  'Huerta Real',
  'La Esquina de Palermo',
  'Sushi Cañitas',
  'Terraza del Río',
  'Verde Que Te Quiero',
]

describe('Rating filter (US-35)', () => {
  it('US-35 S1 keeps only the restaurants with that average or more, on the map and in the list', async () => {
    const user = userEvent.setup()
    renderMap()
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: '4 o más' }))

    expect(listed()).toEqual(RATED_4)
    // 3,96 shows as 4,0 but doesn't reach «4 o más».
    expect(onMap('Parrilla Real')).not.toBeInTheDocument()
    expect(onMap('Huerta Real')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Ver 7 restaurantes' })).toBeInTheDocument()
  })

  it('US-35 S2 updates the result to the new minimum', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?rating=4.5')
    await screen.findByTitle('Huerta Real')
    expect(listed()).toEqual(RATED_4)

    const panel = await openFilters(user)
    await user.click(within(panel).getByRole('button', { name: '3 o más' }))

    expect(listed()).toEqual([...RATED_4, 'Parrilla Real', 'Pizzería del Centro'].sort())
  })

  it('US-35 S3 shows every restaurant again when the minimum is removed', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?rating=4')
    await screen.findByTitle('Huerta Real')

    await user.click(screen.getByRole('button', { name: 'Quitar filtro 4 o más ★' }))

    expect(listed()).toHaveLength(ALL.length)
  })

  it('US-35 S4 hides a restaurant without reviews only while the filter is active', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?rating=3')
    await screen.findByTitle('Huerta Real')
    expect(onMap('Bodegón Nuevo')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar filtro 3 o más ★' }))

    expect(await screen.findByTitle('Bodegón Nuevo')).toBeInTheDocument()
  })
})

describe('Dietary restrictions filter (US-53)', () => {
  it('US-53 S1 keeps the restaurants with an available dish marked with it', async () => {
    const user = userEvent.setup()
    renderMap()
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Sin TACC' }))

    expect(listed()).toEqual(
      [
        'Café San Telmo',
        'Huerta Real',
        'La Esquina de Palermo',
        'Parrilla Real',
        'Sushi Cañitas',
        'Terraza del Río',
      ].sort(),
    )
  })

  it('US-53 S2 asks for one dish that meets every chosen restriction', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?restriccion=sin_tacc')
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Vegano' }))

    expect(listed()).toEqual(['Huerta Real'])
  })

  it('US-53 S3 updates the result when a restriction is taken out', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?restriccion=sin_tacc&restriccion=vegano')
    await screen.findByTitle('Huerta Real')

    await user.click(screen.getByRole('button', { name: 'Quitar filtro Sin TACC' }))

    expect(listed()).toEqual(['Huerta Real', 'Verde Que Te Quiero'])
  })

  it('US-53 S4 shows every restaurant again without restrictions', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?restriccion=vegano')
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Vegano' }))

    expect(listed()).toHaveLength(ALL.length)
  })
})

describe('Day and time filter (US-59)', () => {
  it('US-59 S1 keeps the restaurants where a reservation can start at that hour', async () => {
    const user = userEvent.setup()
    renderMap()
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Mañana' }))
    await user.selectOptions(within(panel).getByLabelText('Hora'), '21:00')

    expect(fetchOpenRestaurantIds).toHaveBeenLastCalledWith(tomorrow, '21:00', '21:00')
    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))
    // The test restaurants have no shifts (F10).
    expect(onMap('La Esquina de Palermo')).not.toBeInTheDocument()
  })

  it('US-59 S2 keeps the restaurants with a start inside the range', async () => {
    const user = userEvent.setup()
    vi.mocked(fetchOpenRestaurantIds).mockResolvedValue([PARRILLA.id, NUEVO.id])
    renderMap()
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Hoy' }))
    await user.click(within(panel).getByRole('radio', { name: 'Rango' }))
    fireEvent.change(within(panel).getByLabelText('Desde'), { target: { value: '12:00' } })
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '14:00' } })

    expect(fetchOpenRestaurantIds).toHaveBeenLastCalledWith(today, '12:00', '14:00')
    await waitFor(() => expect(listed()).toEqual(['Bodegón Nuevo', 'Parrilla Real']))
  })

  it('US-59 S3 asks again when the hour changes', async () => {
    const user = userEvent.setup()
    renderMap(`/mapa?dia=${tomorrow}&hora=21:00`)
    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))

    vi.mocked(fetchOpenRestaurantIds).mockResolvedValue([PARRILLA.id])
    const panel = await openFilters(user)
    await user.selectOptions(within(panel).getByLabelText('Hora'), '13:00')

    expect(fetchOpenRestaurantIds).toHaveBeenLastCalledWith(tomorrow, '13:00', '13:00')
    await waitFor(() => expect(listed()).toEqual(['Parrilla Real']))
  })

  it('US-59 S4 shows every restaurant again when the day and time are removed', async () => {
    const user = userEvent.setup()
    renderMap(`/mapa?dia=${tomorrow}&hora=21:00`)
    const tag = await screen.findByRole('button', {
      name: `Quitar filtro ${shortDayLabel(tomorrow)} · 21:00`,
    })

    await user.click(tag)

    expect(listed()).toHaveLength(ALL.length)
  })

  it('US-59 edge does not apply an inverted range and says why', async () => {
    const user = userEvent.setup()
    renderMap()
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Hoy' }))
    await user.click(within(panel).getByRole('radio', { name: 'Rango' }))
    fireEvent.change(within(panel).getByLabelText('Desde'), { target: { value: '22:00' } })
    fireEvent.change(within(panel).getByLabelText('Hasta'), { target: { value: '20:00' } })

    expect(within(panel).getByRole('alert')).toHaveTextContent(
      'El «hasta» no puede ser anterior al «desde».',
    )
    expect(fetchOpenRestaurantIds).not.toHaveBeenCalled()
    expect(listed()).toHaveLength(ALL.length)
  })

  it('US-59 edge offers only half hours for a point hour', async () => {
    const user = userEvent.setup()
    renderMap()
    const panel = await openFilters(user)

    const hours = within(within(panel).getByLabelText('Hora')).getAllByRole('option')
    expect(hours.map((option) => option.textContent)).toContain('21:30')
    expect(hours.map((option) => option.textContent)).not.toContain('21:10')
  })

  it('US-59 edge waits calmly for the hours and offers a retry when they fail', async () => {
    const user = userEvent.setup()
    let answer: (ids: string[]) => void = () => {}
    vi.mocked(fetchOpenRestaurantIds).mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve
      }),
    )
    renderMap(`/mapa?dia=${tomorrow}&hora=21:00`)
    expect(await screen.findByText(/Buscando restaurantes con ese horario/)).toBeInTheDocument()
    expect(screen.queryByText(/Ningún restaurante/)).not.toBeInTheDocument()
    answer([HUERTA.id])
    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))

    vi.mocked(fetchOpenRestaurantIds).mockRejectedValueOnce(new Error('offline'))
    vi.mocked(fetchOpenRestaurantIds).mockResolvedValueOnce([NUEVO.id])
    const panel = await openFilters(user)
    await user.selectOptions(within(panel).getByLabelText('Hora'), '20:00')
    await user.click(within(panel).getByRole('button', { name: /^Ver/ }))

    expect(await screen.findByText(/No pudimos consultar los horarios/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(listed()).toEqual(['Bodegón Nuevo']))
  })

  it('US-59 edge drops a day of a shared link that already passed and says so', async () => {
    renderMap(`/mapa?dia=${addDays(today, -1)}&hora=21:00&personas=2`)

    expect(await screen.findByText(/El día del enlace ya pasó/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar filtro 2 personas' })).toBeInTheDocument()
    expect(fetchOpenRestaurantIds).not.toHaveBeenCalled()
  })
})

describe('Party size filter (US-61)', () => {
  it('US-61 S1 keeps the restaurants with a table for the whole party', async () => {
    const user = userEvent.setup()
    renderMap()
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Indicar cuántos van' }))
    for (let count = 2; count < 6; count += 1) {
      await user.click(within(panel).getByRole('button', { name: 'Agregar uno' }))
    }

    expect(listed()).toEqual(['Huerta Real'])
    expect(screen.getByRole('button', { name: 'Quitar filtro 6 personas' })).toBeInTheDocument()
  })

  it('US-61 S2 updates the result when the party size changes', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?personas=6')
    const panel = await openFilters(user)
    expect(listed()).toEqual(['Huerta Real'])

    for (let count = 6; count > 2; count -= 1) {
      await user.click(within(panel).getByRole('button', { name: 'Una persona menos' }))
    }

    // The test restaurants have no tables (F10).
    expect(listed()).toEqual(['Bodegón Nuevo', 'Huerta Real', 'Parrilla Real'])
  })

  it('US-61 S3 shows every restaurant again when the party size is removed', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?personas=6')
    const panel = await openFilters(user)

    await user.click(within(panel).getByRole('button', { name: 'Quitar cantidad de personas' }))

    expect(listed()).toHaveLength(ALL.length)
  })
})

describe('Every filter together (spec 027, common scenarios)', () => {
  it('US-35 common S1 shows only the restaurants that meet every filter, price included', async () => {
    renderMap('/mapa?precio=%24%24&rating=4&restriccion=sin_tacc')

    await waitFor(() => expect(listed()).toEqual(['Huerta Real', 'La Esquina de Palermo']))
    expect(onMap('Café San Telmo')).not.toBeInTheDocument()
  })

  it('US-35 common S2 shows each active filter as a removable tag, and removes them all', async () => {
    const user = userEvent.setup()
    renderMap(
      `/mapa?precio=%24%24&rating=4&restriccion=sin_tacc&dia=${tomorrow}&hora=21:00&personas=6`,
    )

    const tags = await screen.findByRole('list', { name: 'Filtros activos' })
    expect(
      within(tags)
        .getAllByRole('button')
        .map((tag) => tag.textContent),
    ).toEqual(['$$', '4 o más ★', 'Sin TACC', `${shortDayLabel(tomorrow)} · 21:00`, '6 personas'])
    expect(screen.getByRole('button', { name: 'Filtros (5 activos)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar todos' }))

    expect(screen.queryByRole('list', { name: 'Filtros activos' })).not.toBeInTheDocument()
    expect(listed()).toHaveLength(ALL.length)
  })

  it('US-59 common S2 labels a range with both ends', async () => {
    renderMap(`/mapa?dia=${tomorrow}&desde=20:00&hasta=22:00`)

    expect(
      await screen.findByRole('button', {
        name: `Quitar filtro ${shortDayLabel(tomorrow)} · 20:00–22:00`,
      }),
    ).toBeInTheDocument()
  })

  it('US-61 common S3 says there are no results and offers to remove the filters', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?personas=20')

    expect(await screen.findByText('Ningún restaurante cumple los filtros elegidos.')).toBeVisible()
    expect(screen.queryByRole('region', { name: /restaurantes?$/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(listed()).toHaveLength(ALL.length)
  })

  it('US-53 common S4 keeps the filters after opening a detail and going back', async () => {
    const user = userEvent.setup()
    renderMap('/mapa?restriccion=sin_tacc&restriccion=vegano')
    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))

    await user.click(screen.getAllByRole('link', { name: 'Ver detalle' })[0])
    await user.click(await screen.findByRole('link', { name: /volver a los restaurantes/i }))

    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))
    expect(screen.getByRole('button', { name: 'Quitar filtro Vegano' })).toBeInTheDocument()
  })

  it('US-59 common S5 starts the reservation with the filtered day, hour and party size', async () => {
    const user = userEvent.setup()
    renderMap(`/mapa?dia=${tomorrow}&hora=21:00&personas=6`)
    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))

    const list = screen.getByRole('region', { name: '1 restaurante' })
    await user.click(within(list).getByRole('link', { name: 'Ver detalle' }))

    expect(await screen.findByRole('link', { name: 'Reservar mesa' })).toHaveAttribute(
      'href',
      `/reservar/${HUERTA.id}?fecha=${tomorrow}&hora=21%3A00&personas=6`,
    )
  })

  it('US-59 common S5 starts the reservation without an hour for a range, from the map', async () => {
    const user = userEvent.setup()
    renderMap(`/mapa?dia=${tomorrow}&desde=20:00&hasta=22:00`)
    await waitFor(() => expect(listed()).toEqual(['Huerta Real']))

    fireEvent.click(screen.getByTitle('Huerta Real'))
    const popup = await waitFor(() => {
      const found = document.querySelector('.leaflet-popup')
      expect(found).toHaveTextContent('Huerta Real')
      return found as HTMLElement
    })
    await user.click(within(popup).getByRole('link', { name: 'Ver detalle' }))

    expect(await screen.findByRole('link', { name: 'Reservar mesa' })).toHaveAttribute(
      'href',
      `/reservar/${HUERTA.id}?fecha=${tomorrow}`,
    )
  })
})
