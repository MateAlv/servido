import { OCCUPANCY_LABELS } from '../../lib/occupancy'
import { PinGlyph } from './MapPin'
import { PIN_STATUS_BY_OCCUPANCY } from './pinStatus'
import type { OccupancyLevel } from './OccupancyMeter'
import styles from './OccupancyLegend.module.css'

const LEVELS: OccupancyLevel[] = ['low', 'medium', 'high']

type OccupancyLegendProps = {
  /** Adds the neutral pin, when the map shows a restaurant without occupancy data. */
  withNoData?: boolean
}

/** Explains the pin shapes: how full each restaurant is right now. */
export function OccupancyLegend({ withNoData = false }: OccupancyLegendProps) {
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
        {withNoData && (
          <li className={styles.item}>
            <PinGlyph status="unknown" />
            Sin datos
          </li>
        )}
      </ul>
    </div>
  )
}
