/**
 * Availability of one restaurant for a date and a party size (US-11, spec 005).
 *
 * The two functions mirror `contracts/availability-api.md` exactly. While spec 004 and its
 * endpoints are missing they answer from `frontend/src/data/reservationAvailability.fixture.ts`
 * and `isUsingMockData` is true, so the page labels the data «Datos de prueba» (team decision
 * of 23/10 in specs/README.md). T018 swaps this module for the typed client and deletes the
 * fixture; the page imports only these functions, so the swap touches one file.
 */
import { availabilityFor, tablesFor } from '../data/reservationAvailability.fixture'

/** Glossary: tipo de mesa. The UI shows «Adentro», «Afuera» and «Terraza». */
export type SeatingArea = 'indoor' | 'outdoor' | 'terrace'

export type TimeSlot = {
  start_time: string
  /** False when no table with enough capacity is free for the whole block: shown as «Ocupado». */
  available: boolean
}

export type DayAvailability = {
  restaurant_id: string
  date: string
  /** False when the weekday has no shift: `slots` is then empty. */
  open: boolean
  duration_minutes: number
  /** Restaurant's cap (FR-013): the largest capacity among its active tables. 0 when it has none. */
  max_party_size: number
  slots: TimeSlot[]
}

export type AvailableTable = {
  id: string
  label: string
  capacity: number
  seating_area: SeatingArea
}

export type TablesAvailability = {
  restaurant_id: string
  date: string
  start_time: string
  ends_at: string
  /** Empty is a valid answer (S7): there is no availability for that start and party size. */
  tables: AvailableTable[]
}

/** True while the fixture answers instead of the API; removed with it in T018. */
export const isUsingMockData = true

/** Short wait so the demo shows the loading skeletons, like the prototype's 220 ms. */
const MOCK_LATENCY_MS = 220

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))

/** Time slots of one day (`GET /api/restaurants/{id}/availability`). */
export async function fetchAvailability(
  restaurantId: string,
  date: string,
  partySize: number,
): Promise<DayAvailability> {
  await wait()
  return availabilityFor(restaurantId, date, partySize)
}

/** Tables free for one start (`GET /api/restaurants/{id}/availability/tables`). */
export async function fetchAvailableTables(
  restaurantId: string,
  date: string,
  startTime: string,
  partySize: number,
): Promise<TablesAvailability> {
  await wait()
  return tablesFor(restaurantId, date, startTime, partySize)
}
