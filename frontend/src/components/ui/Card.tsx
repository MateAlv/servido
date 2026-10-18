import type { ComponentProps } from 'react'

import { cx } from '../../lib/cx'
import styles from './Card.module.css'

type CardProps = ComponentProps<'div'> & {
  /** Lifts on hover; use when the whole card opens something. */
  interactive?: boolean
  selected?: boolean
  padding?: 'normal' | 'compact'
}

export function Card({
  interactive = false,
  selected = false,
  padding = 'normal',
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cx(
        styles.card,
        padding === 'compact' && styles.compact,
        interactive && styles.interactive,
        selected && styles.selected,
        className,
      )}
      {...props}
    />
  )
}
