import type { OccupancyLevel } from './OccupancyMeter'

export type PinStatus = 'available' | 'few' | 'full' | 'unknown'

/** The pin color and shape for each occupancy level (bajo / medio / alto). */
export const PIN_STATUS_BY_OCCUPANCY: Record<OccupancyLevel, PinStatus> = {
  low: 'available',
  medium: 'few',
  high: 'full',
}

/** A restaurant without occupancy data gets a neutral pin. */
export function pinStatusFor(level: OccupancyLevel | null): PinStatus {
  return level ? PIN_STATUS_BY_OCCUPANCY[level] : 'unknown'
}
