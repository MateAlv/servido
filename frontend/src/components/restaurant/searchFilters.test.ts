import { describe, expect, it } from 'vitest'

import { RESTAURANTS_FIXTURE, type RestaurantPublic } from '../../data/restaurants.fixture'
import {
  activeFilterCount,
  detailSearch,
  filterTags,
  matchesPartySize,
  matchesRating,
  matchesRestrictions,
  matchesSearchFilters,
  NO_FILTERS,
  readSearchFilters,
  reservationSearch,
  isTimeDraftPending,
  longDayLabel,
  prefillLabel,
  shortDayLabel,
  switchTimeMode,
  timeFromDraft,
  writeSearchFilters,
  type SearchFilters,
  type TimeFilter,
} from './searchFilters'

const TODAY = '2026-11-15'
const LATEST = '2027-01-14'

function read(search: string) {
  return readSearchFilters(new URLSearchParams(search), TODAY, LATEST)
}

const REAL: RestaurantPublic = {
  id: 'real-1',
  name: 'Parrilla Real',
  description: '',
  cuisine: '',
  averageSpendPerPerson: null,
  priceTier: '$$',
  dietaryRestrictions: [],
  location: { lat: -34.58, lng: -58.43, address: '', neighborhood: '' },
  occupancy: null,
  menu: [],
  reviews: [],
  rating: 4.2,
  reviewCount: 3,
  photo: null,
  hasMenu: true,
  maxPartySize: 8,
  dishRestrictionSets: [['sin_tacc', 'vegano']],
  bookable: true,
}

describe('readSearchFilters and writeSearchFilters (F8)', () => {
  it('US-35 S1 reads every filter from the URL', () => {
    expect(
      read(
        'precio=%24%24&rating=4.5&restriccion=vegano&restriccion=sin_tacc&dia=2026-11-22&hora=21:00&personas=6',
      ),
    ).toEqual({
      filters: {
        priceTiers: ['$$'],
        minRating: 4.5,
        restrictions: ['sin_tacc', 'vegano'],
        time: { day: '2026-11-22', mode: 'hora', from: '21:00', to: '21:00' },
        partySize: 6,
      },
      droppedDay: null,
      needsCleanup: false,
    })
  })

  it('US-59 S2 reads a range', () => {
    expect(read('dia=2026-11-22&desde=20:00&hasta=22:00').filters.time).toEqual({
      day: '2026-11-22',
      mode: 'rango',
      from: '20:00',
      to: '22:00',
    })
  })

  it('US-59 S2 keeps a range with equal ends as a range', () => {
    const range = { day: '2026-11-22', mode: 'rango' as const, from: '12:00', to: '12:00' }
    const written = writeSearchFilters(new URLSearchParams(), { ...NO_FILTERS, time: range })

    expect(written.toString()).toBe('dia=2026-11-22&desde=12%3A00&hasta=12%3A00')
    expect(readSearchFilters(written, TODAY, LATEST).filters.time).toEqual(range)
    expect(reservationSearch({ ...NO_FILTERS, time: range })).toBe('?fecha=2026-11-22')
  })

  it('US-59 edge ignores what is invalid in a hand-edited link and asks to clean it', () => {
    const { filters, needsCleanup } = read(
      'rating=5&restriccion=sin_lactosa&dia=2026-11-22&hora=21:10&personas=21&precio=caro',
    )
    expect(filters).toEqual(NO_FILTERS)
    expect(needsCleanup).toBe(true)
    expect(read('rating=9&personas=50&restriccion=foo&precio=xyz&otro=1')).toEqual({
      filters: NO_FILTERS,
      droppedDay: null,
      needsCleanup: true,
    })
    expect(read('dia=2026-11-22&desde=22:00&hasta=20:00').filters.time).toBeNull()
    expect(read('dia=2027-01-15&hora=21:00').filters.time).toBeNull()
    expect(read('personas=0').filters.partySize).toBeNull()
  })

  it('US-59 edge drops a day that already passed and says so', () => {
    expect(read('dia=2026-11-14&hora=21:00')).toEqual({
      filters: NO_FILTERS,
      droppedDay: 'past',
      needsCleanup: true,
    })
    expect(read(`dia=${TODAY}&hora=21:00`)).toMatchObject({ droppedDay: null, needsCleanup: false })
  })

  it('US-59 edge drops a day beyond the 60 days and says so', () => {
    expect(read('dia=2027-01-15&hora=21:00')).toEqual({
      filters: NO_FILTERS,
      droppedDay: 'far',
      needsCleanup: true,
    })
    expect(read(`dia=${LATEST}&hora=21:00`).droppedDay).toBeNull()
  })

  it('US-35 edge writes the filters and keeps other parameters', () => {
    const filters: SearchFilters = {
      priceTiers: ['$', '$$$'],
      minRating: 4,
      restrictions: ['vegetariano'],
      time: { day: '2026-11-22', mode: 'rango', from: '20:00', to: '22:00' },
      partySize: 3,
    }
    const written = writeSearchFilters(new URLSearchParams('otro=1&hora=10:00'), filters)

    expect(written.get('otro')).toBe('1')
    expect(written.get('hora')).toBeNull()
    expect(readSearchFilters(written, TODAY, LATEST).filters).toEqual(filters)
    expect(writeSearchFilters(written, NO_FILTERS).toString()).toBe('otro=1')
  })
})

