import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { OpeningHoursPage } from './OpeningHoursPage'

const api = vi.hoisted(() => ({
  getHours: vi.fn(),
  updateHours: vi.fn(),
}))

vi.mock('../api/restaurantConfiguration', () => ({ configurationApi: api }))

describe('OpeningHoursPage (US-8)', () => {
  beforeEach(() => {
    api.getHours.mockResolvedValue([])
    api.updateHours.mockResolvedValue([])
  })

  it('US-8 S1 adds and saves a weekly shift', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OpeningHoursPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar turno' }))
    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }))

    await waitFor(() =>
      expect(api.updateHours).toHaveBeenCalledWith([
        expect.objectContaining({ day_of_week: 1, start_time: '12:00', end_time: '15:00' }),
      ]),
    )
  })
})
