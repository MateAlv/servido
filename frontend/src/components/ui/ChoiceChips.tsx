import { useRef, type KeyboardEvent, type ReactNode } from 'react'

import { cx } from '../../lib/cx'
import { Chip } from './Chip'
import styles from './ChoiceChips.module.css'

export type ChoiceChipOption<T extends string> = {
  value: T
  label: ReactNode
  /** Accessible name when the label has symbols, e.g. «4 o más estrellas» for «4 o más ★». */
  ariaLabel?: string
}

type ChoiceChipsProps<T extends string> = {
  /** Accessible name of the group, e.g. "Calificación mínima". */
  label: string
  options: ChoiceChipOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Single choice shown as chips that wrap, for options too long for a `SegmentedControl`.
 * A radio group: one Tab stop, and the arrow keys move and choose.
 */
export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: ChoiceChipsProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    // From the focused chip, not the chosen value: two quick presses may arrive before the
    // new value comes back, and each one must still move one option.
    const focused = buttons.current.findIndex((button) => button === document.activeElement)
    const from = focused >= 0 ? focused : index
    const next = (from + step + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(styles.group, className)}
      onKeyDown={handleKeyDown}
    >
      {options.map((option, i) => (
        <Chip
          key={option.value}
          ref={(element: HTMLButtonElement | null) => {
            buttons.current[i] = element
          }}
          role="radio"
          selected={i === index}
          tabIndex={i === index ? 0 : -1}
          aria-label={option.ariaLabel}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  )
}
