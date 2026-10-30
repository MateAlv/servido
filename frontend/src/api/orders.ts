/** The pre-order of a reservation and its cart (US-17, US-19, US-21, spec 009;
 * `contracts/orders-api.md`). */
import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type OrderPage = components['schemas']['OrderPageResponse']
export type ConfirmedOrder = components['schemas']['OrderResponse']
export type SavedCart = components['schemas']['CartResponse']
export type MenuDish = components['schemas']['OrderMenuDish']
export type UpcomingReservation = components['schemas']['ReservationResponse']

/** A dish of the order being built, with the name, price and time the diner saw (P9). */
export type CartLine = {
  dishId: string
  quantity: number
  name: string
  unitPrice: string
  prepTimeMinutes: number | null
}

/** A failed write: what the page must do about it. */
export type WriteFailure =
  | { kind: 'session' }
  /** One of the two 409s: the page reloads and tells them apart by `order_open`. */
  | { kind: 'conflict' }
  | { kind: 'unverified'; message: string }
  | { kind: 'failed'; message: string }

const LOAD_FAILED = 'No pudimos cargar tu pedido.'
const CONFIRM_FAILED = 'No pudimos confirmar tu pedido. Tus platos siguen acá, probá de nuevo.'
const SAVE_FAILED = 'No pudimos guardar tus cambios. Siguen en esta página.'

export class ReservationNotFoundError extends Error {}

function body(lines: CartLine[]) {
  return {
    items: lines.map((line) => ({
      dish_id: line.dishId,
      quantity: line.quantity,
      name: line.name,
      unit_price: line.unitPrice,
      prep_time_minutes: line.prepTimeMinutes,
    })),
  }
}

function failure(status: number, error: unknown, fallback: string): WriteFailure {
  if (status === 401) return { kind: 'session' }
  if (status === 409) return { kind: 'conflict' }
  if (status === 403) return { kind: 'unverified', message: getApiErrorMessage(error, fallback) }
  return { kind: 'failed', message: getApiErrorMessage(error, fallback) }
}

/** `GET /api/reservations/{id}/order`: the reservation, its order, the cart and the menu. */
export async function fetchOrder(reservationId: string): Promise<OrderPage> {
  const { data, error, response } = await api.GET('/api/reservations/{reservation_id}/order', {
    params: { path: { reservation_id: reservationId } },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (response.status === 404) throw new ReservationNotFoundError(getApiErrorMessage(error, ''))
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}

/** `PUT /api/reservations/{id}/order`: confirms these lines; no lines removes the order. */
export async function confirmOrder(
  reservationId: string,
  lines: CartLine[],
): Promise<{ ok: true; page: OrderPage } | ({ ok: false } & WriteFailure)> {
  const { data, error, response } = await api.PUT('/api/reservations/{reservation_id}/order', {
    params: { path: { reservation_id: reservationId } },
    body: body(lines),
    headers: sessionHeaders(),
  })
  if (error || !data) return { ok: false, ...failure(response.status, error, CONFIRM_FAILED) }
  return { ok: true, page: data }
}

/** `PUT /api/reservations/{id}/cart`: saves the order being built. */
export async function saveCart(
  reservationId: string,
  lines: CartLine[],
  options: { keepalive?: boolean } = {},
): Promise<{ ok: true } | ({ ok: false } & WriteFailure)> {
  const { error, response } = await api.PUT('/api/reservations/{reservation_id}/cart', {
    params: { path: { reservation_id: reservationId } },
    body: body(lines),
    headers: sessionHeaders(),
    keepalive: options.keepalive,
  })
  if (error) return { ok: false, ...failure(response.status, error, SAVE_FAILED) }
  return { ok: true }
}

/** `DELETE /api/reservations/{id}/cart`: «Descartar cambios». */
export async function discardCart(
  reservationId: string,
): Promise<{ ok: true } | ({ ok: false } & WriteFailure)> {
  const { error, response } = await api.DELETE('/api/reservations/{reservation_id}/cart', {
    params: { path: { reservation_id: reservationId } },
    headers: sessionHeaders(),
  })
  if (error) return { ok: false, ...failure(response.status, error, SAVE_FAILED) }
  return { ok: true }
}

/** `GET /api/reservations/upcoming`: the diner's next confirmed reservations (P4). */
export async function fetchUpcomingReservations(): Promise<UpcomingReservation[]> {
  const { data, error, response } = await api.GET('/api/reservations/upcoming', {
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, 'No pudimos ver tus reservas.'))
  return data.reservations
}

export const SAVE_FAILED_MESSAGE = SAVE_FAILED
export const CONFIRM_FAILED_MESSAGE = CONFIRM_FAILED
export const DISCARD_FAILED_MESSAGE = 'No pudimos descartar los cambios. Probá de nuevo.'
