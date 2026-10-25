import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { googleReturns } from '../test/fakeGoogle'
import { renderWithProviders } from '../test/renderWithProviders'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))
vi.mock('../lib/google', async () => {
  const { fakeGoogle } = await import('../test/fakeGoogle')
  return { GOOGLE_CLIENT_ID: 'test-client', loadGoogleIdentity: () => Promise.resolve(fakeGoogle) }
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
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    expect(await screen.findByRole('button', { name: 'Acceder con Google' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Restaurante' }))
    expect(screen.queryByRole('button', { name: 'Acceder con Google' })).not.toBeInTheDocument()
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
})
