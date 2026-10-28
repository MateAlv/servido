import { OCCUPANCY_LABELS } from '../../lib/occupancy'
import { PinGlyph } from './MapPin'
import { PIN_STATUS_BY_OCCUPANCY } from './pinStatus'
import type { OccupancyLevel } from './OccupancyMeter'
import styles from './OccupancyLegend.module.css'

const LEVELS: OccupancyLevel[] = ['low', 'medium', 'high']

/** Explains the pin shapes: how full each restaurant is right now. */
export function OccupancyLegend() {
  return (
    <div className={styles.legend}>
      <span className={styles.title}>Concurrencia ahora</span>
      <ul className={styles.items}>
        {LEVELS.map((level) => (
          <li key={level} className={styles.item}>
            <PinGlyph status={PIN_STATUS_BY_OCCUPANCY[level]} />
            {OCCUPANCY_LABELS[level]}
          </li>
        ))}
      </ul>
    </div>
  )
}
