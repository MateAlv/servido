import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import { HomePage } from './HomePage'

vi.mock('../api/client', () => ({ api: { GET: vi.fn().mockResolvedValue({ data: {} }) } }))

/** Answers /api/me with the given result and /api/reservations/upcoming with these
 * reservations; other calls get a healthy reply. */
function answerMe(me: { data?: unknown; error?: unknown }, upcoming: unknown[] = []) {
  vi.mocked(api.GET).mockImplementation((async (path: string) => {
    if (path === '/api/me') {
      return { ...me, response: new Response(null, { status: me.error ? 401 : 200 }) }
    }
    if (path === '/api/reviews/pending') {
      return {
        data: { author: 'Mateo', reservations: [] },
        response: new Response(null, { status: 200 }),
      }
    }
    if (path === '/api/reservations/upcoming') {
      return { data: { reservations: upcoming }, response: new Response(null, { status: 200 }) }
    }
    return { data: { status: 'ok', database: 'ok' }, response: new Response(null, { status: 200 }) }
  }) as never)
}

function upcomingReservation(id: string, order: Record<string, unknown>) {
  return {
    id,
    restaurant: { id: 'r-1', nombre: `Restaurante ${id}` },
    date: '2026-12-24',
    start_time: '21:00',
    end_time: '22:30',
    party_size: 4,
    table: { capacity: 4, seating_area: 'terrace' },
    status: 'confirmed',
    has_order: false,
    has_cart: false,
    order_open: true,
    order_deadline: '2026-12-24T20:15:00-03:00',
    ...order,
  }
}

function signedInAs(rol: 'diner' | 'restaurant', nombre: string, emailVerificado = true) {
  sessionStorage.setItem('servido-access-token', `token-${rol}`)
  answerMe({
    data: {
      rol,
      id: '1c9d2e4f-3a5b-4c6d-8e7f-9a0b1c2d3e4f',
      nombre,
      email: 'a@b.com',
      email_verificado: emailVerificado,
    },
  })
}

afterEach(() => {
  sessionStorage.clear()
})

describe('HomePage', () => {
  it('shows the promise of the product', async () => {
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      'Llegá y que tu plato ya esté Servido!',
    )
  })

  it('US-1 and US-3 offer a diner to create an account or sign in', async () => {
    renderWithProviders(<HomePage />)
    const diner = await screen.findByRole('region', { name: 'Soy comensal' })

    expect(within(diner).getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registrarme',
    )
    expect(within(diner).getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar?rol=comensal',
    )
  })

  it('US-2 and US-4 offer a restaurant to register or sign in', async () => {
    renderWithProviders(<HomePage />)
    const restaurant = await screen.findByRole('region', { name: 'Soy restaurante' })

    expect(within(restaurant).getByRole('link', { name: 'Sumá tu local' })).toHaveAttribute(
      'href',
      '/suma-tu-local',
    )
    expect(within(restaurant).getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar?rol=restaurante',
    )
  })

  it('US-3 S3 a signed-in diner lands on choosing a restaurant', async () => {
    signedInAs('diner', 'Ana Pérez')
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Hola, Ana')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: '¿Dónde comés hoy?' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Precio' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Soy comensal' })).not.toBeInTheDocument()
  })

  it('US-17 edge lists the upcoming reservations with their order', async () => {
    sessionStorage.setItem('servido-access-token', 'token-diner')
    answerMe(
      {
        data: {
          rol: 'diner',
          id: '1c9d2e4f-3a5b-4c6d-8e7f-9a0b1c2d3e4f',
          nombre: 'Ana',
          email: 'a@b.com',
        },
      },
      [
        upcomingReservation('nuevo', {}),
        upcomingReservation('armando', { has_cart: true }),
        upcomingReservation('cambiando', { has_cart: true, has_order: true }),
        upcomingReservation('confirmado', { has_order: true }),
        upcomingReservation('cerrado', { order_open: false }),
      ],
    )
    renderWithProviders(<HomePage />)

    const list = await screen.findByRole('region', { name: 'Tus próximas reservas' })
    const card = (id: string) =>
      within(list).getByText(`Restaurante ${id}`).closest('li') as HTMLElement
    expect(within(card('nuevo')).getByText(/21:00 · 4 personas/)).toBeInTheDocument()
    expect(within(card('nuevo')).getByRole('link', { name: 'Armar pedido' })).toHaveAttribute(
      'href',
      '/reservas/nuevo/pedido',
    )
    expect(within(card('armando')).getByText('Pedido sin confirmar')).toBeInTheDocument()
    expect(within(card('armando')).getByRole('link', { name: 'Seguir armando' })).toBeVisible()
    expect(
      within(card('cambiando')).getByText('Pedido confirmado · con cambios sin confirmar'),
    ).toBeInTheDocument()
    expect(within(card('cambiando')).getByRole('link', { name: 'Seguir armando' })).toBeVisible()
    expect(within(card('confirmado')).getByText('Pedido confirmado')).toBeInTheDocument()
    expect(within(card('confirmado')).getByRole('link', { name: 'Ver pedido' })).toBeVisible()
    expect(within(card('cerrado')).queryByRole('link')).not.toBeInTheDocument()
  })

  it('US-17 edge hides the list when the diner has no upcoming reservations', async () => {
    signedInAs('diner', 'Ana Pérez')
    renderWithProviders(<HomePage />)

    await screen.findByText('Hola, Ana')
    expect(screen.queryByRole('region', { name: 'Tus próximas reservas' })).not.toBeInTheDocument()
  })

  it('US-4 S2 a signed-in restaurant lands on its panel', async () => {
    signedInAs('restaurant', 'La Esquina')
    renderWithProviders(<HomePage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hola, La Esquina' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Gestión del local' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Datos del restaurante' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Turnos y horarios' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mesas y capacidad' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Platos y menú' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Reservas' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Soy restaurante' })).not.toBeInTheDocument()
  })

  it('US-44 S3 tells an unverified restaurant that it is still hidden', async () => {
    signedInAs('restaurant', 'La Esquina', false)
    renderWithProviders(<HomePage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hola, La Esquina' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Verificación de email' })).toBeInTheDocument()
    expect(screen.getByText(/para publicar tu restaurante/)).toBeInTheDocument()
    expect(screen.getByText('Pendiente de verificación')).toBeInTheDocument()
    expect(screen.getByText(/Verificá tu email para que los comensales/)).toBeInTheDocument()
  })

  it('US-18 edge the restaurant panel links to its cancellations', async () => {
    signedInAs('restaurant', 'La Esquina')
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('link', { name: 'Ver cancelaciones' })).toHaveAttribute(
      'href',
      '/restaurante/cancelaciones',
    )
  })

  it('US-3 S4 an expired session falls back to the public home', async () => {
    sessionStorage.setItem('servido-access-token', 'token-vencido')
    answerMe({ error: { detail: 'Tu sesión no es válida o venció. Volvé a ingresar.' } })
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('region', { name: 'Soy comensal' })).toBeInTheDocument()
    expect(sessionStorage.getItem('servido-access-token')).toBeNull()
  })
})
