import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../../api/client'
import type { Account } from '../../api/session'
import { renderWithProviders } from '../../test/renderWithProviders'
import { UnverifiedNotice } from './UnverifiedNotice'

vi.mock('../../api/client', () => ({ api: { POST: vi.fn() } }))

const post = vi.mocked(api.POST)

const diner: Account = {
  rol: 'diner',
  id: 'diner-1',
  nombre: 'Martín',
  email: 'martin@example.com',
  email_verificado: false,
}

describe('UnverifiedNotice', () => {
  beforeEach(() => {
    post.mockReset()
    sessionStorage.setItem('servido-access-token', 'session-token')
  })

  it('US-51 S7 resends the verification mail', async () => {
    post.mockResolvedValue({
      data: { detail: 'Te enviamos un nuevo mail de verificación.' },
      error: undefined,
      response: new Response(null, { status: 202 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<UnverifiedNotice account={diner} />)

    await user.click(screen.getByRole('button', { name: 'Reenviar mail de verificación' }))

    expect(post).toHaveBeenCalledWith('/api/comensales/verificacion/reenvio', {
      headers: { Authorization: 'Bearer session-token' },
    })
    expect(
      await screen.findByText('Te enviamos un nuevo mail de verificación.'),
    ).toBeInTheDocument()
  })

  it('is not shown once the email is verified', () => {
    renderWithProviders(<UnverifiedNotice account={{ ...diner, email_verificado: true }} />)

    expect(screen.queryByRole('button', { name: /Reenviar/ })).not.toBeInTheDocument()
  })
})
