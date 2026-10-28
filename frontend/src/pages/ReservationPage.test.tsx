import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'

import {
  fetchAvailability,
  fetchAvailableTables,
  type DayAvailability,
  type TablesAvailability,
} from '../api/availability'
import { SessionExpiredError } from '../api/errors'
import { confirmReservation, fetchDayReservations, type Reservation } from '../api/reservations'
import { signOut, useAccount } from '../api/session'
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

vi.mock('../api/reservations', () => ({
  confirmReservation: vi.fn(),
  fetchDayReservations: vi.fn(),
}))

vi.mock('../api/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/session')>()
  return { ...actual, useAccount: vi.fn(), signOut: vi.fn() }
})

const confirmMock = vi.mocked(confirmReservation)
const dayReservationsMock = vi.mocked(fetchDayReservations)
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
  confirmMock.mockReset()
  dayReservationsMock.mockReset()
  dayReservationsMock.mockResolvedValue([])
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

  it('US-11 edge sends a visitor to the sign-in page and back', async () => {
    useAccountMock.mockReturnValue({ data: null, isPending: false } as unknown as ReturnType<
      typeof useAccount
    >)

    renderWithProviders(
      <Routes>
        <Route path="/reservar/:restauranteId" element={<ReservationPage />} />
        <Route path="/ingresar" element={<LocationProbe />} />
      </Routes>,
      { route: `/reservar/${RESTAURANT_ID}?fecha=${DATE}` },
    )

    const back = `/reservar/${RESTAURANT_ID}?fecha=${DATE}`
    expect(
      await screen.findByText(`En /ingresar?volver=${encodeURIComponent(back)}`),
    ).toBeInTheDocument()
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
    // A visitor is invited to sign in and comes back to the booking page.
    expect(screen.getByRole('link', { name: 'Ingresá para reservar' })).toHaveAttribute(
      'href',
      `/ingresar?rol=comensal&volver=${encodeURIComponent(`/reservar/${RESTAURANT_ID}`)}`,
    )
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

/** Shows where the app navigated, with its query string. */
function LocationProbe() {
  const location = useLocation()
  return <p>En {location.pathname + location.search}</p>
}

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'res-1',
    restaurant: { id: RESTAURANT_ID, nombre: 'La Esquina de Palermo' },
    date: DATE,
    start_time: '12:00',
    end_time: '13:30',
    party_size: 2,
    table: { capacity: 2, seating_area: 'indoor' },
    status: 'confirmed',
    ...overrides,
  }
}

async function openReview(query = `?fecha=${DATE}&hora=12:00`) {
  const user = userEvent.setup()
  renderPage(query)
  const next = await screen.findByRole('button', { name: 'Siguiente' })
  await waitFor(() => expect(next).toBeEnabled())
  await user.click(next)
  await screen.findByRole('heading', { name: 'Revisá tu reserva' })
  return user
}

