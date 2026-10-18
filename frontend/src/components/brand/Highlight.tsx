import type { ReactNode } from 'react'

import { cssVars } from '../../lib/cssVars'
import styles from './Highlight.module.css'

type HighlightProps = {
  children: ReactNode
  /** Delay before the marker stroke draws itself, in milliseconds. */
  delay?: number
}

/** Brand text highlight: primary color with a hand-drawn marker stroke that draws in. */
export function Highlight({ children, delay = 450 }: HighlightProps) {
  return (
    <span
      className={styles.highlight}
      style={cssVars({ '--highlight-delay': `${delay}ms` })}
      data-entrance=""
    >
      {children}
      <svg
        className={styles.stroke}
        viewBox="0 0 200 14"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path pathLength={1} d="M2 9C40 2 80 12 120 6S180 4 198 8" />
      </svg>
    </span>
  )
}
