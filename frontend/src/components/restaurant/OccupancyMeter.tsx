import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import { OCCUPANCY_LABELS } from '../../lib/occupancy'
import styles from './OccupancyMeter.module.css'

export type OccupancyLevel = 'low' | 'medium' | 'high'

const FILLED: Record<OccupancyLevel, number> = { low: 1, medium: 2, high: 3 }

type OccupancyMeterProps = {
  /** `null` when the restaurant has no occupancy data yet (real restaurants, decision D4). */
  level: OccupancyLevel | null
  showLabel?: boolean
}

const NO_DATA = 'Sin datos'

/** How crowded a restaurant is right now (bajo / medio / alto), as signal-style bars. */
export function OccupancyMeter({ level, showLabel = true }: OccupancyMeterProps) {
  const label = level ? OCCUPANCY_LABELS[level] : NO_DATA
  return (
    <span
      role="img"
      aria-label={`Concurrencia ${label.toLowerCase()}`}
      className={cx(styles.meter, level && styles[level])}
    >
      <span key={level ?? 'none'} className={styles.bars} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cx(styles.bar, level && i < FILLED[level] && styles.on)}
            style={cssVars({ '--i': i })}
          />
        ))}
      </span>
      {showLabel && <span aria-hidden="true">{label}</span>}
    </span>
  )
}
