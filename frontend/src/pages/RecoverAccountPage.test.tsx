import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { renderWithProviders } from '../test/renderWithProviders'
import { RecoverAccountPage } from './RecoverAccountPage'

vi.mock('../api/client', () => ({ api: { POST: vi.fn() } }))

const post = vi.mocked(api.POST)
const SENT = 'Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones.'

function answered(detail: string, status = 202) {
  return { data: { detail }, error: undefined, response: new Response(null, { status }) }
}

describe('RecoverAccountPage', () => {
  beforeEach(() => {
    post.mockReset()
  })

  it('US-31 S1 says that a mail will arrive if the account exists', async () => {
    post.mockResolvedValue(answered(SENT))
    const user = userEvent.setup()
    renderWithProviders(<RecoverAccountPage />)

    await user.type(screen.getByLabelText('Email'), 'martin@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }))

    expect(post).toHaveBeenCalledWith('/api/comensales/recuperacion', {
      body: { email: 'martin@example.com' },
    })
    expect(await screen.findByText(new RegExp(SENT))).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('US-31 edge a double click asks for one mail', async () => {
    let answer: (value: unknown) => void = () => {}
    post.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve
      }) as ReturnType<typeof api.POST>,
    )
    const user = userEvent.setup()
    renderWithProviders(<RecoverAccountPage />)
    await user.type(screen.getByLabelText('Email'), 'martin@example.com')
    const button = screen.getByRole('button', { name: 'Enviar instrucciones' })

    await user.click(button)
    await user.click(button)

    expect(post).toHaveBeenCalledTimes(1)
    answer(answered(SENT))
    expect(await screen.findByText(new RegExp(SENT))).toBeInTheDocument()
  })

  it('US-31 edge reports a mail that could not be sent and keeps the form', async () => {
    post.mockResolvedValue({
      data: undefined,
      error: { detail: 'No pudimos enviar el correo. Probá de nuevo.' },
      response: new Response(null, { status: 502 }),
    })
    const user = userEvent.setup()
    renderWithProviders(<RecoverAccountPage />)

    await user.type(screen.getByLabelText('Email'), 'martin@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar instrucciones' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos enviar el correo. Probá de nuevo.',
    )
    expect(screen.getByLabelText('Email')).toHaveValue('martin@example.com')
  })
})
