import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { googleReturns } from '../test/fakeGoogle'
import { renderWithProviders } from '../test/renderWithProviders'
import { LoginPage } from './LoginPage'
import { RegisterPage } from './RegisterPage'
import { RestaurantRegisterPage } from './RestaurantRegisterPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))
vi.mock('../lib/google', async () => {
  const { fakeGoogle } = await import('../test/fakeGoogle')
  return { GOOGLE_CLIENT_ID: 'test-client', loadGoogleIdentity: () => Promise.resolve(fakeGoogle) }
})

const post = vi.mocked(api.POST)

const createdWithGoogle = {
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
}

function apiAnswers(status: number, detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status }) }
}

describe('auth pages', () => {
  beforeEach(() => {
    post.mockReset()
    sessionStorage.clear()
    googleReturns('google-id-token')
  })

  it('US-1 S1 identifies email and password as required', () => {
    renderWithProviders(<RegisterPage />)

    expect(screen.getByLabelText('Email *')).toBeRequired()
    expect(screen.getByLabelText('Contraseña *')).toBeRequired()
    expect(screen.getByLabelText('Confirmar contraseña *')).toBeRequired()
  })

  it('US-1 S3 reports server validation without refreshing', async () => {
    post.mockResolvedValue({
      data: undefined,
      error: {
        'application/json': {
          detail: [
            { loc: ['body', 'email'], msg: 'Ingresá un email válido.', type: 'value_error' },
          ],
        },
      },
      response: new Response(null, { status: 400 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText('Email *'), 'no-es-email')
    await user.type(screen.getByLabelText('Contraseña *'), '1234567')
    await user.type(screen.getByLabelText('Confirmar contraseña *'), '1234567')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ingresá un email válido.')
    expect(screen.getByLabelText('Email *')).toHaveValue('no-es-email')
  })

  it('US-1 S5 asks to retype the password when the confirmation differs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText('Nombre *'), 'Martín')
    await user.type(screen.getByLabelText('Email *'), 'martin@example.com')
    await user.type(screen.getByLabelText('Contraseña *'), 'Servido2026')
    await user.type(screen.getByLabelText('Confirmar contraseña *'), 'Servido2025')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.')
    expect(post).not.toHaveBeenCalled()
  })

  it('US-2 S4 asks to retype the password when the confirmation differs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantRegisterPage />)

    await user.type(screen.getByLabelText('Contraseña *'), 'Servido2026')
    await user.type(screen.getByLabelText('Confirmar contraseña *'), 'Servido2025')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta del restaurante' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Las contraseñas no coinciden.')
    expect(post).not.toHaveBeenCalled()
  })

  it('US-51 S1 asks to check the mail after registering', async () => {
    post.mockResolvedValue({
      data: {
        id: 'diner-1',
        nombre: 'Martín',
        email: 'martin@example.com',
        email_verificado: false,
      },
      error: undefined,
      response: new Response(null, { status: 201 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.type(screen.getByLabelText('Nombre *'), 'Martín')
    await user.type(screen.getByLabelText('Email *'), 'martin@example.com')
    await user.type(screen.getByLabelText('Contraseña *'), 'Servido2026')
    await user.type(screen.getByLabelText('Confirmar contraseña *'), 'Servido2026')
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await screen.findByText(/Te mandamos un mail para verificar tu email/),
    ).toBeInTheDocument()
  })

  it('US-58 S1 offers Google sign-up to diners', async () => {
    renderWithProviders(<RegisterPage />)

    expect(
      await screen.findByRole('button', { name: 'Registrarse con Google' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email *')).toBeInTheDocument()
  })

  it('US-58 S2 signs in the new account', async () => {
    post.mockResolvedValue(createdWithGoogle)
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.click(await screen.findByRole('button', { name: 'Registrarse con Google' }))

    expect(post).toHaveBeenCalledWith('/api/comensales/google', {
      body: { credential: 'google-id-token', nombre: undefined },
    })
    expect(await screen.findByText('¡Listo! Tu cuenta está creada.')).toBeInTheDocument()
    expect(sessionStorage.getItem('servido-access-token')).toBe('session-token')
  })

  it('US-58 S3 asks for the name Google did not give', async () => {
    post.mockResolvedValueOnce(
      apiAnswers(400, 'Ingresá tu nombre para terminar de crear tu cuenta.'),
    )
    post.mockResolvedValueOnce(createdWithGoogle)
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.click(await screen.findByRole('button', { name: 'Registrarse con Google' }))
    await user.type(await screen.findByLabelText('Tu nombre *'), 'Lucía')
    await user.click(screen.getByRole('button', { name: 'Terminar de crear mi cuenta' }))

    expect(post).toHaveBeenLastCalledWith('/api/comensales/google', {
      body: { credential: 'google-id-token', nombre: 'Lucía' },
    })
    expect(await screen.findByText('¡Listo! Tu cuenta está creada.')).toBeInTheDocument()
  })

  it('US-58 S5 offers to sign in when the account exists', async () => {
    post.mockResolvedValue(
      apiAnswers(409, 'Ya existe una cuenta de Servido! con ese email. Ingresá con Google.'),
    )
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.click(await screen.findByRole('button', { name: 'Registrarse con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta de Servido!')
    expect(screen.getByRole('link', { name: 'Ir a ingresar' })).toHaveAttribute(
      'href',
      '/ingresar?rol=comensal',
    )
  })

  it('US-3 S4 shows the generic login error', async () => {
    post.mockResolvedValue({
      data: undefined,
      error: undefined,
      response: new Response(null, { status: 401 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByLabelText('Email'), 'comensal@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'Incorrecta123')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas')
  })

  it('US-3 S5 hides the password while typing', () => {
    renderWithProviders(<LoginPage />)

    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password')
  })
})
