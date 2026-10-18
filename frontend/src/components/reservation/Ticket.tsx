import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './Ticket.module.css'

type TicketProps = {
  children: ReactNode
  /** Rotation in degrees, for a playful layout. */
  tilt?: number
  /** Element pinned to the top-right corner, usually a <Sticker>. */
  sticker?: ReactNode
  animated?: boolean
  delay?: number
  className?: string
}

/** Reservation ticket: the brand's way of showing a booking (place, time, order). */
export function Ticket({
  children,
  tilt = 0,
  sticker,
  animated = true,
  delay = 0,
  className,
}: TicketProps) {
  return (
    <div
      className={cx(styles.ticket, animated && styles.printed, className)}
      style={cssVars({ '--tilt': `${tilt}deg`, '--ticket-delay': `${delay}ms` })}
      data-entrance={animated ? '' : undefined}
    >
      {sticker && <span className={styles.sticker}>{sticker}</span>}
      {children}
    </div>
  )
}

/**
 * Dotted tear line with notches. On a background other than the page's, set
 * `--ticket-notch-color` on a parent so the notches match it.
 */
export function TicketDivider() {
  return <div role="separator" className={styles.divider} />
}
