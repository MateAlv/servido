import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { api } from '../api/client'
import { HomePage } from './HomePage'

vi.mock('../api/client', () => ({ api: { GET: vi.fn() } }))

function renderPage() {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <HomePage />
    </QueryClientProvider>,
  )
}

describe('HomePage', () => {
  it('shows the tagline and that the server is reachable', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: { status: 'ok', database: 'ok' },
      error: undefined,
      response: new Response(),
    })

    renderPage()

    expect(screen.getByText('Reservá. Pedí. Disfrutá.')).toBeInTheDocument()
    expect(await screen.findByText('● Servidor conectado')).toBeInTheDocument()
  })

  it('tells the user when the server is unreachable', async () => {
    vi.mocked(api.GET).mockRejectedValue(new Error('network'))

    renderPage()

    expect(await screen.findByText('■ Sin conexión con el servidor')).toBeInTheDocument()
  })
})
