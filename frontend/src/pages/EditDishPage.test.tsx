import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { api } from '../api/client'
import { useAccount, signOut } from '../api/session'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../api/client', () => ({
  api: { GET: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}))
vi.mock('../api/session', async (original) => ({
  ...(await original<typeof import('../api/session')>()),
  useAccount: vi.fn(),
  signOut: vi.fn(),
}))
const dish = {
  id: 'd1',
  name: 'Provoleta',
  description: 'Con orégano',
  category: 'entrada',
  price: '7500.00',
  photo_url: null,
  dietary_restrictions: [],
  prep_time_minutes: 10,
  available: false,
  revision: 1,
}
const legacy = {
  id: 'd1',
  nombre: dish.name,
  descripcion: dish.description,
  categoria: dish.category,
  precio: dish.price,
  foto_url: null,
  restricciones_alimenticias: [],
  tiempo_preparacion_minutos: 10,
  disponible: false,
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useAccount).mockReturnValue({
    data: { id: 'r1', rol: 'restaurant' },
    isPending: false,
  } as ReturnType<typeof useAccount>)
  vi.mocked(api.GET).mockImplementation(
    async (path) =>
      ({
        data: path === '/api/restaurantes/me/platos' ? [legacy] : dish,
        response: new Response(),
      }) as never,
  )
  vi.mocked(api.PUT).mockResolvedValue({
    data: { dish, changed_since_open: true },
    response: new Response(),
  } as never)
  vi.mocked(api.PATCH).mockResolvedValue({
    data: { dish: { ...dish, available: true }, changed_since_open: false },
    response: new Response(),
  } as never)
  vi.mocked(api.DELETE).mockResolvedValue({
    response: new Response(null, { status: 204 }),
  } as never)
})
import { EditDishPage } from './EditDishPage'
function renderEdit() {
  return renderWithProviders(
    <Routes>
      <Route path="/restaurante/menu/:dishId/editar" element={<EditDishPage />} />
      <Route path="/restaurante/menu" element={<p>Menú actualizado</p>} />
    </Routes>,
    { route: '/restaurante/menu/d1/editar' },
  )
}
it('US-34 S1 loads and saves the existing dish', async () => {
  renderEdit()
  const name = await screen.findByLabelText(/Nombre/)
  expect(name).toHaveValue('Provoleta')
  fireEvent.change(name, { target: { value: 'Nueva' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.PUT).toHaveBeenCalled())
  const call = vi.mocked(api.PUT).mock.calls[0][1] as { body: FormData }
  expect(call.body.get('name')).toBe('Nueva')
  expect(call.body.get('photo_action')).toBe('keep')
  expect(await screen.findByText('Menú actualizado')).toBeInTheDocument()
})
it('US-34 S2 identifies invalid fields', async () => {
  renderEdit()
  fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: ' ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('Ingresá el nombre del plato.')).toBeInTheDocument()
  expect(api.PUT).not.toHaveBeenCalled()
})
it('US-34 edge preserves fields on server failure', async () => {
  vi.mocked(api.PUT).mockResolvedValue({
    error: { detail: 'Ya existe un plato con ese nombre.' },
    response: new Response(null, { status: 409 }),
  } as never)
  renderEdit()
  fireEvent.change(await screen.findByLabelText(/Nombre/), { target: { value: 'Duplicado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe')
  expect(screen.getByLabelText(/Nombre/)).toHaveValue('Duplicado')
})
it('US-34 edge cancels without mutation', async () => {
  renderEdit()
  await screen.findByLabelText(/Nombre/)
  fireEvent.click(screen.getByRole('link', { name: 'Cancelar' }))
  expect(await screen.findByText('Menú actualizado')).toBeInTheDocument()
  expect(api.PUT).not.toHaveBeenCalled()
})

it('US-34 edge submits replacement photo and clears optional fields', async () => {
  renderEdit()
  fireEvent.change(await screen.findByLabelText('Descripción'), { target: { value: '' } })
  fireEvent.change(screen.getByLabelText('Tiempo de preparación (minutos)'), {
    target: { value: '' },
  })
  fireEvent.change(screen.getByLabelText('Foto'), { target: { value: 'replace' } })
  const file = new File(['image'], 'dish.png', { type: 'image/png' })
  await userEvent.upload(screen.getByLabelText(/Nueva foto/), file)
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1))
  const options = vi.mocked(api.PUT).mock.calls[0][1] as {
    body: FormData
    bodySerializer: () => FormData
  }
  expect(options.body.get('photo_action')).toBe('replace')
  expect(options.body.get('description')).toBe('')
  expect(options.body.get('prep_time_minutes')).toBe('')
  expect(options.bodySerializer().get('photo')).toBe(file)
})
it('US-34 edge rejects an invalid replacement photo before sending', async () => {
  renderEdit()
  await screen.findByLabelText(/Nombre/)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { value: 'replace' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  expect(await screen.findByText('Elegí una foto JPG o PNG de hasta 5 MB.')).toBeInTheDocument()
  expect(api.PUT).not.toHaveBeenCalled()
})
it('US-34 edge maps server field errors without losing input', async () => {
  vi.mocked(api.PUT).mockResolvedValue({
    error: { detail: [{ loc: ['body', 'price'], msg: 'Revisá el precio.' }] },
    response: new Response(null, { status: 400 }),
  } as never)
  renderEdit()
  await screen.findByLabelText(/Nombre/)
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() =>
    expect(screen.getByLabelText(/Precio/)).toHaveAttribute('aria-invalid', 'true'),
  )
  expect(screen.getByLabelText(/Nombre/)).toHaveValue('Provoleta')
})
it('US-34 edge does not repeat a pending save', async () => {
  vi.mocked(api.PUT).mockImplementation(() => new Promise(() => {}))
  renderEdit()
  await screen.findByLabelText(/Nombre/)
  const button = screen.getByRole('button', { name: 'Guardar cambios' })
  fireEvent.click(button)
  fireEvent.click(button)
  await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1))
  expect(button).toBeDisabled()
})
it('US-34 edge shows missing detail without an editable form', async () => {
  vi.mocked(api.GET).mockResolvedValue({
    error: { detail: 'No encontramos ese plato.' },
    response: new Response(null, { status: 404 }),
  } as never)
  renderEdit()
  expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos ese plato.')
  expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
})

it('US-34 edge clears an expired session while loading detail', async () => {
  vi.mocked(api.GET).mockResolvedValue({
    error: { detail: 'Tu sesión venció.' },
    response: new Response(null, { status: 401 }),
  } as never)
  renderEdit()
  await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1))
})
it('US-34 edge explicitly removes the existing photo', async () => {
  renderEdit()
  await screen.findByLabelText(/Nombre/)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { value: 'remove' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
  await waitFor(() => expect(api.PUT).toHaveBeenCalledTimes(1))
  const options = vi.mocked(api.PUT).mock.calls[0][1] as { body: FormData }
  expect(options.body.get('photo_action')).toBe('remove')
  expect(options.body.has('photo')).toBe(false)
})
