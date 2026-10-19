import { describe, expect, it } from 'vitest'

import { matchesPriceFilter, PRICE_TIERS, type PriceTier } from './priceFilter'

describe('matchesPriceFilter', () => {
  it('US-7 S1 matches each price tier and multiple selected tiers', () => {
    for (const selected of PRICE_TIERS) {
      for (const tier of PRICE_TIERS) {
        expect(matchesPriceFilter(tier, true, [selected])).toBe(tier === selected)
      }
    }
    expect(matchesPriceFilter('$', true, ['$', '$$$$'])).toBe(true)
    expect(matchesPriceFilter('$$$$', true, ['$', '$$$$'])).toBe(true)
    expect(matchesPriceFilter('$$', true, ['$', '$$$$'])).toBe(false)
  })

  it('US-7 S2 recalculates matches for the new selection', () => {
    expect(matchesPriceFilter('$$', true, ['$'])).toBe(false)
    expect(matchesPriceFilter('$$', true, ['$$'])).toBe(true)
  })

  it('US-7 S3 restores the original set without mutating its array', () => {
    const original = Object.freeze([...PRICE_TIERS, null])
    const selection: readonly PriceTier[] = Object.freeze(['$'])
    expect(original.filter((tier) => matchesPriceFilter(tier, tier !== null, selection))).toEqual([
      '$',
    ])
    const restored = original.filter((tier) => matchesPriceFilter(tier, tier !== null, []))
    expect(restored).toEqual(original)
    expect(restored).not.toBe(original)
    expect(selection).toEqual(['$'])
  })

  it('US-7 edge excludes restaurants without menus or known tiers when active', () => {
    expect(matchesPriceFilter('$', false, ['$'])).toBe(false)
    expect(matchesPriceFilter(null, true, ['$'])).toBe(false)
    expect(matchesPriceFilter('$', false, [])).toBe(true)
    expect(matchesPriceFilter(null, false, [])).toBe(true)
  })
})
