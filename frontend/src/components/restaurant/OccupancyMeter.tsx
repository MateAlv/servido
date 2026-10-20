import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import { OCCUPANCY_LABELS } from '../../lib/occupancy'
import styles from './OccupancyMeter.module.css'

export type OccupancyLevel = 'low' | 'medium' | 'high'

const FILLED: Record<OccupancyLevel, number> = { low: 1, medium: 2, high: 3 }

type OccupancyMeterProps = {
  level: OccupancyLevel
  showLabel?: boolean
}

/** How crowded a restaurant is right now (bajo / medio / alto), as signal-style bars. */
export function OccupancyMeter({ level, showLabel = true }: OccupancyMeterProps) {
  return (
    <span
      role="img"
      aria-label={`Concurrencia ${OCCUPANCY_LABELS[level].toLowerCase()}`}
      className={cx(styles.meter, styles[level])}
    >
      <span key={level} className={styles.bars} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cx(styles.bar, i < FILLED[level] && styles.on)}
            style={cssVars({ '--i': i })}
          />
        ))}
      </span>
      {showLabel && <span aria-hidden="true">{OCCUPANCY_LABELS[level]}</span>}
    </span>
  )
}
