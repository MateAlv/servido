import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes, useLocation } from 'react-router'

import {
  confirmOrder,
  discardCart,
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
  return <p>En {location.pathname + location.search}</p>
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

async function openPage(data = pageData()) {
  fetchMock.mockResolvedValue(data)
  const user = userEvent.setup()
  renderPage()
  await screen.findByRole('heading', { level: 1, name: 'La Esquina de Palermo' })
  return user
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
  vi.clearAllMocks()
  useAccountMock.mockReturnValue({ data: DINER, isPending: false } as never)
  saveMock.mockResolvedValue({ ok: true })
  discardMock.mockResolvedValue({ ok: true })
})

describe('OrderPage', () => {
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
    expect(screen.getByRole('button', { name: 'Confirmar pedido' })).toBeEnabled()
    expect(confirmMock).not.toHaveBeenCalled()
  })

  it('US-17 S6 confirms the order', async () => {
    const confirmed = pageData({ order: orderOf([[PROVOLETA, 2]]) })
    confirmMock.mockResolvedValue({ ok: true, page: confirmed })
    const user = await openPage()
    await add(user, 'Provoleta')
    await add(user, 'Provoleta')

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByRole('heading', { name: '¡Pedido confirmado!' })).toHaveFocus()
    expect(confirmMock).toHaveBeenCalledWith('res-1', [
      {
        dishId: 'd-1',
        quantity: 2,
        name: 'Provoleta',
        unitPrice: '7500.00',
        prepTimeMinutes: 10,
      },
    ])
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
    await user.click(screen.getByRole('button', { name: 'Confirmar cambios' }))

    expect(await screen.findByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible()
    expect(confirmMock.mock.calls[0][1].map((line) => line.name)).toEqual(['Provoleta', 'Flan'])
  })

  it('US-17 S8 shows the order read-only once closed', async () => {
    await openPage(pageData({ order: orderOf([[PROVOLETA, 2]]) }, false))

    expect(
      screen.getByText('Tu pedido ya está cerrado. Se podía cambiar hasta las 20:15.'),
    ).toBeVisible()
    expect(screen.getByText('Provoleta')).toBeVisible()
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

    expect(confirmMock).toHaveBeenCalledWith('res-1', [])
    expect(await screen.findByText('Quitaste tu pedido. Tu reserva sigue en pie.')).toBeVisible()
  })

  it('US-17 edge asks an unverified diner to verify and keeps the dishes', async () => {
    confirmMock.mockResolvedValue({
      ok: false,
      kind: 'unverified',
      message: 'Verificá tu email para confirmar tu pedido.',
    })
    const user = await openPage()
    await add(user, 'Provoleta')

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(
      await screen.findByText('Para confirmar, verificá tu email. Tus platos quedan guardados.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reenviar mail de verificación' })).toBeVisible()
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
      ),
    )
  })

  it('US-17 edge discards the cart', async () => {
    const order = orderOf([[PROVOLETA, 1]])
    const user = await openPage(
      pageData({
        order,
        cart: {
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
    expect(await screen.findByText('Volviste al pedido confirmado.')).toBeVisible()
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

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    // Signing out sends the diner to sign in and back here, where the cart was saved.
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    expect(saveMock).toHaveBeenCalled()
  })

  it('US-19 S1 shows the estimated time while building and once confirmed', async () => {
    confirmMock.mockResolvedValue({ ok: true, page: pageData({ order: orderOf([[BIFE, 1]]) }) })
    const user = await openPage()
    await add(user, 'Bife de chorizo')

    expect(within(yourOrder()).getByText('Preparación: unos 25 min')).toBeVisible()
    expect(
      within(yourOrder()).getByText('La cocina lo prepara para tu llegada a las 21:00'),
    ).toBeVisible()
    expect(within(menuDish('Bife de chorizo')).getByLabelText('Se prepara en 25 min')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Confirmar pedido' }))
    await screen.findByRole('heading', { name: '¡Pedido confirmado!' })
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
    const toggle = screen.getByRole('button', { name: 'Ver detalle de la cuenta' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Ocultar detalle' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const bill = screen.getByRole('table', { name: 'Detalle de la cuenta' })
    expect(within(bill).getByRole('row', { name: /Provoleta/ })).toHaveTextContent(money(7500))
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

    const bill = screen.getByRole('table', { name: 'Detalle de la cuenta' })
    const cells = (name: RegExp) =>
      within(within(bill).getByRole('row', { name }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent?.replace(/\s/g, ' '))
    expect(cells(/Provoleta/)).toEqual(['Provoleta', '2', money(7500), money(15000)])
    expect(cells(/Bife de chorizo/)).toEqual(['Bife de chorizo', '1', money(18500), money(18500)])
    expect(within(bill).getByRole('row', { name: /Total/ })).toHaveTextContent(money(33500))
  })
})