describe('matchesRating (US-35)', () => {
  it('US-35 S1 keeps averages equal to or above the minimum', () => {
    expect(matchesRating(4, 4)).toBe(true)
    expect(matchesRating(4.67, 4.5)).toBe(true)
    expect(matchesRating(3.5, 4)).toBe(false)
  })

  it('US-35 edge compares the unrounded average', () => {
    // 3,96 is shown as 4,0 but doesn't reach «4 o más».
    expect(matchesRating(3.96, 4)).toBe(false)
  })

  it('US-35 S4 leaves out a restaurant without reviews only while the filter is active', () => {
    expect(matchesRating(null, 3)).toBe(false)
    expect(matchesRating(null, null)).toBe(true)
  })
})

describe('matchesRestrictions (US-53)', () => {
  const both = [['sin_tacc', 'vegano']]
  const apart = [['sin_tacc'], ['vegano']]

  it('US-53 S1 needs one dish with the restriction', () => {
    expect(matchesRestrictions(apart, ['sin_tacc'])).toBe(true)
    expect(matchesRestrictions([['vegetariano']], ['sin_tacc'])).toBe(false)
    expect(matchesRestrictions([], ['vegano'])).toBe(false)
  })

  it('US-53 S2 needs one dish with every chosen restriction (F3)', () => {
    expect(matchesRestrictions(both, ['sin_tacc', 'vegano'])).toBe(true)
    expect(matchesRestrictions(apart, ['sin_tacc', 'vegano'])).toBe(false)
  })

  it('US-53 S4 lets every restaurant in without restrictions', () => {
    expect(matchesRestrictions([], [])).toBe(true)
  })
})

describe('matchesPartySize (US-61)', () => {
  it('US-61 S1 needs a table for the whole party', () => {
    expect(matchesPartySize(4, 6)).toBe(false)
    expect(matchesPartySize(8, 6)).toBe(true)
    expect(matchesPartySize(undefined, 1)).toBe(false)
  })

  it('US-61 S3 lets every restaurant in without a party size', () => {
    expect(matchesPartySize(undefined, null)).toBe(true)
  })
})

