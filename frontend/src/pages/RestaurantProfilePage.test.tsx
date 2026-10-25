import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantProfilePage } from './RestaurantProfilePage'

const api = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  geocode: vi.fn(),
}))

vi.mock('../api/restaurantConfiguration', () => ({ configurationApi: api }))

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
})
