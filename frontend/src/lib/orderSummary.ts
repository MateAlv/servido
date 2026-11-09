/** Totals and estimate of an order, with the backend's rules (spec 009-pedido-anticipado, P2 and P3). Money is
 * handled in integer cents so prices like $100,50 add up exactly. */

type SummaryLine = { quantity: number; unitPrice: string; prepTimeMinutes: number | null }

/** "7500.00" → 750000. The API sends money as a decimal string with up to two decimals. */
export function toCents(price: string): number {
  const [whole, fraction = ''] = price.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2))
}

export function subtotalCents(line: SummaryLine): number {
  return line.quantity * toCents(line.unitPrice)
}

/** The total is the sum of the subtotals (prices include taxes); the estimate is the slowest
 * dish that has a time, whatever the quantities, or null when none has one. */
export function orderSummary(lines: SummaryLine[]): {
  totalCents: number
  prepTimeMinutes: number | null
} {
  const times = lines.flatMap((line) =>
    line.prepTimeMinutes === null ? [] : [line.prepTimeMinutes],
  )
  return {
    totalCents: lines.reduce((total, line) => total + subtotalCents(line), 0),
    prepTimeMinutes: times.length ? Math.max(...times) : null,
  }
}

const WHOLE = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})
const WITH_CENTS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})

/** "$ 7.500", or "$ 100,50" when there are cents, like the menu. */
export function formatCents(cents: number): string {
  return cents % 100 === 0 ? WHOLE.format(cents / 100) : WITH_CENTS.format(cents / 100)
}

export function formatPrice(price: string): string {
  return formatCents(toCents(price))
}
