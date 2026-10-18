import { useEffect, useRef, useState } from 'react'

import { cx } from '../../lib/cx'
import { Button } from '../ui/Button'
import { IconCheck } from '../ui/icons'
import styles from './AddToOrderButton.module.css'

const RESET_MS = 1600

type AddToOrderButtonProps = {
  onAdd: () => void
  label?: string
  addedLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/** Adds a dish to the order: the cutlery clinks, a check pops in and "+1" floats up. */
export function AddToOrderButton({
  onAdd,
  label = 'Agregar al pedido',
  addedLabel = '¡Agregado!',
  disabled = false,
  size = 'md',
}: AddToOrderButtonProps) {
  const [adds, setAdds] = useState(0)
  const [added, setAdded] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function handleClick() {
    onAdd()
    setAdds((current) => current + 1)
    setAdded(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAdded(false), RESET_MS)
  }

  return (
    <span className={styles.wrap}>
      <Button
        size={size}
        disabled={disabled}
        onClick={handleClick}
        className={cx(styles.button, added && styles.added)}
      >
        <span key={adds} className={styles.icon} aria-hidden="true">
          <svg
            className={styles.cutlery}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className={styles.fork} d="M7 3v5a2 2 0 0 0 4 0V3M9 3v18" />
            <path className={styles.knife} d="M17 21V3c-1.8 1.2-3 3.5-3 6.5V13h3" />
          </svg>
          <IconCheck className={styles.check} />
        </span>
        {added ? addedLabel : label}
      </Button>
      {adds > 0 && (
        <span key={adds} className={styles.plusOne} aria-hidden="true">
          +1
        </span>
      )}
      <span className="visually-hidden" aria-live="polite">
        {added ? 'Plato agregado al pedido' : ''}
      </span>
    </span>
  )
}
