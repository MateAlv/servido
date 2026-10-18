import { cx } from '../../lib/cx'
import { SparkleBurst } from '../brand/SparkleBurst'
import styles from './ConfirmationStamp.module.css'

type ConfirmationStampProps = {
  label?: string
  detail?: string
  tone?: 'ok' | 'primary'
  /** Change it to stamp again. */
  replayKey?: number
}

/** Celebration for a confirmed reservation or an approved payment: a stamp hits the page. */
export function ConfirmationStamp({
  label = '¡Reservado!',
  detail,
  tone = 'ok',
  replayKey = 0,
}: ConfirmationStampProps) {
  return (
    <SparkleBurst trigger={replayKey + 1} delay={280} distance={110} count={14}>
      <div
        key={replayKey}
        role="status"
        className={cx(styles.stamp, tone === 'primary' && styles.primary)}
      >
        <span className={styles.ring} aria-hidden="true" />
        <svg className={styles.check} viewBox="0 0 34 34" aria-hidden="true">
          <circle pathLength={1} cx="17" cy="17" r="14.5" />
          <path pathLength={1} d="m10.5 17.5 4.5 4.5 9-9.5" />
        </svg>
        <span className={styles.label}>{label}</span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </div>
    </SparkleBurst>
  )
}
