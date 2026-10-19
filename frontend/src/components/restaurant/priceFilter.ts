/** UI categories, independent of the pending restaurant API representation. */
export const PRICE_TIERS = ['$', '$$', '$$$', '$$$$'] as const
export type PriceTier = (typeof PRICE_TIERS)[number]

/** No selection means no price restriction, including restaurants without a menu. */
export function matchesPriceFilter(
  tier: PriceTier | null,
  hasMenu: boolean,
  selectedTiers: readonly PriceTier[],
): boolean {
  return selectedTiers.length === 0 || (hasMenu && tier !== null && selectedTiers.includes(tier))
}
