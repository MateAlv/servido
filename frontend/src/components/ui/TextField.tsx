import { useId, type ComponentProps } from 'react'

import { cx } from '../../lib/cx'
import styles from './TextField.module.css'

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string
  hint?: string
  /** Error message in Spanish. The message shakes in each time it changes. */
  error?: string
  id?: string
}

export function TextField({ label, hint, error, id, className, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx(styles.field, error && styles.invalid, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p key={error} id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
