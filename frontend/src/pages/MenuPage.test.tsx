import { useReducer } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { useAccount } from '../api/session'
import { renderWithProviders } from '../test/renderWithProviders'

vi.mock('../api/client', () => ({
  api: { GET: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}))
vi.mock('../api/session', async (original) => ({
  ...(await original<typeof import('../api/session')>()),
  useAccount: vi.fn(),
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
import { MenuPage } from './MenuPage'
it('US-34 S3 identifies unavailable dishes', async () => {
  renderWithProviders(<MenuPage />)
  expect(await screen.findByText('No disponible')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Marcar como disponible' }))
  await waitFor(() => expect(api.PATCH).toHaveBeenCalled())
})
it('US-34 S5 asks before removing a dish', async () => {
  renderWithProviders(<MenuPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Quitar plato' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(api.DELETE).not.toHaveBeenCalled()
})
it('US-34 S6 confirms removal', async () => {
  renderWithProviders(<MenuPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Quitar plato' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Quitar plato' }).at(-1)!)
  await waitFor(() => expect(api.DELETE).toHaveBeenCalledTimes(1))
})
it('US-34 S7 cancels removal without a request', async () => {
  renderWithProviders(<MenuPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Quitar plato' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(api.DELETE).not.toHaveBeenCalled()
  expect(screen.getByText('Provoleta')).toBeInTheDocument()
})
it('US-34 edge retains dialog and dish after failure', async () => {
  vi.mocked(api.DELETE).mockResolvedValue({
    error: { detail: 'No pudimos quitar el plato.' },
    response: new Response(null, { status: 500 }),
  } as never)
  renderWithProviders(<MenuPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Quitar plato' }))
  fireEvent.click(screen.getAllByRole('button', { name: 'Quitar plato' }).at(-1)!)
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos quitar')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

it.each(['Escape', 'backdrop'])('US-34 S7 dismisses by %s without deletion', async (method) => {
  renderWithProviders(<MenuPage />)
  const trigger = await screen.findByRole('button', { name: 'Quitar plato' })
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog')
  if (method === 'Escape') fireEvent.keyDown(dialog, { key: 'Escape' })
  else fireEvent.click(dialog)
  expect(api.DELETE).not.toHaveBeenCalled()
  expect(trigger).toHaveFocus()
})
it('US-34 edge announces an intervening availability change', async () => {
  vi.mocked(api.PATCH).mockResolvedValue({
    data: { dish, changed_since_open: true },
    response: new Response(),
  } as never)
  renderWithProviders(<MenuPage />)
  fireEvent.click(await screen.findByRole('button', { name: 'Marcar como disponible' }))
  expect(
    await screen.findByText('El plato había cambiado desde que lo abriste. Guardamos tus cambios.'),
  ).toBeInTheDocument()
})
it('US-34 edge shows an empty owner menu', async () => {
  vi.mocked(api.GET).mockResolvedValue({ data: [], response: new Response() } as never)
  renderWithProviders(<MenuPage />)
  expect(await screen.findByText('Todavía no cargaste platos.')).toBeInTheDocument()
})
it('US-34 edge reports query failure and offers retry', async () => {
  vi.mocked(api.GET).mockRejectedValue(new TypeError('offline'))
  renderWithProviders(<MenuPage />)
  expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos')
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
})

it('US-34 edge never shows a previous restaurant menu after account change', async () => {
  function SwitchableMenu() {
    const [, rerender] = useReducer((value: number) => value + 1, 0)
    return (
      <>
        <button onClick={rerender}>Cambiar cuenta de prueba</button>
        <MenuPage />
      </>
    )
  }
  renderWithProviders(<SwitchableMenu />)
  expect(await screen.findByText('Provoleta')).toBeInTheDocument()
  vi.mocked(useAccount).mockReturnValue({
    data: { id: 'r2', rol: 'restaurant' },
    isPending: false,
  } as ReturnType<typeof useAccount>)
  vi.mocked(api.GET).mockResolvedValue({
    data: [{ ...legacy, id: 'other', nombre: 'Otro local' }],
    response: new Response(),
  } as never)
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar cuenta de prueba' }))
  expect(await screen.findByText('Otro local')).toBeInTheDocument()
  expect(screen.queryByText('Provoleta')).not.toBeInTheDocument()
})
