/**
 * The diner's search filters (spec 027 and the price filter of spec 002-elegir-restaurante):
 * how they live in the URL, how a restaurant meets them and how they read as tags.
 */
import { averageRating, type RestaurantPublic } from '../../data/restaurants.fixture'
import { DIETARY_RESTRICTIONS, restrictionLabel, type DietaryRestriction } from '../../lib/dietary'
import { latestBookableDate, todayInBuenosAires } from '../../lib/date'
import { matchesPriceFilter, PRICE_TIERS, type PriceTier } from './priceFilterUtils'

/** Minimum average rating options (F1). */
export const MIN_RATINGS = [3, 4, 4.5] as const
export type MinRating = (typeof MIN_RATINGS)[number]

/** Party size goes from 1 to 20 (F5). */
export const MAX_PARTY_SIZE = 20

/** A point hour is one of these: reservations start every 30 minutes (spec 003, D5). */
export const HALF_HOURS = Array.from({ length: 48 }, (_, index) =>
  [Math.floor(index / 2), (index % 2) * 30].map((part) => String(part).padStart(2, '0')).join(':'),
)

/**
 * A day and the times a reservation may start, inclusive. A day alone (`dia`) covers the whole
 * day; a point hour (`hora`) has `from === to`; a range (`rango`) stays a range even with equal
 * ends. Only a point hour prefills an hour (F4, F9).
 */
export type TimeFilter = { day: string; mode: 'dia' | 'hora' | 'rango'; from: string; to: string }

/** The times of a day alone: any start that day (F4). */
export const WHOLE_DAY = { from: '00:00', to: '23:59' } as const

export function wholeDay(day: string): TimeFilter {
  return { day, mode: 'dia', ...WHOLE_DAY }
}

export type SearchFilters = {
  priceTiers: PriceTier[]
  minRating: MinRating | null
  restrictions: DietaryRestriction[]
  time: TimeFilter | null
  partySize: number | null
}

export const NO_FILTERS: SearchFilters = {
  priceTiers: [],
  minRating: null,
  restrictions: [],
  time: null,
  partySize: null,
}

/** URL parameters of each filter (F8): `?precio=$$&rating=4&restriccion=sin_tacc&dia=…`. */
export const FILTER_PARAMS = {
  price: 'precio',
  rating: 'rating',
  restriction: 'restriccion',
  day: 'dia',
  hour: 'hora',
  from: 'desde',
  to: 'hasta',
  party: 'personas',
} as const

export const INVERTED_RANGE = 'El «hasta» no puede ser anterior al «desde».'
export const DAY_OUT_OF_RANGE = 'Elegí un día entre hoy y los próximos 60 días.'

/** Why a shared link lost its day (F8): it already passed, or it is beyond the 60 days. */
export type DroppedDay = 'past' | 'far' | null

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isPointHour(time: TimeFilter): boolean {
  return time.mode === 'hora'
}

/** The hour or range with the day; without a valid one, the day alone (and the rest is cleaned). */
function readTime(params: URLSearchParams, day: string): TimeFilter {
  const hour = params.get(FILTER_PARAMS.hour) ?? ''
  if (HALF_HOURS.includes(hour)) return { day, mode: 'hora', from: hour, to: hour }
  const from = params.get(FILTER_PARAMS.from) ?? ''
  const to = params.get(FILTER_PARAMS.to) ?? ''
  if (TIME_PATTERN.test(from) && TIME_PATTERN.test(to) && from <= to) {
    return { day, mode: 'rango', from, to }
  }
  return wholeDay(day)
}

/** The parameters in a fixed order, to compare two URLs whatever order they were written in. */
function sortedEntries(params: URLSearchParams): string {
  return JSON.stringify([...params.entries()].sort())
}

/**
 * The filters in the URL. What is invalid is ignored, so a hand-edited link never applies it,
 * and `needsCleanup` says the URL holds something that should be taken out. `droppedDay` says
 * the link had a day out of the booking window, which is dropped and announced (F8).
 */
