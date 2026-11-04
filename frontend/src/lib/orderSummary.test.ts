import { describe, expect, it } from 'vitest'

import { formatCents, orderSummary, subtotalCents, toCents } from './orderSummary'

describe('orderSummary', () => {
  it('US-19 S2 the estimate is the slowest dish with a time', () => {
    const summary = orderSummary([
      { quantity: 4, unitPrice: '7500.00', prepTimeMinutes: 10 },
      { quantity: 1, unitPrice: '18500.00', prepTimeMinutes: 25 },
      { quantity: 2, unitPrice: '6000.00', prepTimeMinutes: null },
    ])

    expect(summary.prepTimeMinutes).toBe(25)
    expect(orderSummary([{ quantity: 1, unitPrice: '6000', prepTimeMinutes: null }])).toEqual({
      totalCents: 600000,
      prepTimeMinutes: null,
    })
  })

  it('US-21 S3 adds prices with cents exactly', () => {
    const lines = [
      { quantity: 3, unitPrice: '100.10', prepTimeMinutes: null },
      { quantity: 1, unitPrice: '0.20', prepTimeMinutes: null },
      { quantity: 2, unitPrice: '7500', prepTimeMinutes: null },
    ]

    expect(lines.map(subtotalCents)).toEqual([30030, 20, 1500000])
    expect(orderSummary(lines).totalCents).toBe(1530050)
    expect(toCents('100.5')).toBe(10050)
    expect(formatCents(10050)).toMatch(/100,50/)
    expect(formatCents(750000)).toMatch(/7\.500$/)
  })
})