describe('ReservationPage (US-13)', () => {
  it('US-13 S1 opens the review with the selection', async () => {
    await openReview()

    expect(screen.getByRole('button', { name: 'Confirmar reserva' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Fecha')).not.toBeInTheDocument()
  })

  it('US-13 S2 shows every chosen value and the assigned table', async () => {
    await openReview(`?fecha=${DATE}&hora=12:00&personas=2&tipo=outdoor`)

    const summary = within(
      screen.getByRole('heading', { name: 'Revisá tu reserva' }).parentElement!,
    )
    expect(summary.getByText('La Esquina de Palermo')).toBeInTheDocument()
    expect(summary.getByText('12:00 a 13:30')).toBeInTheDocument()
    expect(summary.getByText('2')).toBeInTheDocument()
    // The smallest group of the chosen area that seats the party (decision D2).
    expect(summary.getByText('Mesa para 4 · Afuera')).toBeInTheDocument()
  })

  it('US-13 S3 goes back with the selection kept', async () => {
    const user = await openReview(`?fecha=${DATE}&hora=12:00&personas=2&tipo=outdoor`)

    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(await screen.findByLabelText('Fecha')).toHaveValue(DATE)
    expect(screen.getByRole('button', { name: '12:00' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Afuera/ })).toHaveAttribute('aria-pressed', 'true')
    expect(partySize()).toContain('2')
  })

  it('US-13 S4 creates nothing until the diner confirms', async () => {
    const user = await openReview()

    await user.click(screen.getByRole('button', { name: 'Volver' }))
    await screen.findByLabelText('Fecha')

    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('US-13 S5 confirms and shows the reservation', async () => {
    confirmMock.mockResolvedValue({ ok: true, reservation: reservation() })
    const user = await openReview()

    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    expect(await screen.findByText('Reserva confirmada')).toBeInTheDocument()
    expect(confirmMock).toHaveBeenCalledWith({
      restaurant_id: RESTAURANT_ID,
      date: DATE,
      start_time: '12:00',
      party_size: 1,
      table: { capacity: 2, seating_area: 'indoor' },
      request_id: expect.any(String),
    })
    expect(screen.getByText('Mesa para 2 · Adentro')).toBeInTheDocument()
  })

  it('US-13 S6 warns about an overlapping reservation and still confirms', async () => {
    dayReservationsMock.mockResolvedValue([
      reservation({
        id: 'res-0',
        restaurant: { id: 'otro', nombre: 'Bodegón Estudiantil' },
        start_time: '11:30',
        end_time: '13:00',
      }),
    ])
    confirmMock.mockResolvedValue({ ok: true, reservation: reservation() })
    const user = await openReview()

    expect(
      await screen.findByText(
        'Ya tenés una reserva en Bodegón Estudiantil de 11:30 a 13:00. Podés confirmar igual.',
      ),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    expect(await screen.findByText('Reserva confirmada')).toBeInTheDocument()
  })

  it('US-13 edge returns to the selection when the table was taken', async () => {
    confirmMock.mockResolvedValue({
      ok: false,
      status: 409,
      message: 'La mesa se ocupó mientras confirmabas. Elegí otro horario o tipo de mesa.',
    })
    const user = await openReview()

    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    expect(
      await screen.findByText(
        'La mesa se ocupó mientras confirmabas. Elegí otro horario o tipo de mesa.',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Fecha')).toHaveValue(DATE)
    expect(screen.queryByRole('heading', { name: 'Revisá tu reserva' })).not.toBeInTheDocument()
  })

  it('US-13 edge signs out when the session expired at confirmation', async () => {
    confirmMock.mockResolvedValue({ ok: false, status: 401, message: 'Tu sesión venció.' })
    const user = await openReview()

    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    // Without a session the page sends the visitor to sign in and back (test above).
    await waitFor(() => expect(signOut).toHaveBeenCalled())
  })

  it('US-13 edge signs out when the session expired while choosing', async () => {
    availabilityMock.mockRejectedValue(new SessionExpiredError())
    renderPage(`?fecha=${DATE}`)

    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(availabilityMock).toHaveBeenCalledTimes(1)
  })

  it('US-13 edge reuses the request id when the confirmation is retried', async () => {
    confirmMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      message: 'No pudimos confirmar la reserva. Probá de nuevo.',
    })
    confirmMock.mockResolvedValueOnce({ ok: true, reservation: reservation() })
    const user = await openReview()

    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))
    expect(
      await screen.findByText('No pudimos confirmar la reserva. Probá de nuevo.'),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    expect(await screen.findByText('Reserva confirmada')).toBeInTheDocument()
    const [first, second] = confirmMock.mock.calls.map(([request]) => request.request_id)
    expect(second).toBe(first)
  })

  it('US-13 edge says the restaurant was not found', async () => {
    confirmMock.mockResolvedValue({
      ok: false,
      status: 404,
      message: 'No encontramos ese restaurante.',
    })
    const user = await openReview()

    await user.click(screen.getByRole('button', { name: 'Confirmar reserva' }))

    expect(
      await screen.findByRole('heading', { name: 'No encontramos ese restaurante' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al mapa' })).toHaveAttribute('href', '/mapa')
  })

  it('US-13 edge returns a reloaded review whose table is gone to the selection', async () => {
    tablesMock.mockResolvedValue(tablesAvailability({ tables: [] }))
    renderPage(`?fecha=${DATE}&hora=12:00&paso=revision`)

    expect(
      await screen.findByText(
        'La mesa que elegiste ya no está disponible. Elegí otro horario o tipo de mesa.',
      ),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Fecha')).toHaveValue(DATE)
    expect(screen.queryByRole('heading', { name: 'Revisá tu reserva' })).not.toBeInTheDocument()
  })

  it("US-13 edge confirms only after checking the diner's other reservations", async () => {
    dayReservationsMock.mockRejectedValue(new Error('No pudimos ver tus reservas.'))
    await openReview()

    expect(
      await screen.findByText('No pudimos revisar tus otras reservas de ese día.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar reserva' })).toBeEnabled()
  })
})
