/** The pre-order of a reservation and its cart (US-17, US-19, US-21, spec 009-pedido-anticipado;
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
  | { kind: 'failed'; message: string; retryable?: boolean }

const LOAD_FAILED = 'No pudimos cargar tu pedido.'
const CONFIRM_FAILED = 'No pudimos confirmar tu pedido. Tus platos siguen acá, probá de nuevo.'
const SAVE_FAILED = 'No pudimos guardar tus cambios. Siguen en esta página.'

export class ReservationNotFoundError extends Error {}

export type PaymentMethod = components['schemas']['PaymentMethodRequest']['payment_method']
export type DraftMetadata = { arrival_at: string; payment_method: PaymentMethod | null }

function body(lines: CartLine[], metadata: DraftMetadata) {
  return {
    ...metadata,
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
  return { kind: 'failed', message: getApiErrorMessage(error, fallback), retryable: status >= 500 }
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
  metadata: DraftMetadata,
  operationId: string,
): Promise<{ ok: true; page: OrderPage } | ({ ok: false } & WriteFailure)> {
  const { data, error, response } = await api.PUT('/api/reservations/{reservation_id}/order', {
    params: { path: { reservation_id: reservationId } },
    body: { ...body(lines, metadata), operation_id: operationId },
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
  metadata: DraftMetadata,
): Promise<{ ok: true } | ({ ok: false } & WriteFailure)> {
  const { error, response } = await api.PUT('/api/reservations/{reservation_id}/cart', {
    params: { path: { reservation_id: reservationId } },
    body: body(lines, metadata),
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

export async function changePaymentMethod(
  reservationId: string,
  method: PaymentMethod,
): Promise<{ ok: true; page: OrderPage } | ({ ok: false } & WriteFailure)> {
  const { data, error, response } = await api.PUT(
    '/api/reservations/{reservation_id}/order/payment-method',
    {
      params: { path: { reservation_id: reservationId } },
      body: { payment_method: method },
      headers: sessionHeaders(),
    },
  )
  if (error || !data)
    return { ok: false, ...failure(response.status, error, 'No pudimos guardar el medio de pago.') }
  return { ok: true, page: data }
}
