import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import { VerifyEmailPage } from './VerifyEmailPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))

const post = vi.mocked(api.POST)

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('US-51 S3 confirms the verification', async () => {
    post.mockResolvedValue({
      data: { detail: '¡Listo! Tu email quedó verificado.' },
      error: undefined,
      response: new Response(null, { status: 200 }),
    })
    renderWithProviders(<VerifyEmailPage />, { route: '/verificar-email?token=abc123' })

    expect(await screen.findByText('¡Listo! Tu email quedó verificado.')).toBeInTheDocument()
    expect(screen.getByText(/Ya podés reservar tu mesa/)).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/comensales/verificacion', {
      body: { token: 'abc123' },
    })
  })

  it('US-51 S4 says the link is not valid', async () => {
    post.mockResolvedValue({
      data: undefined,
      error: { detail: 'No pudimos verificar tu email: el enlace no es válido o venció.' },
      response: new Response(null, { status: 400 }),
    })
    renderWithProviders(<VerifyEmailPage />, { route: '/verificar-email?token=vencido' })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos verificar tu email: el enlace no es válido o venció.',
    )
  })

  it('US-51 S4 rejects a link without a token', async () => {
    renderWithProviders(<VerifyEmailPage />, { route: '/verificar-email' })

    expect(await screen.findByRole('alert')).toHaveTextContent('el enlace no es válido')
    expect(post).not.toHaveBeenCalled()
  })
})
