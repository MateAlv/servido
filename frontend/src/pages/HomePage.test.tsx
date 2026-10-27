import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import { HomePage } from './HomePage'

vi.mock('../api/client', () => ({ api: { GET: vi.fn().mockResolvedValue({ data: {} }) } }))

/** Answers /api/me with the given result; other calls get a healthy reply. */
function answerMe(me: { data?: unknown; error?: unknown }) {
  vi.mocked(api.GET).mockImplementation((async (path: string) => {
    if (path === '/api/me') {
      return { ...me, response: new Response(null, { status: me.error ? 401 : 200 }) }
    }
    return { data: { status: 'ok', database: 'ok' }, response: new Response(null, { status: 200 }) }
  }) as never)
}

function signedInAs(rol: 'diner' | 'restaurant', nombre: string) {
  sessionStorage.setItem('servido-access-token', `token-${rol}`)
  answerMe({ data: { rol, id: '1c9d2e4f-3a5b-4c6d-8e7f-9a0b1c2d3e4f', nombre, email: 'a@b.com' } })
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

  it('US-3 S4 an expired session falls back to the public home', async () => {
    sessionStorage.setItem('servido-access-token', 'token-vencido')
    answerMe({ error: { detail: 'Tu sesión no es válida o venció. Volvé a ingresar.' } })
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('region', { name: 'Soy comensal' })).toBeInTheDocument()
    expect(sessionStorage.getItem('servido-access-token')).toBeNull()
  })
})
