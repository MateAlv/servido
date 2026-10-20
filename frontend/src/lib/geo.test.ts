import { describe, expect, it } from 'vitest'

import { distanceKm, formatDistance, isValidPoint } from './geo'

describe('geo', () => {
  it('US-5 edge measures straight-line distance between two points', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1)
    expect(distanceKm({ lat: -34.6, lng: -58.4 }, { lat: -34.6, lng: -58.4 })).toBe(0)
  })

  it('US-5 edge formats distances in metres and kilometres with a comma', () => {
    expect(formatDistance(0.85)).toBe('850 m')
    expect(formatDistance(1.24)).toBe('1,2 km')
  })

  it('US-5 edge rejects points that cannot be placed on the map (FR-011)', () => {
    expect(isValidPoint(null)).toBe(false)
    expect(isValidPoint({ lat: Number.NaN, lng: -58.4 })).toBe(false)
    expect(isValidPoint({ lat: -91, lng: -58.4 })).toBe(false)
    expect(isValidPoint({ lat: -34.6, lng: 181 })).toBe(false)
    expect(isValidPoint({ lat: -34.6, lng: -58.4 })).toBe(true)
  })
})
