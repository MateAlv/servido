import type { components } from '../api/schema'

/** Glossary: tipo de mesa. A fixed catalog (spec 004, FR-009). */
export type SeatingArea = components['schemas']['FreeGroupResponse']['seating_area']

export const SEATING_AREA_LABELS: Record<SeatingArea, string> = {
  indoor: 'Adentro',
  outdoor: 'Afuera',
  terrace: 'Terraza',
}

export const SEATING_AREA_OPTIONS = (Object.keys(SEATING_AREA_LABELS) as SeatingArea[]).map(
  (value) => ({ value, label: SEATING_AREA_LABELS[value] }),
)

/** «Mesa para 4 · Terraza»: the table group a reservation takes (decision D2 of spec 005). */
export function tableLabel(table: { capacity: number; seating_area: SeatingArea }) {
  return `Mesa para ${table.capacity} · ${SEATING_AREA_LABELS[table.seating_area]}`
}

/** Where the table is, inside a sentence: «Hay mesa disponible en la terraza». */
export const SEATING_AREA_PHRASES: Record<SeatingArea, string> = {
  indoor: 'adentro',
  outdoor: 'afuera',
  terrace: 'en la terraza',
}
