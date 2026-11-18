import { useQuery } from '@tanstack/react-query'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Link, Route, Routes, useLocation } from 'react-router'

import {
  confirmOrder,
  discardCart,
  changePaymentMethod,
  fetchOrder,
  ReservationNotFoundError,
  saveCart,
  type MenuDish,
  type OrderPage as OrderPageData,
} from '../api/orders'
import { signOut, useAccount } from '../api/session'
import { formatCents } from '../lib/orderSummary'
import { renderWithProviders } from '../test/renderWithProviders'
import { OrderPage } from './OrderPage'

vi.mock('../api/orders', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/orders')>()
  return {
    ...actual,
    fetchOrder: vi.fn(),
    confirmOrder: vi.fn(),
    saveCart: vi.fn(),
    discardCart: vi.fn(),
    changePaymentMethod: vi.fn(),
  }
})

vi.mock('../api/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/session')>()
  return { ...actual, useAccount: vi.fn(), signOut: vi.fn() }
})

const fetchMock = vi.mocked(fetchOrder)
const confirmMock = vi.mocked(confirmOrder)
const saveMock = vi.mocked(saveCart)
const discardMock = vi.mocked(discardCart)
const useAccountMock = vi.mocked(useAccount)

const DINER = {
  rol: 'diner',
  id: 'c-1',
  nombre: 'Ana',
  email: 'ana@example.com',
  email_verificado: true,
}

const PROVOLETA: MenuDish = {
  id: 'd-1',
  name: 'Provoleta',
  description: 'Con orégano',
  category: 'entrada',
  price: '7500.00',
  photo_url: null,
  dietary_restrictions: ['sin_tacc'],
  prep_time_minutes: 10,
}
const BIFE: MenuDish = {
  id: 'd-2',
  name: 'Bife de chorizo',
  description: null,
  category: 'plato_principal',
  price: '18500.00',
  photo_url: null,
  dietary_restrictions: [],
  prep_time_minutes: 25,
}
const FLAN: MenuDish = {
  id: 'd-3',
  name: 'Flan',
  description: null,
  category: 'postre',
  price: '6000.00',
  photo_url: null,
  dietary_restrictions: [],
  prep_time_minutes: null,
}

/** The formatted amount with plain spaces, as `toHaveTextContent` normalizes them. */
function money(pesos: number) {
  return formatCents(pesos * 100).replace(/\s/g, ' ')
}

function orderOf(items: [MenuDish, number][]): NonNullable<OrderPageData['order']> {
  const total = items.reduce((sum, [dish, quantity]) => sum + Number(dish.price) * quantity, 0)
  const times = items.flatMap(([dish]) =>
    dish.prep_time_minutes === null ? [] : [dish.prep_time_minutes],
  )
  return {
    arrival_at: '2026-11-03T21:00:00-03:00',
    prep_start_time: '2026-11-03T20:35:00-03:00',
    payment_method: 'cash',
    payment_status: 'pending',
    payment_method_editable: true,
    confirmed_at: '2026-11-03T12:00:00-03:00',
    items: items.map(([dish, quantity]) => ({
      dish_id: dish.id,
      name: dish.name,
      unit_price: dish.price,
      prep_time_minutes: dish.prep_time_minutes,
      quantity,
      subtotal: (Number(dish.price) * quantity).toFixed(2),
    })),
    total: total.toFixed(2),
    prep_time_minutes: times.length ? Math.max(...times) : null,
  }
}

function pageData(overrides: Partial<OrderPageData> = {}, open = true): OrderPageData {
  const order = overrides.order ?? null
  return {
    arrival_window: {
      starts_at: '2026-11-03T21:00:00-03:00',
      latest_at: '2026-11-03T21:30:00-03:00',
    },
    reservation: {
      id: 'res-1',
      restaurant: { id: 'r-1', nombre: 'La Esquina de Palermo' },
      date: '2026-11-03',
      start_time: '21:00',
      end_time: '22:30',
      party_size: 4,
      table: { capacity: 4, seating_area: 'terrace' },
      status: 'confirmed',
      has_order: order !== null,
      has_cart: Boolean(overrides.cart),
      order_open: open,
      order_deadline: '2026-11-03T20:15:00-03:00',
    },
    order,
    cart: null,
    menu: [PROVOLETA, BIFE, FLAN],
    ...overrides,
  }
}

function LocationProbe() {
  const location = useLocation()
  return (
    <>
      <p>En {location.pathname + location.search}</p>
      <Link to="/reservas/res-1/pedido">Volver al pedido</Link>
    </>
  )
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/reservas/:reservaId/pedido" element={<OrderPage />} />
      <Route path="*" element={<LocationProbe />} />
    </Routes>,
    { route: '/reservas/res-1/pedido' },
  )
}

async function openPage(data = pageData(), selectPayment = true) {
  fetchMock.mockResolvedValue(data)
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { level: 1, name: 'La Esquina de Palermo' })
  if (selectPayment && data.reservation.order_open) {
    if (data.order)
      await user.click(
        screen.getByRole('button', { name: /Modificar platos|Continuar editando platos/ }),
      )
    await review(user)
    const cash = screen.getByRole('button', { name: 'Efectivo' })
    if (cash.getAttribute('aria-pressed') !== 'true') await user.click(cash)
    await user.click(screen.getByRole('button', { name: 'Volver a editar platos' }))
  }
  return user
}

async function review(user: ReturnType<typeof userEvent.setup>) {
  const next = screen.queryByRole('button', { name: 'Continuar' })
  if (next) await user.click(next)
}

function menuDish(name: string) {
  const menu = screen.getByRole('region', { name: 'Menú' })
  return within(menu).getByText(name).closest('li') as HTMLElement
}

function yourOrder() {
  return screen.getByRole('complementary', { name: 'Tu pedido' })
}

async function add(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(within(menuDish(name)).getByRole('button', { name: /Agrega/ }))
}

function orderRow(name: string) {
  return within(yourOrder())
    .getByRole('group', { name: `Cantidad de ${name}` })
    .closest('li') as HTMLElement
}

beforeEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  useAccountMock.mockReturnValue({ data: DINER, isPending: false } as never)
  saveMock.mockResolvedValue({ ok: true })
  discardMock.mockResolvedValue({ ok: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('OrderPage', () => {
  it('US-47 S2 shows a confirmed order in read-only mode', async () => {
    fetchMock.mockResolvedValue(pageData({ order: orderOf([[PROVOLETA, 2]]) }, false))
    renderWithProviders(
      <Routes>
        <Route path="/reservas/:reservaId/pedido" element={<OrderPage />} />
      </Routes>,
      { route: '/reservas/res-1/pedido?modo=lectura' },
    )

    expect(await screen.findByText('Pedido confirmado')).toBeVisible()
    expect(screen.getAllByText('Provoleta').length).toBeGreaterThan(0)
    expect(screen.getByText(/2 ×/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Modificar platos' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Modificar medio de pago' }),
    ).not.toBeInTheDocument()
  })
  it('US-17 S1 adds a dish to the order list with its quantity', async () => {
    const user = await openPage()

    expect(
      within(yourOrder()).getByText('Agregá platos del menú para armar tu pedido.'),
    ).toBeVisible()
    await add(user, 'Provoleta')

    const row = orderRow('Provoleta')
    expect(within(row).getByText('Provoleta')).toBeInTheDocument()
    expect(within(row).getByRole('status')).toHaveTextContent('1')
    expect(within(menuDish('Provoleta')).getByText('1 en tu pedido')).toBeInTheDocument()
  })

  it('US-17 S2 says the reservation was not found', async () => {
    fetchMock.mockRejectedValue(new ReservationNotFoundError())
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'No encontramos esa reserva.' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
  })

  it('US-17 S3 increases and decreases the quantity of a dish', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')

    await user.click(within(orderRow('Provoleta')).getByRole('button', { name: 'Agregar uno' }))
    await user.click(within(orderRow('Provoleta')).getByRole('button', { name: 'Agregar uno' }))
    expect(within(orderRow('Provoleta')).getByRole('status')).toHaveTextContent('3')

    await user.click(within(orderRow('Provoleta')).getByRole('button', { name: 'Quitar uno' }))
    expect(within(orderRow('Provoleta')).getByRole('status')).toHaveTextContent('2')
  })

  it('US-17 S4 removes a dish from the order', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Flan')

    await user.click(
      within(orderRow('Provoleta')).getByRole('button', { name: 'Sacar Provoleta del pedido' }),
    )

    expect(
      within(yourOrder()).queryByRole('group', { name: 'Cantidad de Provoleta' }),
    ).not.toBeInTheDocument()
    expect(orderRow('Flan')).toBeInTheDocument()
    // Focus goes to the next dish of the order.
    expect(
      within(orderRow('Flan')).getByRole('button', { name: 'Sacar Flan del pedido' }),
    ).toHaveFocus()
  })

  it('US-17 S5 updates the total when the order changes', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Bife de chorizo')
    expect(within(yourOrder()).getByText('Total del pedido').nextSibling).toHaveTextContent(
      money(26000),
    )

    await user.click(within(orderRow('Provoleta')).getByRole('button', { name: 'Agregar uno' }))
    expect(within(yourOrder()).getByText('Total del pedido').nextSibling).toHaveTextContent(
      money(33500),
    )

    await user.click(
      within(orderRow('Bife de chorizo')).getByRole('button', {
        name: 'Sacar Bife de chorizo del pedido',
      }),
    )
    expect(within(yourOrder()).getByText('Total del pedido').nextSibling).toHaveTextContent(
      money(15000),
    )
  })

  it('US-17 S6 says the restaurant does not see the order until the diner confirms', async () => {
    const user = await openPage()

    await add(user, 'Provoleta')

    expect(screen.getByText('Sin confirmar: el restaurante todavía no lo ve')).toBeVisible()
    await review(user)
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('US-17 S6 confirms the order', async () => {
    const confirmed = pageData({ order: orderOf([[PROVOLETA, 2]]) })
    confirmMock.mockResolvedValue({ ok: true, page: confirmed })
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Provoleta')

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByRole('heading', { name: '¡Pedido confirmado!' })).toHaveFocus()
    expect(confirmMock).toHaveBeenCalledWith(
      'res-1',
      [
        {
          dishId: 'd-1',
          quantity: 2,
          name: 'Provoleta',
          unitPrice: '7500.00',
          prepTimeMinutes: 10,
        },
      ],
      expect.any(Object),
      expect.any(String),
    )
    expect(
      screen.queryByText('Sin confirmar: el restaurante todavía no lo ve'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Pedido confirmado')).toBeInTheDocument()
  })

  it('US-17 S7 changes a confirmed order and confirms again', async () => {
    const order = orderOf([[PROVOLETA, 1]])
    confirmMock.mockResolvedValue({
      ok: true,
      page: pageData({
        order: orderOf([
          [PROVOLETA, 1],
          [FLAN, 1],
        ]),
      }),
    })
    const user = await openPage(pageData({ order }))
    expect(within(orderRow('Provoleta')).getByRole('status')).toHaveTextContent('1')
    expect(screen.queryByRole('button', { name: /Confirmar/ })).not.toBeInTheDocument()

    await add(user, 'Flan')
    await review(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar cambios' }))

    expect(await screen.findByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible()
    expect(confirmMock.mock.calls[0][1].map((line) => line.name)).toEqual(['Provoleta', 'Flan'])
  })

  it('US-17 S8 shows the order read-only once closed', async () => {
    await openPage(pageData({ order: orderOf([[PROVOLETA, 2]]) }, false))

    expect(
      screen.getByText('Tu pedido ya está cerrado. Se podía cambiar hasta las 20:15.'),
    ).toBeVisible()
    expect(screen.getAllByText('Provoleta')[0]).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /Agregar|Quitar|Sacar|Confirmar/ }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
  })

  it('US-17 S8 offers no order when it closed without one', async () => {
    await openPage(pageData({}, false))

    expect(
      screen.getByText(
        'Ya no se pueden hacer pedidos para esta reserva. Igual te esperamos a las 21:00.',
      ),
    ).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
  })

  it('US-17 S9 explains the order can no longer change when the confirmation is late', async () => {
    confirmMock.mockResolvedValue({ ok: false, kind: 'conflict' })
    const user = await openPage()
    await add(user, 'Provoleta')
    fetchMock.mockResolvedValue(pageData({}, false))

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(
      await screen.findByText(
        'Ya no se pueden hacer pedidos para esta reserva. Igual te esperamos a las 21:00.',
      ),
    ).toHaveFocus()
  })

  it('US-17 edge says what changed in the menu', async () => {
    confirmMock.mockResolvedValue({ ok: false, kind: 'conflict' })
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Bife de chorizo')
    fetchMock.mockResolvedValue(pageData({ menu: [{ ...PROVOLETA, price: '8000.00' }, FLAN] }))

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(
      `Cambió el precio de Provoleta: ${money(7500)} → ${money(8000)}.`,
    )
    expect(notice).toHaveTextContent('Bife de chorizo ya no está en el menú, lo sacamos.')
    expect(notice).toHaveFocus()
    expect(within(yourOrder()).getByText('Total del pedido').nextSibling).toHaveTextContent(
      money(8000),
    )
  })

  it('US-17 edge asks before removing the whole order', async () => {
    confirmMock.mockResolvedValue({ ok: true, page: pageData() })
    const user = await openPage(pageData({ order: orderOf([[FLAN, 1]]) }))

    await user.click(
      within(orderRow('Flan')).getByRole('button', { name: 'Sacar Flan del pedido' }),
    )
    await user.click(screen.getByRole('button', { name: 'Quitar pedido' }))

    const dialog = await screen.findByRole('dialog', { name: '¿Quitás tu pedido?' })
    expect(dialog).toHaveTextContent('Tu reserva sigue en pie')
    expect(confirmMock).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Quitar pedido' }))

    expect(confirmMock).toHaveBeenCalledWith('res-1', [], expect.any(Object), expect.any(String))
    expect(await screen.findByText('Quitaste tu pedido. Tu reserva sigue en pie.')).toHaveFocus()
  })

  it('US-17 edge asks an unverified diner to verify and keeps the dishes', async () => {
    confirmMock.mockResolvedValue({
      ok: false,
      kind: 'unverified',
      message: 'Verificá tu email para confirmar tu pedido.',
    })
    const user = await openPage()
    await add(user, 'Provoleta')

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(
      await screen.findByText('Para confirmar, verificá tu email. Tus platos quedan guardados.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reenviar mail de verificación' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Volver a editar platos' }))
    expect(orderRow('Provoleta')).toBeInTheDocument()
    // The pending change was saved before the confirmation was refused.
    expect(saveMock).toHaveBeenCalled()
  })

  it('US-17 edge sends a visitor to sign in and back', async () => {
    useAccountMock.mockReturnValue({ data: null, isPending: false } as never)
    renderPage()

    expect(
      await screen.findByText(
        `En /ingresar?volver=${encodeURIComponent('/reservas/res-1/pedido')}`,
      ),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('US-17 edge restores the saved cart when the page opens', async () => {
    await openPage(
      pageData({
        cart: {
          arrival_at: '2026-11-03T21:00:00-03:00',
          payment_method: 'cash',
          updated_at: '2026-11-03T12:00:00-03:00',
          items: [
            {
              dish_id: 'd-2',
              quantity: 2,
              name: 'Bife de chorizo',
              unit_price: '18500.00',
              prep_time_minutes: 25,
            },
          ],
        },
      }),
    )

    expect(within(orderRow('Bife de chorizo')).getByRole('status')).toHaveTextContent('2')
    expect(screen.getByText('Sin confirmar: el restaurante todavía no lo ve')).toBeVisible()
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('US-17 edge saves the cart after each change', async () => {
    const user = await openPage()

    await add(user, 'Provoleta')

    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        [expect.objectContaining({ dishId: 'd-1', quantity: 1 })],
        { keepalive: false },
        expect.objectContaining({
          arrival_at: expect.any(String),
          payment_method: expect.any(String),
        }),
      ),
    )
  })

  it('US-17 edge discards the cart', async () => {
    const order = orderOf([[PROVOLETA, 1]])
    const user = await openPage(
      pageData({
        order,
        cart: {
          arrival_at: '2026-11-03T21:00:00-03:00',
          payment_method: 'cash',
          updated_at: '2026-11-03T12:00:00-03:00',
          items: [
            {
              dish_id: 'd-1',
              quantity: 3,
              name: 'Provoleta',
              unit_price: '7500.00',
              prep_time_minutes: 10,
            },
          ],
        },
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))

    expect(discardMock).toHaveBeenCalledWith('res-1')
    expect(await screen.findByText('Volviste al pedido confirmado.')).toHaveFocus()
    expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
    expect(screen.getAllByText('Provoleta')[0].closest('li')).toHaveTextContent('1 ×')
    await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
    expect(within(orderRow('Provoleta')).getByRole('status')).toHaveTextContent('1')
  })

  it('US-17 edge discards a cart equal to the confirmed order', async () => {
    const user = await openPage(pageData({ order: orderOf([[PROVOLETA, 1]]) }))

    await user.click(within(orderRow('Provoleta')).getByRole('button', { name: 'Agregar uno' }))
    await user.click(within(orderRow('Provoleta')).getByRole('button', { name: 'Quitar uno' }))

    await waitFor(() => expect(discardMock).toHaveBeenCalled())
    expect(saveMock).not.toHaveBeenCalled()
    expect(
      screen.queryByText('Sin confirmar: el restaurante todavía no lo ve'),
    ).not.toBeInTheDocument()
  })

  it('US-17 edge says when a change could not be saved', async () => {
    saveMock.mockResolvedValue({ ok: false, kind: 'failed', message: 'No.' })
    const user = await openPage()

    await add(user, 'Provoleta')

    expect(
      await screen.findByText('No pudimos guardar tus cambios. Siguen en esta página.'),
    ).toBeVisible()
  })

  it('US-17 edge keeps its items when a save finds the menu changed', async () => {
    saveMock.mockResolvedValueOnce({ ok: false, kind: 'conflict' })
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Flan')
    fetchMock.mockResolvedValue(pageData({ menu: [PROVOLETA, BIFE] }))

    expect(await screen.findByText('Flan ya no está en el menú, lo sacamos.')).toBeVisible()
    expect(orderRow('Provoleta')).toBeInTheDocument()
    await waitFor(() =>
      expect(saveMock).toHaveBeenLastCalledWith(
        'res-1',
        [expect.objectContaining({ dishId: 'd-1' })],
        { keepalive: false },
        expect.objectContaining({
          arrival_at: expect.any(String),
          payment_method: expect.any(String),
        }),
      ),
    )
  })

  it('US-17 edge closes the order when a save arrives late', async () => {
    saveMock.mockResolvedValue({ ok: false, kind: 'conflict' })
    const user = await openPage()
    fetchMock.mockResolvedValue(pageData({}, false))

    await add(user, 'Provoleta')

    expect(
      await screen.findByText(
        'Ya no se pueden hacer pedidos para esta reserva. Igual te esperamos a las 21:00.',
      ),
    ).toBeVisible()
  })

  it('US-17 edge returns to the saved cart when the session expired', async () => {
    confirmMock.mockResolvedValue({ ok: false, kind: 'session' })
    const user = await openPage()
    await add(user, 'Provoleta')

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    // Signing out sends the diner to sign in and back here, where the cart was saved.
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(saveMock).toHaveBeenCalled()
  })

  it('US-17 edge loads the order again when the diner comes back', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    await waitFor(() => expect(saveMock).toHaveBeenCalled())
    await user.click(screen.getByRole('link', { name: '← Ir al inicio' }))
    fetchMock.mockResolvedValue(
      pageData({
        cart: {
          arrival_at: '2026-11-03T21:00:00-03:00',
          payment_method: 'cash',
          updated_at: '2026-11-03T12:00:00-03:00',
          items: [
            {
              dish_id: 'd-1',
              quantity: 1,
              name: 'Provoleta',
              unit_price: '7500.00',
              prep_time_minutes: 10,
            },
          ],
        },
      }),
    )

    await user.click(screen.getByRole('link', { name: 'Volver al pedido' }))

    expect(await screen.findByRole('group', { name: 'Cantidad de Provoleta' })).toBeVisible()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('US-17 edge keeps the latest dishes when a confirmation finds the menu changed', async () => {
    confirmMock.mockResolvedValue({ ok: false, kind: 'conflict' })
    let answer: (page: OrderPageData) => void = () => undefined
    const user = await openPage()
    await add(user, 'Provoleta')
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)))

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    // The diner returns to editing while the menu is reloading.
    await user.click(screen.getByRole('button', { name: 'Volver a editar platos' }))
    await add(user, 'Flan')
    answer(pageData({ menu: [{ ...PROVOLETA, price: '8000.00' }, BIFE, FLAN] }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Cambió el precio de Provoleta')
    expect(orderRow('Flan')).toBeInTheDocument()
    expect(within(yourOrder()).getByText('Total del pedido').nextSibling).toHaveTextContent(
      money(14000),
    )
  })

  it('US-17 edge locks the order while it is being confirmed', async () => {
    confirmMock.mockImplementation(() => new Promise(() => undefined))
    const user = await openPage()
    await add(user, 'Provoleta')

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(screen.queryByRole('group', { name: 'Cantidad de Provoleta' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Volver a editar platos' })).toBeDisabled()
    expect(screen.getByLabelText('Hora de llegada')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled()
  })

  it('US-17 edge says when the confirmation could not be sent', async () => {
    confirmMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = await openPage()
    await add(user, 'Provoleta')

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(
      await screen.findByText(
        'No pudimos confirmar tu pedido. Tus platos siguen acá, probá de nuevo.',
      ),
    ).toBeVisible()
    await review(user)
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
  })

  it('US-17 edge says when discarding failed and keeps the dishes', async () => {
    discardMock.mockResolvedValue({ ok: false, kind: 'failed', message: 'No pudimos descartar.' })
    const user = await openPage()
    await add(user, 'Provoleta')

    await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))

    expect(await screen.findByText('No pudimos descartar.')).toBeVisible()
    expect(orderRow('Provoleta')).toBeInTheDocument()
    expect(screen.queryByText('Volviste al pedido confirmado.')).not.toBeInTheDocument()
  })

  it('US-17 edge says a dish of the confirmed order left the menu', async () => {
    const order = orderOf([
      [PROVOLETA, 1],
      [FLAN, 1],
    ])
    order.items[1].dish_id = null
    await openPage(pageData({ order, menu: [PROVOLETA, BIFE] }))

    expect(screen.getByRole('alert')).toHaveTextContent('Flan ya no está en el menú, lo sacamos.')
    expect(screen.getByText('Sin confirmar: el restaurante todavía no lo ve')).toBeVisible()
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        [expect.objectContaining({ dishId: 'd-1' })],
        {
          keepalive: false,
        },
        expect.objectContaining({ payment_method: 'cash' }),
      ),
    )
  })

  it('US-17 edge updates a saved cart whose dishes changed and saves it', async () => {
    await openPage(
      pageData({
        cart: {
          arrival_at: '2026-11-03T21:00:00-03:00',
          payment_method: 'cash',
          updated_at: '2026-11-03T12:00:00-03:00',
          items: [
            {
              dish_id: 'd-1',
              quantity: 2,
              name: 'Provoleta',
              unit_price: '7000.00',
              prep_time_minutes: 10,
            },
          ],
        },
      }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      `Cambió el precio de Provoleta: ${money(7000)} → ${money(7500)}.`,
    )
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        [expect.objectContaining({ unitPrice: '7500.00', quantity: 2 })],
        { keepalive: false },
        expect.objectContaining({
          arrival_at: expect.any(String),
          payment_method: expect.any(String),
        }),
      ),
    )
  })

  it('US-17 edge says a dish was removed and brings focus back to it in the menu', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')

    await user.click(
      within(orderRow('Provoleta')).getByRole('button', { name: 'Sacar Provoleta del pedido' }),
    )

    expect(screen.getByText(/Provoleta: lo sacaste del pedido\./)).toBeInTheDocument()
    expect(within(menuDish('Provoleta')).getByRole('button', { name: /Agrega/ })).toHaveFocus()
  })

  it('US-17 edge names each add button after its dish', async () => {
    await openPage()

    expect(screen.getByRole('button', { name: 'Agregar al pedido: Provoleta' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Agregar al pedido: Flan' })).toBeVisible()
  })

  it('US-17 edge shows a dish up close and adds it from there', async () => {
    const user = await openPage(
      pageData({ menu: [PROVOLETA, { ...BIFE, photo_url: '/media/dishes/bife.jpg' }, FLAN] }),
    )

    await user.click(
      within(menuDish('Bife de chorizo')).getByRole('button', { name: /^Bife de chorizo/ }),
    )

    const dialog = screen.getByRole('dialog', { name: 'Bife de chorizo' })
    expect(within(dialog).getByRole('img', { name: 'Foto de Bife de chorizo' })).toHaveAttribute(
      'src',
      '/media/dishes/bife.jpg',
    )
    expect(dialog).toHaveTextContent('Plato principal')
    expect(dialog).toHaveTextContent('Se prepara en 25 min')
    await user.click(
      within(dialog).getByRole('button', { name: 'Agregar al pedido: Bife de chorizo' }),
    )
    expect(orderRow('Bife de chorizo')).toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: 'Cantidad de Bife de chorizo' })).toBeVisible()

    // Clicking outside the dish closes it.
    fireEvent.click(dialog)
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
  })

  it('US-17 edge shows the dietary restrictions the restaurant declared', async () => {
    await openPage()

    expect(within(menuDish('Provoleta')).getByText('Sin TACC')).toBeInTheDocument()
    expect(
      within(menuDish('Flan')).queryByText(/Vegano|Vegetariano|Sin TACC/),
    ).not.toBeInTheDocument()
  })

  it('US-17 edge says when a dish has no photo yet', async () => {
    const user = await openPage()

    await user.click(within(menuDish('Flan')).getByRole('button', { name: /^Flan/ }))

    expect(screen.getByRole('dialog', { name: 'Flan' })).toHaveTextContent(
      'El restaurante todavía no cargó una foto',
    )
  })

  it('US-19 S1 shows the estimated time while building and once confirmed', async () => {
    confirmMock.mockResolvedValue({ ok: true, page: pageData({ order: orderOf([[BIFE, 1]]) }) })
    const user = await openPage()
    await add(user, 'Bife de chorizo')

    expect(within(yourOrder()).getByText('Preparación: unos 25 min')).toBeVisible()
    expect(
      within(yourOrder()).getByText('La cocina lo prepara para tu llegada a las 21:00'),
    ).toBeVisible()
    expect(
      within(menuDish('Bife de chorizo')).getByText('Se prepara en 25 min'),
    ).toBeInTheDocument()

    await review(user)

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    await screen.findByRole('heading', { name: '¡Pedido confirmado!' })
    expect(screen.getByText('Preparación: unos 25 min')).toBeVisible()
  })

  it('US-40 S6 shows preparation estimate to the diner', async () => {
    const user = await openPage()
    await add(user, 'Bife de chorizo')

    expect(within(yourOrder()).getByText('Preparación: unos 25 min')).toBeVisible()
  })

  it('US-19 S3 updates the estimate when dishes change', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Bife de chorizo')
    expect(within(yourOrder()).getByText('Preparación: unos 25 min')).toBeVisible()

    await user.click(
      within(orderRow('Bife de chorizo')).getByRole('button', {
        name: 'Sacar Bife de chorizo del pedido',
      }),
    )

    expect(within(yourOrder()).getByText('Preparación: unos 10 min')).toBeVisible()
  })

  it('US-19 S4 shows no estimate when no dish has a time', async () => {
    const user = await openPage()

    await add(user, 'Flan')

    expect(within(yourOrder()).queryByText(/Preparación/)).not.toBeInTheDocument()
    expect(screen.queryByText(/tiempo/i)).not.toBeInTheDocument()
  })

  it('US-21 S1 opens the bill detail with the value of each item', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    expect(screen.queryByRole('dialog', { name: 'Detalle de la cuenta' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ver detalle de la cuenta' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle de la cuenta' })
    const bill = within(dialog).getByRole('table', { name: 'Detalle de la cuenta' })
    expect(within(bill).getByRole('row', { name: /Provoleta/ })).toHaveTextContent(money(7500))
    expect(dialog).toHaveTextContent('Impuestos incluidos')
    expect(dialog).toHaveTextContent('Preparación: unos 10 min, para tu llegada a las 21:00')
    expect(dialog).toHaveTextContent('Sin confirmar: el restaurante todavía no lo ve')

    // Clicking outside the bill (on the backdrop) closes it.
    fireEvent.click(dialog)
    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
  })

  it('US-21 edge shows the bill of a closed order too', async () => {
    const user = await openPage(pageData({ order: orderOf([[PROVOLETA, 2]]) }, false))

    await user.click(screen.getByRole('button', { name: 'Ver detalle de la cuenta' }))

    const dialog = screen.getByRole('dialog', { name: 'Detalle de la cuenta' })
    expect(within(dialog).getByRole('row', { name: /Total/ })).toHaveTextContent(money(15000))
    expect(dialog).toHaveTextContent('Pedido confirmado')
  })

  it('US-21 S2 shows the total with taxes included', async () => {
    const user = await openPage()

    await add(user, 'Provoleta')

    expect(within(yourOrder()).getByText('Impuestos incluidos')).toBeVisible()
    expect(within(yourOrder()).getByText('Total del pedido')).toBeVisible()
  })

  it('US-21 S3 lists dish, quantity, unit price and subtotal', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Provoleta')
    await add(user, 'Bife de chorizo')

    await user.click(screen.getByRole('button', { name: 'Ver detalle de la cuenta' }))

    const bill = within(screen.getByRole('dialog', { name: 'Detalle de la cuenta' })).getByRole(
      'table',
      { name: 'Detalle de la cuenta' },
    )
    const cells = (name: RegExp) =>
      within(within(bill).getByRole('row', { name }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.replace(/\s/g, ' '))
    expect(cells(/Provoleta/)).toEqual(['Provoleta', '2', money(7500), money(15000)])
    expect(cells(/Bife de chorizo/)).toEqual(['Bife de chorizo', '1', money(18500), money(18500)])
    expect(within(bill).getByRole('row', { name: /Total/ })).toHaveTextContent(money(33500))
  })
})

it('US-34 edge explains removal from a persisted cart when the menu becomes empty', async () => {
  fetchMock.mockResolvedValue(
    pageData(
      {
        menu: [],
        cart: {
          arrival_at: '2026-11-03T21:00:00-03:00',
          payment_method: 'cash',
          updated_at: '2026-11-03T12:00:00-03:00',
          items: [
            {
              dish_id: PROVOLETA.id,
              name: PROVOLETA.name,
              unit_price: PROVOLETA.price,
              quantity: 2,
              prep_time_minutes: 10,
            },
          ],
        },
      },
      false,
    ),
  )
  renderWithProviders(
    <Routes>
      <Route path="/reservas/:reservaId/pedido" element={<OrderPage />} />
    </Routes>,
    { route: '/reservas/res-1/pedido' },
  )
  expect(await screen.findByText(/Provoleta ya no está en el menú/)).toBeInTheDocument()
  expect(
    screen.getByText('El restaurante no tiene platos disponibles por ahora.'),
  ).toBeInTheDocument()
  expect(confirmMock).not.toHaveBeenCalled()
  expect(saveMock).not.toHaveBeenCalled()
})

it('US-34 edge explains the last dish disappearing during confirmation and keeps the confirmed receipt', async () => {
  confirmMock.mockResolvedValue({ ok: false, kind: 'conflict' })
  const original = orderOf([[PROVOLETA, 2]])
  const user = await openPage(pageData({ order: original }))
  await add(user, 'Flan')
  fetchMock.mockResolvedValue(pageData({ order: original, menu: [] }, false))
  await review(user)
  await user.click(screen.getByRole('button', { name: 'Confirmar cambios' }))
  expect(await screen.findByText(/Flan ya no está en el menú/)).toBeInTheDocument()
  expect(
    screen.getByText('El restaurante no tiene platos disponibles por ahora.'),
  ).toBeInTheDocument()
  expect(screen.getAllByText('Provoleta')[0]).toBeInTheDocument()
  expect(screen.getByText('Tu pedido confirmado conserva sus datos.')).toBeInTheDocument()
  expect(confirmMock).toHaveBeenCalledTimes(1)
})

describe('spec 020 arrival and payment', () => {
  it('US-43 S1 previews arrival and dishes before confirmation', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    await review(user)
    expect(screen.getByLabelText('Hora de llegada')).toHaveValue('21:00')
    expect(
      within(screen.getByRole('combobox', { name: 'Hora de llegada' })).getAllByRole('option'),
    ).toHaveLength(31)
    expect(within(yourOrder()).getByText('Provoleta')).toBeVisible()
  })
  it('US-43 S4 keeps draft arrival private until reconfirmed', async () => {
    const user = await openPage(pageData({ order: orderOf([[BIFE, 1]]) }))
    await review(user)
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '21:30' } })
    expect(screen.getByText('Sin confirmar: el restaurante todavía no lo ve')).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({ arrival_at: '2026-11-04T00:30:00.000Z' }),
      ),
    )
  })
  it('US-43 S5 asks before removing the confirmed order', async () => {
    const user = await openPage(pageData({ order: orderOf([[FLAN, 1]]) }))
    await user.click(screen.getByRole('button', { name: 'Sacar Flan del pedido' }))
    await user.click(screen.getByRole('button', { name: 'Quitar pedido' }))
    expect(screen.getByRole('dialog', { name: '¿Quitás tu pedido?' })).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
  })
  it('US-43 S6 explains invalid arrival', async () => {
    const user = await openPage()
    await add(user, 'Provoleta')
    confirmMock.mockResolvedValue({
      ok: false,
      kind: 'failed',
      message: 'La hora de llegada no es válida.',
    })
    await review(user)
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '20:59' } })
    await review(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(screen.getByLabelText('Hora de llegada')).toHaveAttribute('aria-invalid', 'true')
    expect(confirmMock).not.toHaveBeenCalled()
  })
  it('US-43 S7 shows confirmed state on a return visit', async () => {
    await openPage(pageData({ order: orderOf([[BIFE, 1]]) }), false)
    expect(screen.getByText('Pedido confirmado')).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
  })
  it('US-45 S1 offers cash and online without preselection', async () => {
    const user = await openPage(pageData(), false)
    await review(user)
    expect(screen.getByRole('button', { name: 'Efectivo' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText('Medio de pago no seleccionado')).toBeVisible()
  })
  it('US-45 S2 blocks confirmation until a method is selected', async () => {
    const user = await openPage(pageData(), false)
    await add(user, 'Provoleta')
    await review(user)
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Seleccioná un medio de pago para confirmar tu pedido.',
    )
    expect(confirmMock).not.toHaveBeenCalled()
  })
  it('US-45 S2 selects a preference without marking paid', async () => {
    const user = await openPage(pageData(), false)
    await review(user)
    await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
    expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText('Pagado')).not.toBeInTheDocument()
  })
  it('US-45 S3 restores the selected method', async () => {
    const order = orderOf([[BIFE, 1]])
    order.payment_method = 'online'
    await openPage(pageData({ order }), false)
    expect(screen.getByText('Pago electrónico', { selector: 'p' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Pago electrónico' })).not.toBeInTheDocument()
    expect(screen.getByText('Pendiente de pago')).toBeVisible()
  })
  it('US-45 S4 edits payment after dish editing closes', async () => {
    const order = orderOf([[BIFE, 1]])
    const updated = { ...order, payment_method: 'online' as const }
    vi.mocked(changePaymentMethod).mockResolvedValue({
      ok: true,
      page: pageData({ order: updated }, false),
    })
    const user = await openPage(pageData({ order }, false), false)
    await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
    await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
    expect(changePaymentMethod).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
    await waitFor(() => expect(changePaymentMethod).toHaveBeenCalledWith('res-1', 'online'))
    expect(confirmMock).not.toHaveBeenCalled()
  })
  it('US-45 S5 explains why paid preference is locked', async () => {
    const order = {
      ...orderOf([[BIFE, 1]]),
      payment_status: 'paid' as const,
      payment_method_editable: false,
    }
    await openPage(pageData({ order }, false), false)
    expect(screen.getByText('Pagado')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Modificar medio de pago' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('El pedido ya está pagado. No se puede cambiar el medio de pago.'),
    ).toBeVisible()
  })
})

describe('spec 020 UX stages', () => {
  it('US-43 edge keeps dishes and metadata when navigating between stages', async () => {
    const user = await openPage(pageData(), false)
    expect(screen.queryByLabelText('Hora de llegada')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Efectivo' })).not.toBeInTheDocument()
    await add(user, 'Provoleta')
    await review(user)
    expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '21:30' } })
    await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
    await user.click(screen.getByRole('button', { name: 'Volver a editar platos' }))
    expect(orderRow('Provoleta')).toBeVisible()
    await add(user, 'Flan')
    await review(user)
    expect(screen.getByLabelText('Hora de llegada')).toHaveValue('21:30')
    expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(yourOrder()).getByText('Flan')).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('US-43 S6 keeps invalid arrival local and accepts the inclusive upper bound', async () => {
    const user = await openPage(pageData(), false)
    await add(user, 'Provoleta')
    await review(user)
    await waitFor(() => expect(saveMock).toHaveBeenCalled())
    saveMock.mockClear()
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '22:00' } })
    expect(screen.getByRole('alert')).toHaveTextContent('entre las 21:00 y las 21:30, inclusive')
    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    expect(confirmMock).not.toHaveBeenCalled()
    expect(saveMock).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '21:30' } })
    expect(screen.getByLabelText('Hora de llegada')).not.toHaveAttribute('aria-invalid')
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({ arrival_at: '2026-11-04T00:30:00.000Z' }),
      ),
    )
  })

  it('US-45 edge edits confirmed payment without entering the private draft', async () => {
    const order = orderOf([[PROVOLETA, 1]])
    const data = pageData({
      order,
      cart: {
        arrival_at: '2026-11-03T21:30-03:00',
        payment_method: 'online',
        updated_at: '2026-11-03T12:00:00-03:00',
        items: [
          {
            dish_id: BIFE.id,
            name: BIFE.name,
            quantity: 2,
            unit_price: BIFE.price,
            prep_time_minutes: BIFE.prep_time_minutes,
          },
        ],
      },
    })
    vi.mocked(changePaymentMethod).mockResolvedValue({
      ok: true,
      page: { ...data, order: { ...order, payment_method: 'online' } },
    })
    const user = await openPage(data, false)
    expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Hora de llegada')).not.toBeInTheDocument()
    expect(screen.getAllByText('Provoleta')[0]).toBeVisible()
    expect(screen.queryByText('Bife de chorizo')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Medio de pago' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
    await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
    expect(changePaymentMethod).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
    await waitFor(() => expect(changePaymentMethod).toHaveBeenCalledWith('res-1', 'online'))
    expect(confirmMock).not.toHaveBeenCalled()
    expect(saveMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
    expect(orderRow('Bife de chorizo')).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Medio de pago' })).not.toBeInTheDocument()
    await review(user)
    expect(screen.getByLabelText('Hora de llegada')).toHaveValue('21:30')
    expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText('Medio de pago del pedido confirmado')).not.toBeInTheDocument()
  })
})

