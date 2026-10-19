/** UI categories, independent of the pending restaurant API representation. */
export const PRICE_TIERS = ['$', '$$', '$$$', '$$$$'] as const
export type PriceTier = (typeof PRICE_TIERS)[number]

/** Convert a known average spend per person in Argentine pesos to a provisional UI tier. */
export function priceTierFromAverageSpend(averageSpendPerPerson: number): PriceTier {
  if (averageSpendPerPerson < 15000) return '$'
  if (averageSpendPerPerson < 25000) return '$$'
  if (averageSpendPerPerson <= 40000) return '$$$'
  return '$$$$'
}

/** No selection means no price restriction, including restaurants without a menu. */
export function matchesPriceFilter(
  tier: PriceTier | null,
  hasMenu: boolean,
  selectedTiers: readonly PriceTier[],
): boolean {
  return selectedTiers.length === 0 || (hasMenu && tier !== null && selectedTiers.includes(tier))
}
