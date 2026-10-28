import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'

import {
  fetchAvailability,
  fetchAvailableTables,
  type DayAvailability,
  type TablesAvailability,
} from '../api/availability'
import { useAccount } from '../api/session'
import { todayInBuenosAires } from '../lib/date'
import { renderWithProviders } from '../test/renderWithProviders'
import { ReservationPage } from './ReservationPage'
import { RestaurantDetailPage } from './RestaurantDetailPage'

// The page reads the API through availability.ts and restaurants.ts; the tests replace both
// with deterministic doubles.
vi.mock('../api/availability', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/availability')>()
  return { ...actual, fetchAvailability: vi.fn(), fetchAvailableTables: vi.fn() }
})

// RESTAURANT_ID is a real (bookable) restaurant; TEST_RESTAURANT_ID is one of the test
// restaurants of spec 002, which can't be booked (decision D4).
const TEST_RESTAURANT_ID = 'r-bodegon'
vi.mock('../api/restaurants', async () => {
  const { testRestaurant } = await import('../data/restaurants.fixture')
  return {
    fetchRestaurant: vi.fn(async (id: string) => {
      if (id === TEST_RESTAURANT_ID) return testRestaurant(id)
      const restaurant = testRestaurant('r-la-esquina')
      return restaurant && { ...restaurant, id, bookable: true }
    }),
  }
})

vi.mock('../api/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/session')>()
  return { ...actual, useAccount: vi.fn() }
})

const availabilityMock = vi.mocked(fetchAvailability)
const tablesMock = vi.mocked(fetchAvailableTables)
const useAccountMock = vi.mocked(useAccount)

const RESTAURANT_ID = '6f1c0000-0000-4000-8000-000000000001'
const DINER = { rol: 'diner', id: 'c-1', nombre: 'Ana', email: 'ana@example.com' }
const RESTAURANT_ACCOUNT = {
  rol: 'restaurant',
  id: 'u-1',
  nombre: 'Solo',
  email: 'solo@example.com',
}

/** A date far enough ahead to never be in the past while the suite runs. */
const DATE = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))

function dayAvailability(overrides: Partial<DayAvailability> = {}): DayAvailability {
  return {
    restaurant_id: RESTAURANT_ID,
    date: DATE,
    open: true,
    duration_minutes: 90,
    max_party_size: 4,
    slots: [
      { start_time: '12:00', available: true },
      { start_time: '12:30', available: false },
      { start_time: '13:00', available: true },
    ],
    ...overrides,
  }
}

function tablesAvailability(overrides: Partial<TablesAvailability> = {}): TablesAvailability {
  return {
    restaurant_id: RESTAURANT_ID,
    date: DATE,
    start_time: '12:00',
    ends_at: `${DATE}T13:30:00-03:00`,
    tables: [
      { capacity: 2, seating_area: 'indoor', free: 1 },
      { capacity: 4, seating_area: 'outdoor', free: 1 },
    ],
    ...overrides,
  }
}

function renderPage(query = '') {
  return renderWithProviders(
    <Routes>
      <Route path="/reservar/:restauranteId" element={<ReservationPage />} />
      <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
      <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
      <Route path="/" element={<p>Inicio</p>} />
    </Routes>,
    { route: `/reservar/${RESTAURANT_ID}${query}` },
  )
}

/** Picks a date the way the native input reports it: a change event with the new value. */
function chooseDateUsing(input: HTMLElement, value = DATE) {
  fireEvent.change(input, { target: { value } })
}

function partySize() {
  return screen.getByRole('group', { name: 'Cantidad de personas' }).textContent
}

beforeEach(() => {
  availabilityMock.mockReset()
  tablesMock.mockReset()
  availabilityMock.mockResolvedValue(dayAvailability())
  tablesMock.mockResolvedValue(tablesAvailability())
  useAccountMock.mockReturnValue({ data: DINER, isPending: false } as unknown as ReturnType<
    typeof useAccount
  >)
})

