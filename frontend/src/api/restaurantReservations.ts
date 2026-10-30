import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type RestaurantReservation = components['schemas']['RestaurantReservationResponse']
export type RestaurantReservations = components['schemas']['RestaurantReservationsResponse']

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