it('US-43 edge opens the confirmed summary and keeps a private draft when returning from editing', async () => {
  const order = orderOf([[PROVOLETA, 1]])
  const user = await openPage(pageData({ order }), false)
  expect(screen.queryByRole('region', { name: 'Menú' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Hora de llegada')).not.toBeInTheDocument()
  expect(screen.getByText('Llegada confirmada: 21:00')).toBeVisible()
  expect(screen.getByText('Pedido confirmado')).toBeVisible()
  expect(screen.queryByRole('group', { name: 'Medio de pago' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  await add(user, 'Bife de chorizo')
  await review(user)
  fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '21:30' } })
  await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
  expect(screen.getByRole('button', { name: 'Confirmar cambios' })).toBeVisible()
  expect(screen.queryByText(/Seleccioná un medio para confirmar/)).not.toBeInTheDocument()
  expect(screen.queryByText('Medio de pago del pedido confirmado')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Volver al pedido confirmado' }))
  expect(screen.getByRole('heading', { name: 'Tu pedido' })).toHaveFocus()
  expect(screen.getByText('Llegada confirmada: 21:00')).toBeVisible()
  expect(screen.queryByLabelText('Hora de llegada')).not.toBeInTheDocument()
  expect(screen.queryByText('Bife de chorizo')).not.toBeInTheDocument()
  expect(screen.getByText('Efectivo', { selector: 'p' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  expect(orderRow('Bife de chorizo')).toBeVisible()
  await review(user)
  expect(screen.getByLabelText('Hora de llegada')).toHaveValue('21:30')
  expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(confirmMock).not.toHaveBeenCalled()
})

it('US-45 edge discards draft metadata and returns to the unchanged confirmed payment and arrival', async () => {
  const order = orderOf([[PROVOLETA, 1]])
  const user = await openPage(pageData({ order }), false)
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  await add(user, 'Bife de chorizo')
  await review(user)
  fireEvent.change(screen.getByLabelText('Hora de llegada'), { target: { value: '21:30' } })
  await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
  await user.click(screen.getByRole('button', { name: 'Descartar cambios' }))
  expect(await screen.findByText('Volviste al pedido confirmado.')).toHaveFocus()
  expect(screen.getByText('Llegada confirmada: 21:00')).toBeVisible()
  expect(screen.getByText('Efectivo', { selector: 'p' })).toBeVisible()
  expect(screen.getAllByText('Provoleta')[0].closest('li')).toHaveTextContent('1 ×')
  expect(screen.queryByText('Bife de chorizo')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Hora de llegada')).not.toBeInTheDocument()
  expect(screen.queryByRole('group', { name: 'Medio de pago' })).not.toBeInTheDocument()
  expect(discardMock).toHaveBeenCalledWith('res-1')
  expect(confirmMock).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  expect(orderRow('Provoleta')).toBeVisible()
  await review(user)
  expect(screen.getByLabelText('Hora de llegada')).toHaveValue('21:00')
  expect(screen.getByRole('button', { name: 'Efectivo' })).toHaveAttribute('aria-pressed', 'true')
})

it('US-45 edge cancels a local payment selection without changing the confirmed method', async () => {
  const user = await openPage(pageData({ order: orderOf([[PROVOLETA, 1]]) }), false)
  expect(screen.queryByRole('group', { name: 'Medio de pago' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
  expect(screen.getByRole('button', { name: 'Efectivo' })).toHaveAttribute('aria-pressed', 'true')
  await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', { name: 'Modificar medio de pago' }),
    ).not.toBeInTheDocument(),
  )
  expect(screen.getByText('Efectivo', { selector: 'p' })).toBeVisible()
  expect(changePaymentMethod).not.toHaveBeenCalled()
  expect(confirmMock).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
  expect(screen.getByRole('button', { name: 'Efectivo' })).toHaveAttribute('aria-pressed', 'true')
})

it.each([false, true])(
  'US-45 edge keeps the confirmed method on save failure (network=%s)',
  async (network) => {
    const order = orderOf([[PROVOLETA, 1]])
    const mutation = vi.mocked(changePaymentMethod)
    if (network) mutation.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    else
      mutation.mockResolvedValueOnce({
        ok: false,
        kind: 'failed',
        message: 'No pudimos guardar el medio de pago.',
      })
    const user = await openPage(pageData({ order }), false)
    await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
    await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el medio de pago.',
    )
    expect(screen.getByText('Efectivo', { selector: 'p' })).toBeVisible()
    expect(confirmMock).not.toHaveBeenCalled()
    mutation.mockResolvedValueOnce({
      ok: true,
      page: pageData({ order: { ...order, payment_method: 'online' } }),
    })
    await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
    expect(await screen.findByText('Guardaste el cambio del medio de pago.')).toBeVisible()
    expect(screen.getByText('Pago electrónico', { selector: 'p' })).toBeVisible()
  },
)

it.each(['cancelled', 'ended'] as const)(
  'US-45 edge hides payment editing for a %s reservation',
  async (state) => {
    const data = pageData(
      { order: { ...orderOf([[PROVOLETA, 1]]), payment_method_editable: false } },
      false,
    )
    if (state === 'cancelled') data.reservation.status = 'cancelled'
    await openPage(data, false)
    expect(
      screen.queryByRole('button', { name: 'Modificar medio de pago' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        state === 'cancelled'
          ? 'La reserva está cancelada. No se puede cambiar el medio de pago.'
          : 'El medio de pago solo se puede cambiar antes de que finalice la reserva y mientras el pedido siga vigente e impago.',
      ),
    ).toBeVisible()
  },
)

it('US-45 edge refreshes a backend payment conflict without discarding a private draft', async () => {
  const order = orderOf([[PROVOLETA, 1]])
  const data = pageData({
    order,
    cart: {
      arrival_at: order.arrival_at,
      payment_method: 'online',
      updated_at: order.confirmed_at,
      items: [
        {
          dish_id: BIFE.id,
          name: BIFE.name,
          quantity: 1,
          unit_price: BIFE.price,
          prep_time_minutes: BIFE.prep_time_minutes,
        },
      ],
    },
  })
  const user = await openPage(data, false)
  await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
  await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
  vi.mocked(changePaymentMethod).mockResolvedValueOnce({ ok: false, kind: 'conflict' })
  fetchMock.mockResolvedValue({
    ...data,
    order: { ...order, payment_status: 'paid', payment_method_editable: false },
  })
  await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('El pedido o la reserva cambió')
  expect(screen.getByRole('button', { name: 'Guardar cambio' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  expect(orderRow('Bife de chorizo')).toBeVisible()
  expect(saveMock).not.toHaveBeenCalled()
  expect(discardMock).not.toHaveBeenCalled()
})

it('US-45 edge retains online preference when reconfirming only changed dishes', async () => {
  const order = { ...orderOf([[PROVOLETA, 1]]), payment_method: 'online' as const }
  const user = await openPage(pageData({ order }), false)
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  await add(user, 'Flan')
  await review(user)
  expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  confirmMock.mockResolvedValueOnce({
    ok: true,
    page: pageData({
      order: {
        ...orderOf([
          [PROVOLETA, 1],
          [FLAN, 1],
        ]),
        payment_method: 'online',
      },
    }),
  })
  await user.click(screen.getByRole('button', { name: 'Confirmar cambios' }))
  expect(await screen.findByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible()
  expect(saveMock).toHaveBeenCalledWith(
    'res-1',
    expect.any(Array),
    expect.any(Object),
    expect.objectContaining({ payment_method: 'online' }),
  )
  expect(changePaymentMethod).not.toHaveBeenCalled()
})

it.each(['20:00', '09:07'])(
  'US-43 S6 offers exactly the inclusive minute window for a reservation at %s',
  async (start) => {
    const [hours, minutes] = start.split(':').map(Number)
    const end = `${String(hours + Math.floor((minutes + 30) / 60)).padStart(2, '0')}:${String((minutes + 30) % 60).padStart(2, '0')}`
    const data = pageData()
    data.reservation.start_time = start
    data.arrival_window = {
      starts_at: `2026-11-03T${start}:00-03:00`,
      latest_at: `2026-11-03T${end}:00-03:00`,
    }
    const user = await openPage(data, false)
    await add(user, 'Provoleta')
    await review(user)
    const selector = screen.getByRole('combobox', { name: 'Hora de llegada' })
    const values = within(selector)
      .getAllByRole('option')
      .map((option) => (option as HTMLOptionElement).value)
    expect(values).toEqual(
      Array.from({ length: 31 }, (_, index) => {
        const minute = hours * 60 + minutes + index
        return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
      }),
    )
    expect(selector).toHaveValue(start)
    await user.selectOptions(selector, end)
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({
          arrival_at: new Date(data.arrival_window.latest_at).toISOString(),
        }),
      ),
    )
    await user.selectOptions(selector, start)
    await waitFor(() =>
      expect(saveMock).toHaveBeenCalledWith(
        'res-1',
        expect.any(Array),
        expect.any(Object),
        expect.objectContaining({
          arrival_at: new Date(data.arrival_window.starts_at).toISOString(),
        }),
      ),
    )
    expect(data.reservation.end_time).toBe('22:30')
  },
)

it('US-43 edge retains a previously confirmed minute when entering and returning to review', async () => {
  const order = { ...orderOf([[PROVOLETA, 1]]), arrival_at: '2026-11-03T21:17:00-03:00' }
  const user = await openPage(pageData({ order }), false)
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  await review(user)
  expect(screen.getByRole('combobox', { name: 'Hora de llegada' })).toHaveValue('21:17')
  await user.click(screen.getByRole('button', { name: 'Volver a editar platos' }))
  await review(user)
  expect(screen.getByRole('combobox', { name: 'Hora de llegada' })).toHaveValue('21:17')
  expect(saveMock).not.toHaveBeenCalled()
})

it('US-45 edge includes confirmed payment inside the main order summary in reading order', async () => {
  await openPage(pageData({ order: orderOf([[PROVOLETA, 1]]) }), false)
  const title = screen.getByRole('heading', { name: 'Tu pedido' })
  const payment = screen.getByRole('region', { name: 'Medio de pago' })
  expect(payment.parentElement).toBe(title.parentElement)
  const summary = within(title.parentElement!)
  expect(summary.getByText('Efectivo', { selector: 'p' })).toBeVisible()
  expect(summary.getByText('Pendiente de pago')).toBeVisible()
  expect(summary.getByRole('button', { name: 'Ver detalle de la cuenta' })).toBeVisible()
  const total = summary.getByText('Total del pedido')
  expect(total.compareDocumentPosition(payment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Modificar medio de pago' })).toBeVisible()
})

it('US-45 edge refreshes dish cutoff and disables an open payment editor at reservation end', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-03T20:14:59-03:00'))
  try {
    const data = pageData({ order: orderOf([[PROVOLETA, 1]]) })
    fetchMock.mockResolvedValue(data)
    renderPage()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByRole('button', { name: 'Modificar platos' })).toBeVisible()
    const closed = { ...data, reservation: { ...data.reservation, order_open: false } }
    fetchMock.mockResolvedValue(closed)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1010)
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('button', { name: 'Modificar platos' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pago electrónico' }))
    expect(screen.getByRole('button', { name: 'Guardar cambio' })).toBeEnabled()
    fetchMock.mockResolvedValue({
      ...closed,
      order: { ...data.order!, payment_method_editable: false },
    })
    const untilEnd = new Date('2026-11-03T22:30:00-03:00').getTime() - Date.now()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(untilEnd + 10)
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(screen.getByRole('button', { name: 'Guardar cambio' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pago electrónico' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Modificar medio de pago' }),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }))
    expect(changePaymentMethod).not.toHaveBeenCalled()
    expect(confirmMock).not.toHaveBeenCalled()
    expect(saveMock).not.toHaveBeenCalled()
    expect(discardMock).not.toHaveBeenCalled()
  } finally {
    cleanup()
    vi.useRealTimers()
  }
})

it('US-45 edge signs back in after a payment-save 401 and reloads without mutating the private draft', async () => {
  const actualSession = await vi.importActual<typeof import('../api/session')>('../api/session')
  useAccountMock.mockImplementation(function useTestAccount() {
    return useQuery({
      queryKey: ['account'],
      queryFn: async () => DINER,
      staleTime: Infinity,
    }) as ReturnType<typeof useAccount>
  })
  vi.mocked(signOut).mockImplementationOnce(actualSession.signOut)
  const order = orderOf([[PROVOLETA, 1]])
  const data = pageData({
    order,
    cart: {
      arrival_at: '2026-11-03T21:15:00-03:00',
      payment_method: 'online',
      updated_at: order.confirmed_at,
      items: [
        {
          dish_id: BIFE.id,
          name: BIFE.name,
          quantity: 2,
          unit_price: BIFE.price,
          prep_time_minutes: BIFE.prep_time_minutes,
        },
      ],
    },
  })
  const user = await openPage(data, false)
  await user.click(screen.getByRole('button', { name: 'Modificar medio de pago' }))
  await user.click(screen.getByRole('button', { name: 'Pago electrónico' }))
  vi.mocked(changePaymentMethod).mockResolvedValueOnce({ ok: false, kind: 'session' })
  await user.click(screen.getByRole('button', { name: 'Guardar cambio' }))
  expect(
    await screen.findByText(`En /ingresar?volver=${encodeURIComponent('/reservas/res-1/pedido')}`),
  ).toBeVisible()
  expect(signOut).toHaveBeenCalled()
  useAccountMock.mockReturnValue({ data: DINER, isPending: false } as never)
  fetchMock.mockResolvedValue(data)
  await user.click(screen.getByRole('link', { name: 'Volver al pedido' }))
  await screen.findByRole('button', { name: 'Modificar platos' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(screen.getByText('Efectivo', { selector: 'p' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  expect(orderRow('Bife de chorizo')).toBeVisible()
  await review(user)
  expect(screen.getByRole('combobox', { name: 'Hora de llegada' })).toHaveValue('21:15')
  expect(screen.getByRole('button', { name: 'Pago electrónico' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(confirmMock).not.toHaveBeenCalled()
  expect(saveMock).not.toHaveBeenCalled()
  expect(discardMock).not.toHaveBeenCalled()
})

it('US-43 edge keeps the original reservation interval visible when arrival changes', async () => {
  const user = await openPage(pageData({ order: orderOf([[PROVOLETA, 1]]) }), false)
  expect(
    within(screen.getByRole('heading', { level: 1 }).closest('header')!).getByText(/21:00–22:30/),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Modificar platos' }))
  expect(
    within(screen.getByRole('heading', { level: 1 }).closest('header')!).getByText(/21:00–22:30/),
  ).toBeVisible()
  await review(user)
  await user.selectOptions(screen.getByRole('combobox', { name: 'Hora de llegada' }), '21:30')
  expect(
    within(screen.getByRole('heading', { level: 1 }).closest('header')!).getByText(/21:00–22:30/),
  ).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Ver detalle de la cuenta' }))
  const bill = within(screen.getByRole('dialog', { name: 'Detalle de la cuenta' }))
  expect(bill.getByText(/21:00–22:30/)).toBeVisible()
  expect(bill.getByText(/21:30/)).toBeVisible()
  expect(confirmMock).not.toHaveBeenCalled()
})
