import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BookedTablesError } from '../api/restaurantConfiguration'
import { renderWithProviders } from '../test/renderWithProviders'
import { TableInventoryPage } from './TableInventoryPage'

const api = vi.hoisted(() => ({
  getTables: vi.fn(),
  updateTables: vi.fn(),
}))

vi.mock('../api/restaurantConfiguration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/restaurantConfiguration')>()),
  configurationApi: api,
}))

describe('TableInventoryPage (US-10)', () => {
  beforeEach(() => {
    api.getTables.mockResolvedValue([])
    api.updateTables.mockResolvedValue([
      { capacity: 2, quantity: 3, seating_area: 'indoor', available: true },
    ])
  })

  it('US-10 S1 saves grouped quantities without physical table identifiers', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableInventoryPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar grupo' }))
    await user.click(screen.getByRole('button', { name: 'Guardar mesas' }))

    await waitFor(() =>
      expect(api.updateTables).toHaveBeenCalledWith([
        { capacity: 2, quantity: 1, seating_area: 'indoor', available: true },
      ]),
    )
    expect(screen.queryByLabelText(/Mesa 1|Mesa 2/)).not.toBeInTheDocument()
  })

  it('US-10 S1 saves the seating area of each group', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableInventoryPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar grupo' }))
    await user.click(screen.getByRole('radio', { name: 'Terraza' }))
    await user.click(screen.getByRole('button', { name: 'Guardar mesas' }))

    await waitFor(() =>
      expect(api.updateTables).toHaveBeenCalledWith([
        { capacity: 2, quantity: 1, seating_area: 'terrace', available: true },
      ]),
    )
  })

  it('US-10 rejects invalid group quantities before saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableInventoryPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar grupo' }))
    const quantity = screen.getByLabelText('Cantidad')
    await user.clear(quantity)
    await user.type(quantity, '0')
    await user.click(screen.getByRole('button', { name: 'Guardar mesas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('mayores a cero')
    expect(api.updateTables).not.toHaveBeenCalled()
  })

  it('offers a visible link back to the restaurant panel', async () => {
    renderWithProviders(<TableInventoryPage />)
    expect(await screen.findByRole('link', { name: /Volver al panel/ })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('US-10 S3 lists the reservations that block the change', async () => {
    api.getTables.mockResolvedValue([
      { capacity: 2, quantity: 2, seating_area: 'indoor', available: true },
    ])
    api.updateTables.mockRejectedValue(
      new BookedTablesError('La modificación afecta reservas confirmadas.', [
        {
          date: '2026-11-03',
          start_time: '20:00',
          party_size: 2,
          capacity: 2,
          seating_area: 'indoor',
        },
      ]),
    )
    const user = userEvent.setup()
    renderWithProviders(<TableInventoryPage />)

    await user.click(await screen.findByRole('checkbox', { name: /Disponible para reservar/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar mesas' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('se quedarían sin mesa')
    const list = screen.getByRole('list', { name: 'Reservas que bloquean el cambio' })
    expect(list).toHaveTextContent(
      'Mesa para 2 · Adentro — martes, 3 de noviembre, 20:00 (2 personas)',
    )
  })
})
