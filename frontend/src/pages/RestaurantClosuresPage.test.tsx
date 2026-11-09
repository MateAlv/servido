import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantClosuresPage } from './RestaurantClosuresPage'

const api = vi.hoisted(() => ({
  fetchClosures: vi.fn(),
  createClosure: vi.fn(),
  deleteClosure: vi.fn(),
}))

vi.mock('../api/closures', async () => {
  const actual = await vi.importActual<typeof import('../api/closures')>('../api/closures')
  return { ...actual, ...api }
})

describe('RestaurantClosuresPage (US-32)', () => {
  beforeEach(() => {
    api.fetchClosures.mockResolvedValue([])
    api.createClosure.mockResolvedValue({ id: 'new', date: '2026-11-10', all_day: true })
    api.deleteClosure.mockResolvedValue(undefined)
  })

  async function fillRange() {
    const user = userEvent.setup()
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '20:00' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '21:00' } })
    return user
  }

  it('US-32 S3 shows the affected reservations before applying', async () => {
    const { ClosureWarningError } = await import('../api/closures')
    api.createClosure.mockRejectedValueOnce(
      new ClosureWarningError([
        {
          reservation_id: 'r1',
          date: '2026-11-10',
          start_time: '20:00',
          end_time: '21:30',
          party_size: 3,
        },
      ]),
    )
    const user = await (async () => {
      renderWithProviders(<RestaurantClosuresPage />)
      return fillRange()
    })()
    await user.click(screen.getByRole('button', { name: 'Bloquear horario' }))
    expect(await screen.findByText(/3 personas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar bloqueo' })).toBeInTheDocument()
  })

  it('US-32 S4 applies the closure after confirming', async () => {
    const warning = (await import('../api/closures')).ClosureWarningError
    api.createClosure.mockRejectedValueOnce(
      new warning([
        {
          reservation_id: 'r1',
          date: '2026-11-10',
          start_time: '20:00',
          end_time: '21:30',
          party_size: 3,
        },
      ]),
    )
    renderWithProviders(<RestaurantClosuresPage />)
    const user = await fillRange()
    await user.click(screen.getByRole('button', { name: 'Bloquear horario' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar bloqueo' }))
    await waitFor(() => expect(api.createClosure).toHaveBeenCalledTimes(2))
    expect(api.createClosure.mock.calls[1][0]).toMatchObject({
      confirmed: true,
      acknowledged_reservation_ids: ['r1'],
    })
  })

  it('US-32 S5 desisting keeps the reservations', async () => {
    const warning = (await import('../api/closures')).ClosureWarningError
    api.createClosure.mockRejectedValueOnce(
      new warning([
        {
          reservation_id: 'r1',
          date: '2026-11-10',
          start_time: '20:00',
          end_time: '21:30',
          party_size: 3,
        },
      ]),
    )
    renderWithProviders(<RestaurantClosuresPage />)
    const user = await fillRange()
    await user.click(screen.getByRole('button', { name: 'Bloquear horario' }))
    await user.click(await screen.findByRole('button', { name: 'Desistir' }))
    expect(api.createClosure).toHaveBeenCalledTimes(1)
  })

  it('US-32 S6 rejects an end before the start', async () => {
    renderWithProviders(<RestaurantClosuresPage />)
    const user = await fillRange()
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '19:00' } })
    await user.click(screen.getByRole('button', { name: 'Bloquear horario' }))
    expect(screen.getByRole('alert')).toHaveTextContent('posterior')
    expect(api.createClosure).not.toHaveBeenCalled()
  })

  it('US-32 S7 lists current closures and removes one', async () => {
    api.fetchClosures.mockResolvedValueOnce([
      { id: 'c1', date: '2026-11-10', start_time: null, end_time: null, all_day: true },
    ])
    renderWithProviders(<RestaurantClosuresPage />)
    expect(await screen.findByText('2026-11-10')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Quitar' }))
    expect(api.deleteClosure).toHaveBeenCalledWith('c1')
  })
})
