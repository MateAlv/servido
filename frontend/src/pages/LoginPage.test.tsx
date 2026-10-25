import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import type { GoogleCredentialResponse, GoogleIdentity } from '../lib/google'
import { renderWithProviders } from '../test/renderWithProviders'
import { LoginPage } from './LoginPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))

// Stands in for Google's script: its button hands back a credential when clicked.
const fakeGoogle: GoogleIdentity = {
  initialize: vi.fn(),
  renderButton: vi.fn(),
}
vi.mock('../lib/google', () => ({
  GOOGLE_CLIENT_ID: 'test-client',
  loadGoogleIdentity: () => Promise.resolve(fakeGoogle),
}))

const post = vi.mocked(api.POST)

function googleReturns(credential: string) {
  let callback: (response: GoogleCredentialResponse) => void = () => {}
  vi.mocked(fakeGoogle.initialize).mockImplementation((config) => {
    callback = config.callback
  })
  vi.mocked(fakeGoogle.renderButton).mockImplementation((parent) => {
    const button = document.createElement('button')
    button.textContent = 'Acceder con Google'
    button.onclick = () => callback({ credential })
    parent.append(button)
  })
}

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
    expect(screen.getByRole('link', { name: 'Creá tu cuenta' })).toHaveAttribute(
      'href',
      '/registrarme',
    )
  })

  it('US-52 S4 shows that Google sign-in failed', async () => {
    apiAnswers(401, 'No pudimos ingresar con Google. Probá de nuevo.')
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(await screen.findByRole('button', { name: 'Acceder con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos ingresar con Google. Probá de nuevo.',
    )
    expect(screen.queryByRole('link', { name: 'Creá tu cuenta' })).not.toBeInTheDocument()
  })
})
