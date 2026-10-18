import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import { IconCheck } from '../ui/icons'
import { RollingNumber } from '../ui/RollingNumber'
import styles from './PrepTimer.module.css'
import { Steam } from './Steam'

type PrepTimerProps = {
  totalMinutes: number
  remainingMinutes: number
  label?: string
  size?: number
}

/** Ring that fills as the kitchen prepares the order; the minutes roll down and it ends in "¡Listo!". */
export function PrepTimer({
  totalMinutes,
  remainingMinutes,
  label = 'Tiempo de preparación',
  size = 148,
}: PrepTimerProps) {
  const remaining = Math.max(0, Math.min(totalMinutes, remainingMinutes))
  const done = remaining === 0
  const progress = totalMinutes > 0 ? (totalMinutes - remaining) / totalMinutes : 1

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={totalMinutes}
      aria-valuenow={totalMinutes - remaining}
      aria-valuetext={done ? 'Listo' : `Faltan ${remaining} minutos`}
      className={cx(styles.timer, done && styles.done)}
      style={cssVars({ '--timer-size': `${size}px` })}
    >
      <svg className={styles.ring} viewBox="0 0 120 120" aria-hidden="true">
        <circle className={styles.track} cx="60" cy="60" r="52" />
        <circle
          className={styles.progress}
          cx="60"
          cy="60"
          r="52"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - progress * 100}
        />
      </svg>
      {done ? (
        <span className={styles.ready} aria-hidden="true">
          <IconCheck />
          ¡Listo!
        </span>
      ) : (
        <span className={styles.center} aria-hidden="true">
          <Steam size={Math.round(size * 0.17)} className={styles.steam} />
          <RollingNumber className={styles.minutes} value={remaining} />
          <span className={styles.unit}>min</span>
        </span>
      )}
    </div>
  )
}