describe('matchesSearchFilters (F6, F10)', () => {
  it('US-35 common S1 asks for every filter at once, price included', () => {
    const filters = { ...NO_FILTERS, priceTiers: ['$$' as const], minRating: 4 as const }
    expect(matchesSearchFilters(REAL, filters, undefined)).toBe(true)
    expect(matchesSearchFilters({ ...REAL, priceTier: '$' }, filters, undefined)).toBe(false)
    expect(matchesSearchFilters({ ...REAL, rating: 3.9 }, filters, undefined)).toBe(false)
  })

  it('US-59 S1 keeps the restaurants open at that time', () => {
    const filters: SearchFilters = {
      ...NO_FILTERS,
      time: { day: TODAY, mode: 'hora', from: '21:00', to: '21:00' },
    }
    expect(matchesSearchFilters(REAL, filters, new Set(['real-1']))).toBe(true)
    expect(matchesSearchFilters(REAL, filters, new Set())).toBe(false)
    // While the API hasn't answered, nobody is known to be open.
    expect(matchesSearchFilters(REAL, filters, undefined)).toBe(false)
  })

  it('US-61 edge leaves the test restaurants out of the time and party filters (F10)', () => {
    const test = RESTAURANTS_FIXTURE[0]
    const everyone = new Set(RESTAURANTS_FIXTURE.map((restaurant) => restaurant.id))
    expect(matchesSearchFilters(test, { ...NO_FILTERS, partySize: 1 }, undefined)).toBe(false)
    expect(
      matchesSearchFilters(
        test,
        { ...NO_FILTERS, time: { day: TODAY, mode: 'rango', from: '00:00', to: '23:59' } },
        everyone,
      ),
    ).toBe(false)
  })

  it('US-53 edge uses the test dishes for the test restaurants (F10)', () => {
    const glutenFree = RESTAURANTS_FIXTURE.filter((restaurant) =>
      matchesSearchFilters(restaurant, { ...NO_FILTERS, restrictions: ['sin_tacc'] }, undefined),
    ).map((restaurant) => restaurant.name)
    expect(glutenFree).toEqual([
      'La Esquina de Palermo',
      'Terraza del Río',
      'Café San Telmo',
      'Sushi Cañitas',
    ])
  })
})

describe('filter tags (F7)', () => {
  it('US-35 common S2 describes each active filter', () => {
    const filters: SearchFilters = {
      priceTiers: ['$$'],
      minRating: 4,
      restrictions: ['sin_tacc'],
      time: { day: '2026-11-22', mode: 'hora', from: '21:00', to: '21:00' },
      partySize: 6,
    }
    expect(filterTags(filters).map((tag) => tag.label)).toEqual([
      '$$',
      '4 o más ★',
      'Sin TACC',
      'Dom 22/11 · 21:00',
      '6 personas',
    ])
    expect(filterTags(filters)[1].spokenLabel).toBe('4 o más estrellas')
    expect(activeFilterCount(filters)).toBe(5)
    expect(
      filterTags({ ...NO_FILTERS, minRating: 4.5, partySize: 1 }).map((tag) => tag.label),
    ).toEqual(['4,5 o más ★', '1 persona'])
  })

  it('US-59 common S2 shows a range with both ends', () => {
    const [tag] = filterTags({
      ...NO_FILTERS,
      time: { day: '2026-11-21', mode: 'rango', from: '20:00', to: '22:00' },
    })
    expect(tag.label).toBe('Sáb 21/11 · 20:00–22:00')
    expect(shortDayLabel('2026-12-01')).toBe('Mar 01/12')
    expect(longDayLabel('2026-11-22')).toBe('Domingo 22/11')
    expect(shortDayLabel('2026-11-18')).toBe('Mié 18/11')
  })

  it('US-53 S3 removes one tag and keeps the rest', () => {
    const filters = { ...NO_FILTERS, restrictions: ['sin_tacc' as const, 'vegano' as const] }
    const [glutenFree] = filterTags(filters)
    expect(glutenFree.without(filters)).toEqual({ ...NO_FILTERS, restrictions: ['vegano'] })
  })
})

