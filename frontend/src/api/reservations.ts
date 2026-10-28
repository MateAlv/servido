/** Confirming a reservation and the diner's reservations of a day (US-13, spec 005;
 * `contracts/reservations-api.md`). */
import { api } from './client'
import { getApiErrorMessage } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type Reservation = components['schemas']['ReservationResponse']
export type ReservationRequest = components['schemas']['ReservationRequest']

const CONFIRM_FAILED = 'No pudimos confirmar la reserva. Probá de nuevo.'

export type ConfirmResult =
  { ok: true; reservation: Reservation } | { ok: false; status: number; message: string }

/** `POST /api/reservations`. A repeated `request_id` answers the reservation it already made. */
export async function confirmReservation(request: ReservationRequest): Promise<ConfirmResult> {
  const { data, error, response } = await api.POST('/api/reservations', {
    body: request,
    headers: sessionHeaders(),
  })
  if (error || !data) {
    return {
      ok: false,
      status: response.status,
      message: getApiErrorMessage(error, CONFIRM_FAILED),
    }
  }
  return { ok: true, reservation: data }
}

/** `GET /api/reservations?date=`: the signed-in diner's confirmed reservations of that day. */
export async function fetchDayReservations(date: string): Promise<Reservation[]> {
  const { data, error } = await api.GET('/api/reservations', {
    params: { query: { date } },
    headers: sessionHeaders(),
  })
  if (error || !data) throw new Error(getApiErrorMessage(error, 'No pudimos ver tus reservas.'))
  return data.reservations
}
