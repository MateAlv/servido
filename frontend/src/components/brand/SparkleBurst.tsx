import type { ReactNode } from 'react'

import { cssVars } from '../../lib/cssVars'
import { IconSparkle } from '../ui/icons'
import styles from './SparkleBurst.module.css'

type SparkleBurstProps = {
  /** Increment to play a burst. 0 plays nothing. */
  trigger: number
  children: ReactNode
  count?: number
  /** How far the sparkles fly, in pixels. */
  distance?: number
  /** Milliseconds to wait before the burst, to sync it with another animation. */
  delay?: number
}

/** Celebration burst of brand sparkles around its child (confirmations, payments). */
export function SparkleBurst({
  trigger,
  children,
  count = 10,
  distance = 46,
  delay = 0,
}: SparkleBurstProps) {
  return (
    <span className={styles.root}>
      {children}
      {trigger > 0 && (
        <span
          key={trigger}
          className={styles.burst}
          style={cssVars({ '--burst-delay': `${delay}ms` })}
          aria-hidden="true"
        >
          {Array.from({ length: count }, (_, i) => (
            <IconSparkle
              key={i}
              className={styles.sparkle}
              style={cssVars({
                '--i': i,
                '--angle': `${(360 / count) * i + (i % 2 ? 9 : -7)}deg`,
                '--distance': `${distance * (i % 3 === 0 ? 1.15 : i % 3 === 1 ? 0.85 : 1)}px`,
                '--sparkle-size': `${i % 2 ? 12 : 16}px`,
              })}
            />
          ))}
        </span>
      )}
    </span>
  )
}
