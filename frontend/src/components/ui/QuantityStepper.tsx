import { useId } from 'react'

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
  /** Said by the disabled "+" at the maximum, e.g. "Máximo 20 por plato". */
  maxHint?: string
  /** False when the page already announces the change in its own live region. */
  announce?: boolean
  disabled?: boolean
}

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 20,
  decreaseLabel = 'Quitar uno',
  maxHint,
  announce = true,
  disabled = false,
}: QuantityStepperProps) {
  const hintId = useId()
  const atMax = value >= max
  return (
    <div role="group" aria-label={label} className={styles.stepper}>
      <IconButton
        label={decreaseLabel}
        variant="ghost"
        className={styles.button}
        disabled={disabled || value <= min}
        onClick={() => onChange(value - 1)}
      >
        <IconMinus />
      </IconButton>
      <output className={styles.count} aria-live={announce ? 'polite' : 'off'}>
        <RollingNumber value={value} />
      </output>
      <IconButton
        label="Agregar uno"
        variant="ghost"
        className={styles.button}
        disabled={disabled || atMax}
        aria-describedby={atMax && maxHint ? hintId : undefined}
        onClick={() => onChange(value + 1)}
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
