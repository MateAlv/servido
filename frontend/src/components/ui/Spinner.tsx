import { cx } from '../../lib/cx'
import styles from './Spinner.module.css'

type SpinnerProps = {
  /** Accessible label. Omit it when the spinner sits inside an element that already says it is busy. */
  label?: string
  className?: string
}

/** Small inline spinner that takes the current text color and font size. */
export function Spinner({ label, className }: SpinnerProps) {
  return (
    <svg
      className={cx(styles.spinner, className)}
      viewBox="0 0 24 24"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle className={styles.track} cx="12" cy="12" r="9" />
      <circle
        className={styles.arc}
        cx="12"
        cy="12"
        r="9"
        pathLength={100}
        strokeDasharray="28 72"
      />
    </svg>
  )
}
