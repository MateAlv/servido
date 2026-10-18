import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import styles from './LiveIndicator.module.css'

type LiveIndicatorProps = {
  children?: ReactNode
  tone?: 'ok' | 'primary'
  className?: string
}

/** Pulsing "live" pill: an order being prepared, availability that updates on its own. */
export function LiveIndicator({
  children = 'En vivo',
  tone = 'ok',
  className,
}: LiveIndicatorProps) {
  return (
    <span className={cx(styles.live, styles[tone], className)}>
      <span className={styles.dot} aria-hidden="true" />
      {children}
    </span>
  )
}
