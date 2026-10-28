/**
 * Availability of one restaurant for a date and a party size (US-11, spec 005;
 * `contracts/availability-api.md`). Tables are groups: capacity, seating area and how many are
 * free at that start.
 */
import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type { SeatingArea } from '../lib/seating'
export type TimeSlot = components['schemas']['SlotResponse']
export type DayAvailability = components['schemas']['AvailabilityResponse']
export type AvailableTable = components['schemas']['FreeGroupResponse']
export type TablesAvailability = components['schemas']['TablesAvailabilityResponse']

const LOAD_FAILED = 'No pudimos consultar la disponibilidad. Probá de nuevo.'

/** Time slots of one day (`GET /api/restaurants/{id}/availability`). */
export async function fetchAvailability(
  restaurantId: string,
  date: string,
  partySize: number,
): Promise<DayAvailability> {
  const { data, error, response } = await api.GET('/api/restaurants/{restaurant_id}/availability', {
    params: { path: { restaurant_id: restaurantId }, query: { date, party_size: partySize } },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}

/** Table groups with a free table at one start (`GET /api/restaurants/{id}/availability/tables`). */
export async function fetchAvailableTables(
  restaurantId: string,
  date: string,
  startTime: string,
  partySize: number,
): Promise<TablesAvailability> {
  const { data, error, response } = await api.GET(
    '/api/restaurants/{restaurant_id}/availability/tables',
    {
      params: {
        path: { restaurant_id: restaurantId },
        query: { date, start_time: startTime, party_size: partySize },
      },
      headers: sessionHeaders(),
    },
  )
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}
