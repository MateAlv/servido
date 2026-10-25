/**
 * Temporary fixture of the availability contract (contracts/availability-api.md), while
 * spec 004 has no shifts/tables in the backend. Team decision of 23/10 in specs/README.md.
 * It never reaches the database; it is deleted with the «Datos de prueba» pill in T018.
 */
import type { DayAvailability, SeatingArea, TablesAvailability } from '../api/availability'
import { todayInBuenosAires } from '../lib/date'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'

/** Monday closed; lunch and dinner shifts on the other weekdays. */
const SHIFTS: [start: number, end: number][] = [
  [12 * 60, 15 * 60],
  [20 * 60, 23 * 60 + 30],
]
const DURATION_MINUTES = 90
const STEP_MINUTES = 30

/** A slot with no free table at all: the page shows it as «Ocupado» (S4). */
const FULLY_BOOKED_SLOTS = new Set(['20:30'])

/** Tables already taken at a start: at 21:00 the terrace table is not offered (S7). */
const TAKEN_TABLES: Record<string, string[]> = { '21:00': ['mesa-4'] }

const TABLES = [
  { id: 'mesa-1', label: 'Mesa 1', capacity: 2, seating_area: 'indoor', active: true },
  { id: 'mesa-2', label: 'Mesa 2', capacity: 2, seating_area: 'indoor', active: true },
  { id: 'mesa-3', label: 'Mesa 3', capacity: 4, seating_area: 'outdoor', active: true },
  { id: 'mesa-4', label: 'Mesa 4', capacity: 4, seating_area: 'terrace', active: true },
  // Inactive: it is never offered, the same rule the real query applies (US-10 S2).
  { id: 'mesa-5', label: 'Mesa 5', capacity: 2, seating_area: 'indoor', active: false },
] satisfies {
  id: string
  label: string
  capacity: number
  seating_area: SeatingArea
  active: boolean
}[]

/** Order of the contract: seating area, then capacity, then label. */
const AREA_ORDER: SeatingArea[] = ['indoor', 'outdoor', 'terrace']

const ACTIVE_TABLES = TABLES.filter((table) => table.active)

/** The restaurant's cap (FR-013): the largest capacity among its active tables. */
export const FIXTURE_MAX_PARTY_SIZE = Math.max(0, ...ACTIVE_TABLES.map((table) => table.capacity))

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

const minutesToTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/** The fixture restaurant does not open on Mondays. */
const closesOnWeekday = (date: string): boolean => new Date(`${date}T12:00:00Z`).getUTCDay() === 1

/** Tables free for the whole 90-minute block: active, big enough and not taken. */
function freeTables(startTime: string, partySize: number) {
  if (FULLY_BOOKED_SLOTS.has(startTime) || partySize > FIXTURE_MAX_PARTY_SIZE) return []
  const taken = TAKEN_TABLES[startTime] ?? []
  return ACTIVE_TABLES.filter(
    (table) => table.capacity >= partySize && !taken.includes(table.id),
  ).sort(
    (a, b) =>
      AREA_ORDER.indexOf(a.seating_area) - AREA_ORDER.indexOf(b.seating_area) ||
      a.capacity - b.capacity ||
      a.label.localeCompare(b.label, 'es'),
  )
}

/** Time slots of one day: past days are closed and past starts of today are removed. */
export function availabilityFor(
  restaurantId: string,
  date: string,
  partySize: number,
): DayAvailability {
  const today = todayInBuenosAires()
  const now = timeToMinutes(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  )
  const open = date >= today && !closesOnWeekday(date)
  const slots: DayAvailability['slots'] = []
  if (open && partySize >= 1 && partySize <= FIXTURE_MAX_PARTY_SIZE) {
    for (const [start, end] of SHIFTS) {
      for (let at = start; at + DURATION_MINUTES <= end; at += STEP_MINUTES) {
        if (date > today || at > now) {
          const start_time = minutesToTime(at)
          slots.push({ start_time, available: freeTables(start_time, partySize).length > 0 })
        }
      }
    }
  }
  return {
    restaurant_id: restaurantId,
    date,
    open,
    duration_minutes: DURATION_MINUTES,
    max_party_size: FIXTURE_MAX_PARTY_SIZE,
    slots,
  }
}

/** Tables free for one start, ordered as the contract says. */
export function tablesFor(
  restaurantId: string,
  date: string,
  startTime: string,
  partySize: number,
): TablesAvailability {
  // Buenos Aires has no daylight saving since 2009, so the mock writes the offset by hand.
  const endsAt = minutesToTime(timeToMinutes(startTime) + DURATION_MINUTES)
  return {
    restaurant_id: restaurantId,
    date,
    start_time: startTime,
    ends_at: `${date}T${endsAt}:00-03:00`,
    tables: freeTables(startTime, partySize),
  }
}
