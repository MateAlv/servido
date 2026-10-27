import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router'

import { renderWithProviders } from '../test/renderWithProviders'
import { OpeningHoursPage } from './OpeningHoursPage'

const api = vi.hoisted(() => ({
  getHours: vi.fn(),
  updateHours: vi.fn(),
}))

vi.mock('../api/restaurantConfiguration', () => ({ configurationApi: api }))

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

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

  it('US-8 S2 rejects overlapping shifts before sending them', async () => {
    const user = userEvent.setup()
    renderWithProviders(<OpeningHoursPage />)

    await user.click(screen.getByRole('button', { name: 'Agregar turno' }))
    await user.click(screen.getByRole('button', { name: 'Agregar turno' }))
    const endFields = screen.getAllByLabelText('Hasta')
    await user.clear(endFields[1])
    await user.type(endFields[1], '14:00')
    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('superponerse')
    expect(api.updateHours).not.toHaveBeenCalled()
  })

  it('redirects to the restaurant panel after a successful save', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <OpeningHoursPage />
        <LocationProbe />
      </>,
      { route: '/restaurante/horarios' },
    )

    await user.click(screen.getByRole('button', { name: 'Guardar horarios' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
    expect(await screen.findByText('Guardaste los horarios.')).toBeInTheDocument()
  })

  it('offers a visible link back to the restaurant panel', async () => {
    renderWithProviders(<OpeningHoursPage />)
    expect(await screen.findByRole('link', { name: /Volver al panel/ })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
