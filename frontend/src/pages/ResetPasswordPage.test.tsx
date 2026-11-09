import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn(), PUT: vi.fn() } }))

const post = vi.mocked(api.POST)
const put = vi.mocked(api.PUT)
const VALID = 'El link es válido. Elegí tu nueva contraseña.'
const CHANGED = '¡Listo! Tu contraseña quedó actualizada. Ya podés ingresar.'

function answered(detail: string, status = 200) {
  return { data: { detail }, error: undefined, response: new Response(null, { status }) }
}

function refused(detail: string) {
  return { data: undefined, error: { detail }, response: new Response(null, { status: 400 }) }
}

const link = '/restablecer?token=abc123'

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    post.mockReset()
    put.mockReset()
    post.mockResolvedValue(answered(VALID))
  })

  it('US-31 S3 shows the form for a valid link', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: link })

    expect(await screen.findByLabelText('Nueva contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
    expect(post).toHaveBeenCalledWith('/api/comensales/recuperacion/validacion', {
      body: { token: 'abc123' },
    })
  })

  it('US-31 S3 changes the password and invites to sign in', async () => {
    put.mockResolvedValue(answered(CHANGED))
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: link })

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'NuevaClave456')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave456')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(put).toHaveBeenCalledWith('/api/comensales/recuperacion', {
      body: { token: 'abc123', password: 'NuevaClave456' },
    })
    expect(await screen.findByText(CHANGED)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar con mi nueva contraseña' })).toHaveAttribute(
      'href',
      '/ingresar',
    )
  })

  it('US-31 S4 reports every password rule the API rejected', async () => {
    const message = 'La contraseña debe contener al menos un número.'
    put.mockResolvedValue(refused(message))
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: link })

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'sololetras')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'sololetras')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument()
  })

  it('US-31 edge refuses to send two different passwords', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ResetPasswordPage />, { route: link })

    await user.type(await screen.findByLabelText('Nueva contraseña'), 'NuevaClave456')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'OtraClave456')
    await user.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(put).not.toHaveBeenCalled()
  })

  it('US-31 S6 says the link no longer works and offers a new one', async () => {
    post.mockResolvedValue(
      refused('Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo.'),
    )
    renderWithProviders(<ResetPasswordPage />, { route: link })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo.',
    )
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toHaveAttribute(
      'href',
      '/recuperar',
    )
    expect(screen.queryByLabelText('Nueva contraseña')).not.toBeInTheDocument()
  })

  it('US-31 S7 says the link expired and offers a new one', async () => {
    post.mockResolvedValue(refused('Ese link venció. Pedí uno nuevo.'))
    renderWithProviders(<ResetPasswordPage />, { route: link })

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese link venció. Pedí uno nuevo.')
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toBeInTheDocument()
  })

  it('US-31 edge without a token in the address offers a new link', async () => {
    renderWithProviders(<ResetPasswordPage />, { route: '/restablecer' })

    expect(screen.getByRole('alert')).toHaveTextContent('Ese link no es válido. Pedí uno nuevo.')
    expect(screen.getByRole('link', { name: 'Pedir un link nuevo' })).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })
})
