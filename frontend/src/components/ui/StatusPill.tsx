import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import styles from './StatusPill.module.css'

export type StatusTone = 'ok' | 'warn' | 'error' | 'neutral'

/** Each tone also has a shape, so the status never depends on color alone. */
const GLYPHS: Record<StatusTone, string | null> = {
  ok: '●',
  warn: '▲',
  error: '■',
  neutral: null,
}

type StatusPillProps = {
  tone: StatusTone
  children: ReactNode
  className?: string
}

/** Short status: availability ("Hay mesa"), payment ("Pagado"), reservation state. */
export function StatusPill({ tone, children, className }: StatusPillProps) {
  const glyph = GLYPHS[tone]
  return (
    <span className={cx(styles.pill, styles[tone], className)}>
      {glyph && (
        <span className={styles.glyph} aria-hidden="true">
          {glyph}
        </span>
      )}
      {children}
    </span>
  )
}
