import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { api } from '../../api/client'
import { ApiStatus } from './ApiStatus'

vi.mock('../../api/client', () => ({ api: { GET: vi.fn() } }))

function renderStatus() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiStatus />
    </QueryClientProvider>,
  )
}

describe('ApiStatus', () => {
  it('shows that the server is reachable', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: { status: 'ok', database: 'ok' },
      error: undefined,
      response: new Response(),
    })

    renderStatus()

    expect(await screen.findByText('● Servidor conectado')).toBeInTheDocument()
  })

  it('tells when the server is unreachable', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('network'))

    renderStatus()

    expect(await screen.findByText('■ Sin conexión con el servidor')).toBeInTheDocument()
  })
})
