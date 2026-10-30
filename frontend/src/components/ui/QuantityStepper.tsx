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
}

export function QuantityStepper({
  value,
  onChange,
  label,
  min = 0,
  max = 20,
  decreaseLabel = 'Quitar uno',
}: QuantityStepperProps) {
  return (
    <div role="group" aria-label={label} className={styles.stepper}>
      <IconButton
        label={decreaseLabel}
        variant="ghost"
        className={styles.button}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <IconMinus />
      </IconButton>
      <output className={styles.count} aria-live="polite">
        <RollingNumber value={value} />
      </output>
      <IconButton
        label="Agregar uno"
        variant="ghost"
        className={styles.button}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <IconPlus />
      </IconButton>
    </div>
  )
}
