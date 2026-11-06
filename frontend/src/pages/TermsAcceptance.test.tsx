import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { SiteFooter } from '../components/layout'
import { googleReturns } from '../test/fakeGoogle'
import { renderWithProviders } from '../test/renderWithProviders'
import { RegisterPage } from './RegisterPage'
import { RestaurantRegisterPage } from './RestaurantRegisterPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))
vi.mock('../lib/google', async (importOriginal) => {
  const { fakeGoogle } = await import('../test/fakeGoogle')
  return {
    ...(await importOriginal<typeof import('../lib/google')>()),
    loadGoogleIdentity: () => Promise.resolve(fakeGoogle),
  }
})

const post = vi.mocked(api.POST)

describe('terms acceptance', () => {
  beforeEach(() => {
    post.mockReset()
    googleReturns('google-id-token')
  })

  it('US-29 S2 starts unchecked and blocks diner registration', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    expect(screen.getByRole('checkbox', { name: /He leído y acepto/ })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Primero aceptá los términos y condiciones.',
    )
    expect(post).not.toHaveBeenCalled()
  })

  it('US-29 S4 blocks Google sign-up until terms are accepted', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RegisterPage />)

    await user.click(await screen.findByRole('button', { name: 'Registrarse con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Primero aceptá los términos')
    expect(post).not.toHaveBeenCalled()
  })

  it('US-26 S2 starts unchecked and blocks restaurant registration', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantRegisterPage />)

    expect(screen.getByRole('checkbox', { name: /He leído y acepto/ })).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta del restaurante' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Primero aceptá los términos y condiciones.',
    )
    expect(post).not.toHaveBeenCalled()
  })

  it('US-26 S4 blocks Google sign-up until terms are accepted', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantRegisterPage />)

    await user.click(await screen.findByRole('button', { name: 'Registrarse con Google' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Primero aceptá los términos')
    expect(post).not.toHaveBeenCalled()
  })

  it('US-29 and US-26 expose both legal links in the footer', () => {
    renderWithProviders(<SiteFooter />)

    expect(screen.getByRole('link', { name: 'Términos y condiciones' })).toHaveAttribute(
      'href',
      '/terminos',
    )
    expect(screen.getByRole('link', { name: 'Términos para restaurantes' })).toHaveAttribute(
      'href',
      '/terminos/restaurantes',
    )
  })
})
