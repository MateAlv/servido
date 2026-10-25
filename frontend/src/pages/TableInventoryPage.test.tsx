import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { TableInventoryPage } from './TableInventoryPage'

const api = vi.hoisted(() => ({
  getTables: vi.fn(),
  updateTables: vi.fn(),
}))

vi.mock('../api/restaurantConfiguration', () => ({ configurationApi: api }))

describe('TableInventoryPage (US-10)', () => {
  beforeEach(() => {
    api.getTables.mockResolvedValue([])
    api.updateTables.mockResolvedValue([{ capacity: 2, quantity: 3, available: true }])
  })

  it('US-10 S1 saves grouped quantities without physical table identifiers', async () => {
    const user = userEvent.setup()
    renderWithProviders(<TableInventoryPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar grupo' }))
    await user.click(screen.getByRole('button', { name: 'Guardar mesas' }))

    await waitFor(() =>
      expect(api.updateTables).toHaveBeenCalledWith([
        { capacity: 2, quantity: 1, available: true },
      ]),
    )
    expect(screen.queryByLabelText(/Mesa 1|Mesa 2/)).not.toBeInTheDocument()
  })
})
