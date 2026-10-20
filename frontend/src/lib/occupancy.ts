import type { OccupancyLevel } from '../components/restaurant'

/** Visible names for the three occupancy levels (spec 002, FR-002). */
export const OCCUPANCY_LABELS: Record<OccupancyLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

/**
 * How often the map asks for fresh occupancy while it stays open (US-5, S5).
 * Provisional: the PO has not fixed the frequency yet (spec 002, edge cases).
 */
export const OCCUPANCY_REFRESH_MS = 30_000
