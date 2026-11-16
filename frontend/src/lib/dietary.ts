/** The dietary restrictions a dish can carry, as the API stores them and as the diner reads them. */
export const DIETARY_RESTRICTIONS = [
  { code: 'sin_tacc', label: 'Sin TACC' },
  { code: 'vegetariano', label: 'Vegetariano' },
  { code: 'vegano', label: 'Vegano' },
] as const

export type DietaryRestriction = (typeof DIETARY_RESTRICTIONS)[number]['code']

/** «Sin TACC» for `sin_tacc`; an unknown code is shown as it came. */
export function restrictionLabel(code: string): string {
  return DIETARY_RESTRICTIONS.find((restriction) => restriction.code === code)?.label ?? code
}

/** `sin_tacc` for «Sin TACC»; `undefined` for a label outside the catalog («Sin lactosa»). */
export function restrictionCode(label: string): DietaryRestriction | undefined {
  return DIETARY_RESTRICTIONS.find((restriction) => restriction.label === label)?.code
}
