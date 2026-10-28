import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { googleReturns } from '../test/fakeGoogle'
import { renderWithProviders } from '../test/renderWithProviders'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))
vi.mock('../lib/google', async (importOriginal) => {
  const { fakeGoogle } = await import('../test/fakeGoogle')
  return {
    ...(await importOriginal<typeof import('../lib/google')>()),
    loadGoogleIdentity: () => Promise.resolve(fakeGoogle),
  }
})

const post = vi.mocked(api.POST)

function apiAnswers(status: number, detail: string) {
  post.mockResolvedValue({
    data: undefined,
    error: { detail },
    response: new Response(null, { status }),
  })
}

describe('LoginPage', () => {
  beforeEach(() => {
    post.mockReset()
    googleReturns('google-id-token')
  })

  it('US-52 S1 offers Google sign-in to diners', async () => {
    renderWithProviders(<LoginPage />)

    expect(await screen.findByRole('button', { name: 'Acceder con Google' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('US-28 S1 offers Google sign-in to restaurants', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(screen.getByRole('radio', { name: 'Restaurante' }))

    expect(await screen.findByRole('button', { name: 'Acceder con Google' })).toBeInTheDocument()
  })

  it('keeps one login form when switching account types repeatedly', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('radio', { name: 'Restaurante' }))
    await user.click(screen.getByRole('radio', { name: 'Comensal' }))
    await user.click(screen.getByRole('radio', { name: 'Restaurante' }))

    expect(screen.getAllByLabelText('Email')).toHaveLength(1)
    expect(screen.getAllByLabelText('Contraseña')).toHaveLength(1)
    expect(document.querySelectorAll('form')).toHaveLength(1)
  })

  it('US-28 S2 signs the restaurant in with Google', async () => {
    post.mockResolvedValue({
      data: {
        restaurante: {
          id: 'restaurant-1',
          nombre: 'La Esquina de Palermo',
          email: 'local@example.com',
          cuit: '30712345671',
          telefono: '11 5555-4444',
        },
        access_token: 'session-token',
        token_type: 'bearer',
      },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/ingresar?rol=restaurante' })

    await user.click(await screen.findByRole('button', { name: 'Acceder con Google' }))

    expect(post).toHaveBeenCalledWith('/api/auth/restaurante/google', {
      body: { credential: 'google-id-token' },
    })
    expect(await screen.findByText('¡Hola, La Esquina de Palermo!')).toBeInTheDocument()
  })

  it('US-28 S3 offers to register the restaurant with the same Google account', async () => {
    apiAnswers(404, 'No existe una cuenta de restaurante asociada a ese email de Google.')
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />, { route: '/ingresar?rol=restaurante' })

    await user.click(await screen.findByRole('button', { name: 'Acceder con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No existe una cuenta de restaurante asociada a ese email de Google.',
    )
    expect(
      screen.getByRole('button', { name: 'Registrar el restaurante con Google' }),
    ).toBeInTheDocument()
  })

  it('US-52 S3 offers to create an account when there is none', async () => {
    apiAnswers(404, 'No existe una cuenta de Servido! asociada a ese email de Google.')
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(await screen.findByRole('button', { name: 'Acceder con Google' }))

    expect(post).toHaveBeenCalledWith('/api/auth/comensal/google', {
      body: { credential: 'google-id-token' },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No existe una cuenta de Servido! asociada a ese email de Google.',
    )
    expect(screen.getByRole('button', { name: 'Crear cuenta con Google' })).toBeInTheDocument()
  })

  it('US-52 S3 creates the account with the same Google account', async () => {
    apiAnswers(404, 'No existe una cuenta de Servido! asociada a ese email de Google.')
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)
    await user.click(await screen.findByRole('button', { name: 'Acceder con Google' }))
    post.mockResolvedValue({
      data: {
        comensal: {
          id: 'diner-1',
          nombre: 'Lucía',
          email: 'lucia@example.com',
          email_verificado: true,
        },
        access_token: 'session-token',
        token_type: 'bearer',
      },
      error: undefined,
      response: new Response(null, { status: 201 }),
    })

    await user.click(await screen.findByRole('button', { name: 'Crear cuenta con Google' }))

    expect(post).toHaveBeenLastCalledWith('/api/comensales/google', {
      body: { credential: 'google-id-token', nombre: undefined },
    })
    expect(await screen.findByText('¡Hola, Lucía!')).toBeInTheDocument()
  })

  it('US-52 S4 shows that Google sign-in failed', async () => {
    apiAnswers(401, 'No pudimos ingresar con Google. Probá de nuevo.')
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(await screen.findByRole('button', { name: 'Acceder con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos ingresar con Google. Probá de nuevo.',
    )
    expect(
      screen.queryByRole('button', { name: 'Crear cuenta con Google' }),
    ).not.toBeInTheDocument()
  })

  it('US-13 edge goes back to the page it came from', async () => {
    post.mockResolvedValue({
      data: {
        comensal: {
          id: 'c-1',
          nombre: 'Martín',
          email: 'martin@example.com',
          email_verificado: true,
        },
        access_token: 'session-token',
        token_type: 'bearer',
      },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    function Here() {
      const location = useLocation()
      return <p>En {location.pathname + location.search}</p>
    }
    const review = '/reservar/abc?fecha=2026-11-03&hora=20:00&paso=revision'
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/ingresar" element={<LoginPage />} />
        <Route path="/reservar/:restauranteId" element={<Here />} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>,
      { route: `/ingresar?volver=${encodeURIComponent(review)}` },
    )

    await user.type(screen.getByLabelText('Email'), 'martin@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Segura123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText(`En ${review}`)).toBeInTheDocument()
  })

  it('US-13 edge never returns to another site after signing in', async () => {
    post.mockResolvedValue({
      data: {
        comensal: {
          id: 'c-1',
          nombre: 'Martín',
          email: 'martin@example.com',
          email_verificado: true,
        },
        access_token: 'session-token',
        token_type: 'bearer',
      },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    const user = userEvent.setup()
    renderWithProviders(
      <Routes>
        <Route path="/ingresar" element={<LoginPage />} />
        <Route path="/" element={<p>Inicio</p>} />
      </Routes>,
      { route: `/ingresar?volver=${encodeURIComponent('//evil.example.com')}` },
    )

    await user.type(screen.getByLabelText('Email'), 'martin@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Segura123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Inicio')).toBeInTheDocument()
  })
})
