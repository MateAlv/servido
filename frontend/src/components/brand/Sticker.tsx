import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './Sticker.module.css'

type StickerProps = {
  children: ReactNode
  tone?: 'ok' | 'primary'
  /** Rotation in degrees. */
  tilt?: number
  /** Slaps onto the page when it appears. */
  animated?: boolean
  delay?: number
  className?: string
}

/** Playful tilted label, like "Sin espera" on the reservation ticket. */
export function Sticker({
  children,
  tone = 'ok',
  tilt = -8,
  animated = true,
  delay = 0,
  className,
}: StickerProps) {
  return (
    <span
      className={cx(styles.sticker, styles[tone], animated && styles.slap, className)}
      style={cssVars({ '--tilt': `${tilt}deg`, '--sticker-delay': `${delay}ms` })}
      data-entrance={animated ? '' : undefined}
    >
      {children}
    </span>
  )
}
