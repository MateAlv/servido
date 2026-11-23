const BA_DATE_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's calendar date in Buenos Aires (`YYYY-MM-DD`), the timezone business rules use. */
export function todayInBuenosAires(): string {
  return BA_DATE_FORMAT.format(new Date())
}

/** The Buenos Aires calendar date (`YYYY-MM-DD`) of an ISO datetime. */
export function dateInBuenosAires(isoDateTime: string): string {
  return BA_DATE_FORMAT.format(new Date(isoDateTime))
}

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** A `YYYY-MM-DD` date as the diner reads it: "martes, 3 de noviembre". */
export function longDate(isoDate: string): string {
  return LONG_DATE_FORMAT.format(new Date(`${isoDate}T12:00:00-03:00`))
}

/** True when two same-day time ranges (`HH:MM`) overlap. */
export function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB
}

const BA_TIME_FORMAT = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** The Buenos Aires `HH:MM` of an ISO datetime, e.g. the end of a reservation block. */
export function timeInBuenosAires(isoDateTime: string): string {
  return BA_TIME_FORMAT.format(new Date(isoDateTime))
}

/** «23/11/2026 16:57» in Buenos Aires, e.g. when a payment was approved. */
export function dateTimeInBuenosAires(isoDateTime: string): string {
  const [year, month, day] = dateInBuenosAires(isoDateTime).split('-')
  return `${day}/${month}/${year} ${timeInBuenosAires(isoDateTime)}`
}

/** The current `HH:MM` in Buenos Aires. */
export function currentTimeInBuenosAires(): string {
  return BA_TIME_FORMAT.format(new Date())
}

/** How far ahead a diner can book (decision D10 of spec 003, pending PO). */
export const MAX_DAYS_AHEAD = 60

/** A `YYYY-MM-DD` date moved by whole days, e.g. tomorrow. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** The last date a diner can book (`YYYY-MM-DD`): today in Buenos Aires plus 60 days. */
export function latestBookableDate(): string {
  return addDays(todayInBuenosAires(), MAX_DAYS_AHEAD)
}
