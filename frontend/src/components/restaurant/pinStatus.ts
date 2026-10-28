import type { OccupancyLevel } from './OccupancyMeter'

export type PinStatus = 'available' | 'few' | 'full'

/** The pin color and shape for each occupancy level (bajo / medio / alto). */
export const PIN_STATUS_BY_OCCUPANCY: Record<OccupancyLevel, PinStatus> = {
  low: 'available',
  medium: 'few',
  high: 'full',
}
