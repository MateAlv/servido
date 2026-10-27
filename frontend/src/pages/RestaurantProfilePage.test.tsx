import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocation } from 'react-router'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantProfilePage } from './RestaurantProfilePage'

const api = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  geocode: vi.fn(),
}))

vi.mock('../api/restaurantConfiguration', () => ({ configurationApi: api }))

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>
}

describe('RestaurantProfilePage (US-6)', () => {
  beforeEach(() => {
    api.getProfile.mockResolvedValue({
      nombre: 'Local',
      descripcion: null,
      tipo_cocina: null,
      rango_precio: null,
      foto_url: null,
      restricciones_tags: null,
      direccion: null,
      latitud: null,
      longitud: null,
    })
    api.updateProfile.mockImplementation((profile) => Promise.resolve(profile))
    api.geocode.mockResolvedValue({
      display_name: 'Av. Corrientes 1000, Buenos Aires',
      latitude: -34.6,
      longitude: -58.4,
    })
  })

  it('US-6 S1 saves and previews foto_url without uploading a file', async () => {
    renderWithProviders(<RestaurantProfilePage />)
    const field = await screen.findByLabelText('URL de foto')

    fireEvent.change(field, { target: { value: 'https://example.com/local.jpg' } })
    expect(screen.getByAltText('Vista previa del restaurante')).toHaveAttribute(
      'src',
      'https://example.com/local.jpg',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    await waitFor(() =>
      expect(api.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ foto_url: 'https://example.com/local.jpg' }),
      ),
    )
  })

  it('US-6 S3 previews the geocoded location before saving coordinates', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantProfilePage />)
    await screen.findByLabelText('Dirección')

    await user.type(screen.getByLabelText('Dirección'), 'Av. Corrientes 1000')
    await user.click(screen.getByRole('button', { name: 'Verificar dirección' }))
    expect(await screen.findByText(/Ubicación encontrada/)).toBeInTheDocument()
    expect(api.updateProfile).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    await waitFor(() =>
      expect(api.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ latitud: -34.6, longitud: -58.4 }),
      ),
    )
  })

  it('redirects to the restaurant panel after a successful save', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <>
        <RestaurantProfilePage />
        <LocationProbe />
      </>,
      { route: '/restaurante/perfil' },
    )

    await screen.findByDisplayValue('Local')
    await user.click(await screen.findByRole('button', { name: 'Guardar perfil' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
    expect(await screen.findByText('Guardaste los datos de tu local.')).toBeInTheDocument()
  })

  it('offers a visible link back to the restaurant panel', async () => {
    renderWithProviders(<RestaurantProfilePage />)
    expect(await screen.findByRole('link', { name: /Volver al panel/ })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