describe('timeFromDraft (US-59)', () => {
  const draft = { day: '2026-11-22', mode: 'hora' as const, hour: '', from: '', to: '' }

  it('US-59 S1 applies a day and a point hour', () => {
    expect(timeFromDraft({ ...draft, hour: '21:00' }, TODAY, LATEST)).toEqual({
      time: { day: '2026-11-22', mode: 'hora', from: '21:00', to: '21:00' },
    })
  })

  it('US-59 S2 applies a range, both ends included', () => {
    expect(
      timeFromDraft({ ...draft, mode: 'rango', from: '12:00', to: '14:00' }, TODAY, LATEST),
    ).toEqual({ time: { day: '2026-11-22', mode: 'rango', from: '12:00', to: '14:00' } })
  })

  it('US-59 edge does not apply an inverted range and says why', () => {
    expect(
      timeFromDraft({ ...draft, mode: 'rango', from: '22:00', to: '20:00' }, TODAY, LATEST),
    ).toEqual({ time: null, error: 'El «hasta» no puede ser anterior al «desde».' })
  })

  it('US-59 edge does not apply a day out of the booking window', () => {
    expect(timeFromDraft({ ...draft, day: '2027-01-15', hour: '21:00' }, TODAY, LATEST)).toEqual({
      time: null,
      error: 'Elegí un día entre hoy y los próximos 60 días.',
    })
  })

  it('US-59 S3 switching between hour and range keeps what still means the same', () => {
    const point = { ...draft, hour: '21:00' }
    const range = switchTimeMode(point, 'rango')
    expect(timeFromDraft(range, TODAY, LATEST).time).toEqual({
      day: '2026-11-22',
      mode: 'rango',
      from: '21:00',
      to: '21:00',
    })
    expect(switchTimeMode({ ...range, from: '20:00', to: '22:00' }, 'hora').hour).toBe('20:00')
    expect(switchTimeMode({ ...range, from: '20:10', to: '22:00' }, 'hora').hour).toBe('')
  })

  it('US-59 edge flags a day still waiting for its hour', () => {
    expect(isTimeDraftPending(draft, null)).toBe(true)
    expect(isTimeDraftPending({ ...draft, day: '' }, null)).toBe(false)
  })

  it('US-59 edge waits for the day and the time', () => {
    expect(timeFromDraft(draft, TODAY, LATEST)).toEqual({ time: null })
    expect(timeFromDraft({ ...draft, day: '', hour: '21:00' }, TODAY, LATEST)).toEqual({
      time: null,
    })
  })
})

describe('reservation prefill (F9)', () => {
  const point: TimeFilter = { day: '2026-11-22', mode: 'hora', from: '21:00', to: '21:00' }
  const range: TimeFilter = { day: '2026-11-22', mode: 'rango', from: '20:00', to: '22:00' }

  it('US-59 common S5 carries the day, the point hour and the party size', () => {
    const filters = { ...NO_FILTERS, minRating: 4 as const, time: point, partySize: 6 }
    expect(detailSearch(filters)).toBe('?dia=2026-11-22&hora=21%3A00&personas=6')
    expect(reservationSearch(filters)).toBe('?fecha=2026-11-22&hora=21%3A00&personas=6')
  })

  it('US-59 common S5 starts a range without an hour', () => {
    const filters = { ...NO_FILTERS, time: range }
    expect(
      reservationSearch(
        readSearchFilters(new URLSearchParams(detailSearch(filters)), TODAY, LATEST).filters,
      ),
    ).toBe('?fecha=2026-11-22')
  })

  it('US-59 common S5 says what the reservation starts with', () => {
    expect(prefillLabel({ ...NO_FILTERS, time: point, partySize: 3 })).toBe(
      'Dom 22/11 · 21:00 · 3 personas',
    )
    expect(prefillLabel({ ...NO_FILTERS, time: range })).toBe('Dom 22/11')
    expect(prefillLabel({ ...NO_FILTERS, minRating: 4 })).toBe('')
  })

  it('US-61 common S5 carries only the party size', () => {
    expect(reservationSearch({ ...NO_FILTERS, partySize: 3 })).toBe('?personas=3')
    expect(detailSearch(NO_FILTERS)).toBe('')
    expect(reservationSearch(NO_FILTERS)).toBe('')
  })
})
