import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import { HomePage } from './HomePage'

vi.mock('../api/client', () => ({ api: { GET: vi.fn().mockResolvedValue({ data: {} }) } }))

/** Answers /api/me with the given result; other calls (the footer's API status) get a healthy reply. */
function answerMe(me: { data?: unknown; error?: unknown }) {
  vi.mocked(api.GET).mockImplementation((async (path: string) => {
    if (path === '/api/me') {
      return { ...me, response: new Response(null, { status: me.error ? 401 : 200 }) }
    }
    return { data: { status: 'ok', database: 'ok' }, response: new Response(null, { status: 200 }) }
  }) as never)
}

describe('HomePage', () => {
  it('shows the promise of the product', () => {
    renderWithProviders(<HomePage />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Llegá y que tu plato ya esté Servido!',
    )
  })

  it('changes its calls to action for restaurants', () => {
    renderWithProviders(<HomePage />)

    fireEvent.click(screen.getByRole('radio', { name: 'Soy restaurante' }))

    expect(screen.getByRole('button', { name: 'Sumar mi local' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buscar mesa' })).not.toBeInTheDocument()
  })

  it('US-3 S1 opens the login popup from the top bar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('dialog', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Comensal' })).toBeChecked()
  })

  it('US-4 S1 opens the popup on the restaurant side from "Ya tengo cuenta"', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    await user.click(screen.getByRole('radio', { name: 'Soy restaurante' }))
    await user.click(screen.getAllByRole('button', { name: 'Ya tengo cuenta' })[0])

    expect(await screen.findByRole('dialog', { name: 'Ingresá a tu cuenta' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Restaurante' })).toBeChecked()
  })

  it('US-3 S3 shows the signed-in name instead of the entry buttons', async () => {
    sessionStorage.setItem('servido-access-token', 'token-comensal')
    answerMe({
      data: {
        rol: 'diner',
        id: '1c9d2e4f-3a5b-4c6d-8e7f-9a0b1c2d3e4f',
        nombre: 'Ana Pérez',
        email: 'ana@example.com',
      },
    })
    renderWithProviders(<HomePage />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ingresar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sumá tu local' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ingresar como comensal' })).not.toBeInTheDocument()
  })

  it('US-4 S2 restaurant session hides the restaurant entry buttons too', async () => {
    sessionStorage.setItem('servido-access-token', 'token-restaurante')
    answerMe({
      data: {
        rol: 'restaurant',
        id: '5f1e0c2a-9b7d-4c1e-8a3f-2d6b7e9c4a10',
        nombre: 'La Esquina',
        email: 'local@example.com',
      },
    })
    renderWithProviders(<HomePage />)
    fireEvent.click(screen.getByRole('radio', { name: 'Soy restaurante' }))

    expect(await screen.findByText('La Esquina')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sumar mi local' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ya tengo cuenta' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Registrar mi restaurante' }),
    ).not.toBeInTheDocument()
  })

  it('US-3 S5 cerrar sesión forgets the token and shows the entry buttons again', async () => {
    sessionStorage.setItem('servido-access-token', 'token-comensal')
    answerMe({
      data: {
        rol: 'diner',
        id: '1c9d2e4f-3a5b-4c6d-8e7f-9a0b1c2d3e4f',
        nombre: 'Ana Pérez',
        email: 'ana@example.com',
      },
    })
    const user = userEvent.setup()
    renderWithProviders(<HomePage />)

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))

    expect(sessionStorage.getItem('servido-access-token')).toBeNull()
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument()
  })

  it('US-3 S4 an expired session falls back to the entry buttons', async () => {
    sessionStorage.setItem('servido-access-token', 'token-vencido')
    answerMe({ error: { detail: 'Tu sesión no es válida o venció. Volvé a ingresar.' } })
    renderWithProviders(<HomePage />)

    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(sessionStorage.getItem('servido-access-token')).toBeNull()
  })
})