export function readSearchFilters(
  params: URLSearchParams,
  today = todayInBuenosAires(),
  latest = latestBookableDate(),
): { filters: SearchFilters; droppedDay: DroppedDay; needsCleanup: boolean } {
  const chosenTiers = params.getAll(FILTER_PARAMS.price)
  const chosenRestrictions = params.getAll(FILTER_PARAMS.restriction)
  const rating = Number(params.get(FILTER_PARAMS.rating))
  const day = params.get(FILTER_PARAMS.day) ?? ''
  const dayIsValid = DATE_PATTERN.test(day) && day >= today && day <= latest
  const party = Number(params.get(FILTER_PARAMS.party))
  const filters: SearchFilters = {
    priceTiers: PRICE_TIERS.filter((tier) => chosenTiers.includes(tier)),
    minRating: MIN_RATINGS.find((option) => option === rating) ?? null,
    restrictions: DIETARY_RESTRICTIONS.map((restriction) => restriction.code).filter((code) =>
      chosenRestrictions.includes(code),
    ),
    time: dayIsValid ? readTime(params, day) : null,
    partySize: Number.isInteger(party) && party >= 1 && party <= MAX_PARTY_SIZE ? party : null,
  }
  return {
    filters,
    droppedDay: !DATE_PATTERN.test(day) ? null : day < today ? 'past' : day > latest ? 'far' : null,
    needsCleanup: sortedEntries(writeSearchFilters(params, filters)) !== sortedEntries(params),
  }
}

/** The same URL with the filters replaced; other parameters stay. */
export function writeSearchFilters(
  params: URLSearchParams,
  filters: SearchFilters,
): URLSearchParams {
  const next = new URLSearchParams(params)
  Object.values(FILTER_PARAMS).forEach((name) => next.delete(name))
  filters.priceTiers.forEach((tier) => next.append(FILTER_PARAMS.price, tier))
  if (filters.minRating !== null) next.set(FILTER_PARAMS.rating, String(filters.minRating))
  filters.restrictions.forEach((code) => next.append(FILTER_PARAMS.restriction, code))
  if (filters.time) {
    next.set(FILTER_PARAMS.day, filters.time.day)
    if (isPointHour(filters.time)) {
      next.set(FILTER_PARAMS.hour, filters.time.from)
    } else if (filters.time.mode === 'rango') {
      next.set(FILTER_PARAMS.from, filters.time.from)
      next.set(FILTER_PARAMS.to, filters.time.to)
    }
  }
  if (filters.partySize !== null) next.set(FILTER_PARAMS.party, String(filters.partySize))
  return next
}

/** No rating filter lets everyone in; with one, restaurants without reviews are left out (F1). */
export function matchesRating(rating: number | null, minRating: MinRating | null): boolean {
  return minRating === null || (rating !== null && rating >= minRating)
}

/** One available dish has to meet every chosen restriction (F2, F3). */
export function matchesRestrictions(
  dishRestrictionSets: readonly (readonly string[])[],
  chosen: readonly DietaryRestriction[],
): boolean {
  return (
    chosen.length === 0 || dishRestrictionSets.some((set) => chosen.every((c) => set.includes(c)))
  )
}

/** The largest table has to seat the party (F5). */
export function matchesPartySize(maxPartySize: number | undefined, partySize: number | null) {
  return partySize === null || (maxPartySize ?? 0) >= partySize
}

/**
 * Whether a restaurant meets every active filter at once (F6). `openIds` are the restaurants
 * open for the time filter, from the API; while it is unknown nobody meets the time filter.
 */
