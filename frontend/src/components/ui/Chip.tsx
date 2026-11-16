import type { ComponentProps } from 'react'

import { cx } from '../../lib/cx'
import styles from './Chip.module.css'

type ChipProps = Omit<ComponentProps<'button'>, 'aria-pressed' | 'aria-checked'> & {
  selected: boolean
}

/**
 * Toggle chip for filters (price, dietary restrictions, cuisine). With `role="radio"` it is
 * one option of a single-choice group (see `ChoiceChips`) and says `aria-checked` instead.
 */
export function Chip({ selected, type = 'button', role, className, ...props }: ChipProps) {
  const state = role === 'radio' ? { 'aria-checked': selected } : { 'aria-pressed': selected }
  return (
    <button type={type} role={role} {...state} className={cx(styles.chip, className)} {...props} />
  )
}
