import { useState } from 'react'

import { cx } from '../../lib/cx'
import styles from './RollingNumber.module.css'

type RollingNumberProps = {
  value: number
  format?: (value: number) => string
  className?: string
}

/** A number that rolls up or down when it changes (quantities, order totals). */
export function RollingNumber({ value, format = String, className }: RollingNumberProps) {
  const [previous, setPrevious] = useState(value)
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)

  if (value !== previous) {
    setPrevious(value)
    setDirection(value > previous ? 'up' : 'down')
  }

  return (
    <span className={cx(styles.root, className)}>
      <span key={value} className={cx(styles.value, direction && styles[direction])}>
        {format(value)}
      </span>
    </span>
  )
}
