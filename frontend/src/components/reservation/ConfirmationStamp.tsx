import { cx } from '../../lib/cx'
import { SparkleBurst } from '../brand/SparkleBurst'
import styles from './ConfirmationStamp.module.css'

type ConfirmationStampProps = {
  label?: string
  detail?: string
  tone?: 'ok' | 'primary' | 'warn'
  /** `clock` for something still waiting, such as a payment in review. */
  icon?: 'check' | 'clock'
  /** Change it to stamp again. */
  replayKey?: number
}

/** A stamp hits the page: a confirmed reservation, an approved payment or one in review. */
export function ConfirmationStamp({
  label = '¡Reservado!',
  detail,
  tone = 'ok',
  icon = 'check',
  replayKey = 0,
}: ConfirmationStampProps) {
  return (
    // Nothing to celebrate while something still waits.
    <SparkleBurst
      trigger={tone === 'warn' ? 0 : replayKey + 1}
      delay={280}
      distance={110}
      count={14}
    >
      <div
        key={replayKey}
        role="status"
        className={cx(styles.stamp, tone !== 'ok' && styles[tone])}
      >
        <span className={styles.ring} aria-hidden="true" />
        <svg className={styles.check} viewBox="0 0 34 34" aria-hidden="true">
          <circle pathLength={1} cx="17" cy="17" r="14.5" />
          {icon === 'clock' ? (
            <path pathLength={1} d="M17 9.5V17l5 3" />
          ) : (
            <path pathLength={1} d="m10.5 17.5 4.5 4.5 9-9.5" />
          )}
        </svg>
        <span className={styles.label}>{label}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </div>
    </SparkleBurst>
  )
}
