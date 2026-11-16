import { useId, useRef } from 'react'

import { cx } from '../../lib/cx'
import { IconButton } from './IconButton'
import { IconMinus, IconPlus } from './icons'
import styles from './QuantityStepper.module.css'
import { RollingNumber } from './RollingNumber'

type QuantityStepperProps = {
  value: number
  onChange: (value: number) => void
  /** Accessible name, e.g. "Cantidad de Bife de chorizo". */
  label: string
  min?: number
  max?: number
  /** Accessible name of the "−" button, e.g. "Sacar Provoleta del pedido" when it removes. */
  decreaseLabel?: string
  /** Accessible name of the "+" button, e.g. "Una persona más". */
  increaseLabel?: string
  /** Said by the disabled "+" at the maximum, e.g. "Máximo 20 por plato". */
  maxHint?: string
  /** False when the page already announces the change in its own live region. */
  announce?: boolean
  disabled?: boolean
  /** `lg` makes both buttons 44 px, the touch target of a form that is not a list. */
  size?: 'md' | 'lg'
}

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 20,
  decreaseLabel = 'Quitar uno',
  increaseLabel = 'Agregar uno',
  maxHint,
  announce = true,
  disabled = false,
  size = 'md',
}: QuantityStepperProps) {
  const hintId = useId()
  const atMax = value >= max
  const decrease = useRef<HTMLButtonElement>(null)
  const increase = useRef<HTMLButtonElement>(null)

  // A button that reaches the limit gets disabled: the focus moves to the other one.
  function step(by: 1 | -1) {
    const next = value + by
    onChange(next)
    if (by === 1 && next >= max) decrease.current?.focus()
    if (by === -1 && next <= min) increase.current?.focus()
  }
  return (
    <div
      role="group"
      aria-label={label}
      className={cx(styles.stepper, size === 'lg' && styles.large)}
    >
      <IconButton
        ref={decrease}
        label={decreaseLabel}
        variant="ghost"
        className={styles.button}
        disabled={disabled || value <= min}
        onClick={() => step(-1)}
      >
        <IconMinus />
      </IconButton>
      <output className={styles.count} aria-live={announce ? 'polite' : 'off'}>
        <RollingNumber value={value} />
      </output>
      <IconButton
        ref={increase}
        label={increaseLabel}
        variant="ghost"
        className={styles.button}
        disabled={disabled || atMax}
        aria-describedby={atMax && maxHint ? hintId : undefined}
        onClick={() => step(1)}
      >
        <IconPlus />
      </IconButton>
      {atMax && maxHint && (
        <span id={hintId} className="visually-hidden">
          {maxHint}
        </span>
      )}
    </div>
  )
}
