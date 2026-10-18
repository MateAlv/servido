import type { ComponentProps } from 'react'

import { cx } from '../../lib/cx'
import styles from './Chip.module.css'

type ChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  selected: boolean
}

/** Toggle chip for filters (price, dietary restrictions, cuisine). */
export function Chip({ selected, type = 'button', className, ...props }: ChipProps) {
  return (
    <button type={type} aria-pressed={selected} className={cx(styles.chip, className)} {...props} />
  )
}
