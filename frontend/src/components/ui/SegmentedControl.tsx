import { useRef, type KeyboardEvent } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './SegmentedControl.module.css'

export type SegmentedOption<T extends string> = { value: T; label: string }

type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group, e.g. "Tipo de cuenta". */
  label: string
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Single choice between a few options, with a thumb that slides to the selection. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    const next = (index + step + options.length) % options.length
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx(styles.group, className)}
      style={cssVars({ '--count': options.length, '--index': index })}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {options.map((option, i) => (
        <button
          key={option.value}
          ref={(element) => {
            buttons.current[i] = element
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          className={styles.option}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
