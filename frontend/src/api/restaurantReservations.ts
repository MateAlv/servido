import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type RestaurantReservation = components['schemas']['RestaurantReservationResponse']
export type RestaurantReservations = components['schemas']['RestaurantReservationsResponse']
export type ReservationDiner = components['schemas']['ReservationDinerResponse']
export type RestaurantCancellation = components['schemas']['RestaurantCancellationResponse']
export type RestaurantCancellations = components['schemas']['RestaurantCancellationsResponse']
export type RestaurantCancellationResult = components['schemas']['RestaurantCancellationResult']

export async function fetchRestaurantReservations(date: string): Promise<RestaurantReservations> {
  const { data, error, response } = await api.GET('/api/restaurante/reservas', {
    params: { query: { date } },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) {
    throw new Error(getApiErrorMessage(error, 'No pudimos cargar las reservas.'))
  }
  return data
}

export async function fetchReservationDiner(reservationId: string): Promise<ReservationDiner> {
  const { data, error, response } = await api.GET(
    '/api/restaurante/reservas/{reservation_id}/comensal',
    {
      params: { path: { reservation_id: reservationId } },
      headers: sessionHeaders(),
    },
  )
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) {
    throw new Error(getApiErrorMessage(error, 'No pudimos cargar los datos del comensal.'))
  }
  return data
}

export async function fetchRestaurantCancellations(
  date?: string,
): Promise<RestaurantCancellations> {
  const { data, error, response } = await api.GET('/api/restaurante/cancelaciones', {
    params: { query: date ? { date } : {} },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) {
    throw new Error(getApiErrorMessage(error, 'No pudimos cargar las cancelaciones.'))
  }
  return data
}

export async function cancelRestaurantReservation(
  reservationId: string,
): Promise<RestaurantCancellationResult> {
  const { data, error, response } = await api.POST(
    '/api/restaurante/reservas/{reservation_id}/cancelar',
    {
      params: { path: { reservation_id: reservationId } },
      headers: sessionHeaders(),
      body: { request_id: crypto.randomUUID() },
    },
  )
  if (response.status === 401) throw new SessionExpiredError()
  if (response.status === 502) {
    throw new Error(
      'No pudimos completar el reembolso. La reserva sigue activa. Volvé a intentarlo.',
    )
  }
  if (error || !data) {
    throw new Error(getApiErrorMessage(error, 'No pudimos cancelar la reserva.'))
  }
  return data
}