describe('ReservationPage (US-11)', () => {
  it('US-11 S1 offers date, time and seating preference', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'La Esquina de Palermo' }),
    ).toBeInTheDocument()
    const dateInput = await screen.findByLabelText('Fecha')
    expect(dateInput).toHaveAttribute('min', todayInBuenosAires())

    chooseDateUsing(dateInput)

    expect(await screen.findByRole('button', { name: '12:00' })).toBeInTheDocument()
    expect(screen.getByText('Máximo 4 personas')).toBeInTheDocument()
    const preference = screen.getByRole('group', { name: 'Preferencia de tipo de mesa' })
    expect(within(preference).getByRole('button', { name: 'Sin preferencia' })).toBeInTheDocument()
    expect(within(preference).getByRole('button', { name: 'Adentro' })).toBeInTheDocument()
    expect(within(preference).getByRole('button', { name: 'Afuera' })).toBeInTheDocument()
    expect(within(preference).getByRole('button', { name: 'Terraza' })).toBeInTheDocument()
  })

  it('US-11 S1 enables «Siguiente» only when the selection is complete', async () => {
    renderPage()

    const next = await screen.findByRole('button', { name: 'Siguiente' })
    expect(next).toBeDisabled()

    chooseDateUsing(await screen.findByLabelText('Fecha'))
    expect(await screen.findByRole('button', { name: '12:00' })).toBeInTheDocument()
    expect(next).toBeDisabled()

    await userEvent.setup().click(screen.getByRole('button', { name: '12:00' }))

    await screen.findByText(/te asignamos una automáticamente/i)
    await waitFor(() => expect(next).toBeEnabled())
  })

  it('US-11 S2 does not allow a past date', async () => {
    renderPage()

    chooseDateUsing(await screen.findByLabelText('Fecha'), '2020-01-01')

    expect(screen.getByRole('alert')).toHaveTextContent('No podés reservar en una fecha pasada.')
    expect(availabilityMock).not.toHaveBeenCalled()
  })

  it('US-11 S4 disables an occupied time', async () => {
    const user = userEvent.setup()
    renderPage()
    chooseDateUsing(await screen.findByLabelText('Fecha'))

    const occupied = await screen.findByRole('button', { name: '12:30 Ocupado' })
    expect(occupied).toBeDisabled()
    await user.click(occupied)

    expect(tablesMock).not.toHaveBeenCalled()
  })

  it('US-11 S5 asks again for the tables when the time changes', async () => {
    const user = userEvent.setup()
    renderPage(`?fecha=${DATE}`)
    await user.click(await screen.findByRole('button', { name: '12:00' }))
    expect(await screen.findByText(/te asignamos una automáticamente/i)).toBeInTheDocument()
    expect(tablesMock).toHaveBeenCalledWith(RESTAURANT_ID, DATE, '12:00', 1)

    await user.click(screen.getByRole('button', { name: '13:00' }))

    expect(await screen.findByText(/te asignamos una automáticamente/i)).toBeInTheDocument()
    expect(tablesMock).toHaveBeenCalledWith(RESTAURANT_ID, DATE, '13:00', 1)
  })

  it('US-11 S5 clears a time that is no longer available and keeps the date', async () => {
    availabilityMock.mockResolvedValueOnce(dayAvailability()).mockResolvedValueOnce(
      dayAvailability({
        slots: [
          { start_time: '12:00', available: true },
          { start_time: '13:00', available: false },
        ],
      }),
    )
    const user = userEvent.setup()
    renderPage(`?fecha=${DATE}&hora=13:00`)
    await screen.findByRole('button', { name: '13:00' })

    await user.click(screen.getByRole('button', { name: 'Agregar uno' }))

    expect(
      await screen.findByText('El horario de las 13:00 ya no está disponible. Elegí otro.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toHaveValue(DATE)
    // The toast paints before the URL settles on the chip, so wait for the cleared time.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '13:00 Ocupado' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
  })

  it('US-11 S6 shows only the tables of the chosen seating area', async () => {
    const user = userEvent.setup()
    renderPage(`?fecha=${DATE}&hora=12:00`)
    expect(await screen.findByText(/hay mesa disponible para ese día/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Afuera' }))

    expect(await screen.findByText(/hay mesa disponible en afuera/i)).toBeInTheDocument()

    // The terrace has no free table at this start, so the preference itself is not offered (S7).
    expect(screen.getByRole('button', { name: 'Terraza Sin mesas' })).toBeDisabled()

    // The controls stay usable: the diner can go back to «Sin preferencia».
    await user.click(screen.getByRole('button', { name: 'Sin preferencia' }))
    expect(await screen.findByText(/hay mesa disponible para ese día/i)).toBeInTheDocument()
  })

  it('US-11 S7 informs there are no tables and keeps the controls usable', async () => {
    tablesMock.mockResolvedValue(tablesAvailability({ tables: [] }))
    const user = userEvent.setup()
    renderPage(`?fecha=${DATE}&hora=12:00`)

    expect(
      await screen.findByText(
        /no hay mesas disponibles para esta fecha y horario\. podés cambiar/i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '13:00' }))
    expect(screen.getByRole('button', { name: '13:00' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('US-11 edge caps the party size at the restaurant maximum', async () => {
    renderPage(`?fecha=${DATE}&personas=9`)

    expect(
      await screen.findByText('La capacidad máxima de este restaurante es de 4 personas.'),
    ).toBeInTheDocument()
    expect(availabilityMock).toHaveBeenCalledWith(RESTAURANT_ID, DATE, 9)
    await waitFor(() => expect(availabilityMock).toHaveBeenCalledWith(RESTAURANT_ID, DATE, 4))
    expect(partySize()).toContain('4')
    expect(screen.getByText('Máximo 4 personas')).toBeInTheDocument()
  })

  it('US-11 edge keeps the selection when the page reloads', async () => {
    renderPage(`?fecha=${DATE}&hora=12:00&personas=3&tipo=outdoor`)

    expect(await screen.findByRole('button', { name: '12:00' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByLabelText('Fecha')).toHaveValue(DATE)
    expect(partySize()).toContain('3')
    expect(screen.getByRole('button', { name: 'Afuera' })).toHaveAttribute('aria-pressed', 'true')
    expect(availabilityMock).toHaveBeenCalledWith(RESTAURANT_ID, DATE, 3)
    expect(tablesMock).toHaveBeenCalledWith(RESTAURANT_ID, DATE, '12:00', 3)
  })

  it('US-11 edge ignores an invalid value in the URL', async () => {
    renderPage('?fecha=2020-01-01&hora=99:99&personas=abc&tipo=rooftop')

    expect(await screen.findByText('Elegí una fecha para ver los horarios.')).toBeInTheDocument()
    expect(partySize()).toContain('1')
    expect(availabilityMock).not.toHaveBeenCalled()
    expect(tablesMock).not.toHaveBeenCalled()
  })

  it('US-11 edge sends a visitor to the sign-in page', async () => {
    useAccountMock.mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<
      typeof useAccount
    >)

    renderPage()

    expect(await screen.findByText('Pantalla de ingreso')).toBeInTheDocument()
  })

  it('US-11 edge sends a restaurant account back home', async () => {
    useAccountMock.mockReturnValue({
      data: RESTAURANT_ACCOUNT,
      isPending: false,
    } as unknown as ReturnType<typeof useAccount>)

    renderPage()

    expect(await screen.findByText('Inicio')).toBeInTheDocument()
  })

  it('US-11 edge offers the reserve link to a diner only', async () => {
    const { unmount } = renderWithProviders(
      <Routes>
        <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
      </Routes>,
      { route: `/restaurantes/${RESTAURANT_ID}` },
    )

    expect(await screen.findByRole('link', { name: 'Reservar mesa' })).toHaveAttribute(
      'href',
      `/reservar/${RESTAURANT_ID}`,
    )
    unmount()

    useAccountMock.mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<
      typeof useAccount
    >)
    renderWithProviders(
      <Routes>
        <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
      </Routes>,
      { route: `/restaurantes/${RESTAURANT_ID}` },
    )

    await screen.findByRole('heading', { level: 1, name: 'La Esquina de Palermo' })
    expect(screen.queryByRole('link', { name: 'Reservar mesa' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reservar mesa' })).toBeDisabled()
  })

  it('D4 keeps the test restaurants out of the booking flow', async () => {
    const { unmount } = renderWithProviders(
      <Routes>
        <Route path="/restaurantes/:id" element={<RestaurantDetailPage />} />
      </Routes>,
      { route: `/restaurantes/${TEST_RESTAURANT_ID}` },
    )

    await screen.findByRole('heading', { level: 1, name: 'Bodegón Estudiantil' })
    expect(screen.queryByRole('link', { name: 'Reservar mesa' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reservar mesa' })).toBeDisabled()
    unmount()

    renderWithProviders(
      <Routes>
        <Route path="/reservar/:restauranteId" element={<ReservationPage />} />
      </Routes>,
      { route: `/reservar/${TEST_RESTAURANT_ID}` },
    )

    expect(
      await screen.findByText('Este restaurante todavía no toma reservas.'),
    ).toBeInTheDocument()
    expect(availabilityMock).not.toHaveBeenCalled()
  })
})
