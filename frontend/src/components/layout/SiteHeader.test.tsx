import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../api/client'
import { renderWithProviders } from '../../test/renderWithProviders'
import { SiteHeader } from './SiteHeader'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn() } }))

function signedInDiner() {
  sessionStorage.setItem('servido-access-token', 'token-comensal')
  vi.mocked(api.GET).mockResolvedValue({
    data: {
      rol: 'diner',
      id: '1c9d2e4f-3a5b-4c6d-8e7f-9a0b1c2d3e4f',
      nombre: 'Ana Pérez',
      email: 'ana@example.com',
    },
    response: new Response(null, { status: 200 }),
  } as never)
}

afterEach(() => {
  sessionStorage.clear()
})

describe('SiteHeader', () => {
  it('offers to sign in or create an account to visitors', async () => {
    renderWithProviders(<SiteHeader />)

    expect(await screen.findByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar',
    )
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute(
      'href',
      '/registrarme',
    )
  })

  it('US-3 S3 shows who is signed in and their role', async () => {
    signedInDiner()
    renderWithProviders(<SiteHeader />)

    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument()
    expect(screen.getByText('Comensal')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument()
  })

  it('US-3 S5 cerrar sesión forgets the token and shows the way in again', async () => {
    signedInDiner()
    const user = userEvent.setup()
    renderWithProviders(<SiteHeader />)

    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))

    expect(sessionStorage.getItem('servido-access-token')).toBeNull()
    expect(await screen.findByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument()
  })
})