export function matchesSearchFilters(
  restaurant: RestaurantPublic,
  filters: SearchFilters,
  openIds: ReadonlySet<string> | undefined,
): boolean {
  // The test restaurants have no shifts or tables (F10).
  if ((filters.time !== null || filters.partySize !== null) && !restaurant.bookable) return false
  return (
    matchesPriceFilter(
      restaurant.priceTier,
      restaurant.hasMenu ?? restaurant.menu.length > 0,
      filters.priceTiers,
    ) &&
    matchesRating(averageRating(restaurant), filters.minRating) &&
    matchesRestrictions(restaurant.dishRestrictionSets ?? [], filters.restrictions) &&
    matchesPartySize(restaurant.maxPartySize, filters.partySize) &&
    (filters.time === null || (openIds?.has(restaurant.id) ?? false))
  )
}

export function activeFilterCount(filters: SearchFilters): number {
  return filterTags(filters).length
}

/** «4 o más», «4,5 o más». */
export function minRatingLabel(minRating: MinRating): string {
  return `${String(minRating).replace('.', ',')} o más`
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function dayLabel(isoDate: string, weekdayLength: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${weekday.slice(0, weekdayLength)} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
}

/** «Dom 22/11» for 2026-11-22. */
export function shortDayLabel(isoDate: string): string {
  return dayLabel(isoDate, 3)
}

/** «Domingo 22/11» for 2026-11-22. */
export function longDayLabel(isoDate: string): string {
  return dayLabel(isoDate, Infinity)
}

/**
 * «Sáb 22/11» for a day alone, «Sáb 22/11 · 21:00» or «Sáb 22/11 · 20:00–22:00»; a range with
 * equal ends reads as one hour.
 */
export function timeFilterLabel(time: TimeFilter): string {
  if (time.mode === 'dia') return shortDayLabel(time.day)
  const hours = time.from === time.to ? time.from : `${time.from}–${time.to}`
  return `${shortDayLabel(time.day)} · ${hours}`
}

export function partySizeLabel(partySize: number): string {
  return partySize === 1 ? '1 persona' : `${partySize} personas`
}

export type FilterTag = {
  key: string
  label: string
  /** What a screen reader says: «4 o más estrellas» instead of «4 o más ★». */
  spokenLabel: string
  /** The filters without this one. */
  without: (filters: SearchFilters) => SearchFilters
}

/** Each active filter as a removable tag (F7), in the order of the filter panel. */
export function filterTags(filters: SearchFilters): FilterTag[] {
  return [
    ...filters.priceTiers.map((tier) => ({
      key: `precio-${tier}`,
      label: tier,
      spokenLabel: tier,
      without: (current: SearchFilters) => ({
        ...current,
        priceTiers: current.priceTiers.filter((chosen) => chosen !== tier),
      }),
    })),
    ...(filters.minRating === null
      ? []
      : [
          {
            key: 'rating',
            label: `${minRatingLabel(filters.minRating)} ★`,
            spokenLabel: `${minRatingLabel(filters.minRating)} estrellas`,
            without: (current: SearchFilters) => ({ ...current, minRating: null }),
          },
        ]),
    ...filters.restrictions.map((code) => ({
      key: `restriccion-${code}`,
      label: restrictionLabel(code),
      spokenLabel: restrictionLabel(code),
      without: (current: SearchFilters) => ({
        ...current,
        restrictions: current.restrictions.filter((chosen) => chosen !== code),
      }),
    })),
    ...(filters.time === null
      ? []
      : [
          {
            key: 'horario',
            label: timeFilterLabel(filters.time),
            spokenLabel: timeFilterLabel(filters.time),
            without: (current: SearchFilters) => ({ ...current, time: null }),
          },
        ]),
    ...(filters.partySize === null
      ? []
      : [
          {
            key: 'personas',
            label: partySizeLabel(filters.partySize),
            spokenLabel: partySizeLabel(filters.partySize),
            without: (current: SearchFilters) => ({ ...current, partySize: null }),
          },
        ]),
  ]
}

/**
 * What the detail of a restaurant receives so its reservation starts with the filtered day,
 * point hour and party size (F9): `?dia=…&hora=…&personas=…`, or `''`.
 */
export function detailSearch(filters: SearchFilters): string {
  const params = writeSearchFilters(new URLSearchParams(), {
    ...NO_FILTERS,
    time: filters.time,
    partySize: filters.partySize,
  })
  const search = params.toString()
  return search ? `?${search}` : ''
}

/** What the reservation will start with, e.g. «Lun 16/11 · 21:00 · 3 personas»; `''` if nothing. */
export function prefillLabel(filters: SearchFilters): string {
  const { time, partySize } = filters
  return [
    time && (isPointHour(time) ? timeFilterLabel(time) : shortDayLabel(time.day)),
    partySize !== null && partySizeLabel(partySize),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The booking page's own parameters (`?fecha=…&hora=…&personas=…`); only a point hour gives an
 * hour. */
export function reservationSearch(filters: SearchFilters): string {
  const params = new URLSearchParams()
  if (filters.time) {
    params.set('fecha', filters.time.day)
    if (isPointHour(filters.time)) params.set('hora', filters.time.from)
  }
  if (filters.partySize !== null) params.set('personas', String(filters.partySize))
  const search = params.toString()
  return search ? `?${search}` : ''
}

/** What the day and time controls hold while the diner edits them. */
export type TimeDraft = {
  day: string
  mode: 'hora' | 'rango'
  hour: string
  from: string
  to: string
}

export function timeDraftFrom(time: TimeFilter | null): TimeDraft {
  if (!time) return { day: '', mode: 'hora', hour: '', from: '', to: '' }
  if (time.mode === 'dia') return { day: time.day, mode: 'hora', hour: '', from: '', to: '' }
  return isPointHour(time)
    ? { day: time.day, mode: 'hora', hour: time.from, from: '', to: '' }
    : { day: time.day, mode: 'rango', hour: '', from: time.from, to: time.to }
}

/**
 * The draft in the other mode, keeping what was chosen when it still means the same: an hour
 * becomes a range with both ends at that hour, and a range becomes its start rounded up to the
 * next half hour (20:15 becomes 20:30), the first start it allowed.
 */
export function switchTimeMode(draft: TimeDraft, mode: TimeDraft['mode']): TimeDraft {
  if (mode === draft.mode) return draft
  if (mode === 'rango') {
    return { ...draft, mode, from: draft.hour || draft.from, to: draft.hour || draft.to }
  }
  const hour = TIME_PATTERN.test(draft.from) ? HALF_HOURS.find((half) => half >= draft.from) : ''
  return { ...draft, mode, hour: hour ?? '' }
}

/**
 * The time filter the draft applies, or `null` while it is incomplete or invalid. A day with no
 * hour (or an empty range) is the day alone; an hour or a range narrows it (F4). An inverted
 * range or a day out of the booking window is not applied, and `error` says why.
 */
export function timeFromDraft(
  draft: TimeDraft,
  today = todayInBuenosAires(),
  latest = latestBookableDate(),
): { time: TimeFilter | null; error?: string } {
  if (!draft.day) return { time: null }
  if (!DATE_PATTERN.test(draft.day) || draft.day < today || draft.day > latest) {
    return { time: null, error: DAY_OUT_OF_RANGE }
  }
  if (draft.mode === 'hora') {
    if (!draft.hour) return { time: wholeDay(draft.day) }
    return HALF_HOURS.includes(draft.hour)
      ? { time: { day: draft.day, mode: 'hora', from: draft.hour, to: draft.hour } }
      : { time: null }
  }
  if (!draft.from && !draft.to) return { time: wholeDay(draft.day) }
  if (!TIME_PATTERN.test(draft.from) || !TIME_PATTERN.test(draft.to)) return { time: null }
  if (draft.to < draft.from) return { time: null, error: INVERTED_RANGE }
  return { time: { day: draft.day, mode: 'rango', from: draft.from, to: draft.to } }
}
