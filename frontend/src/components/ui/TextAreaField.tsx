import { useId, type ComponentProps } from 'react'

import { cx } from '../../lib/cx'
import styles from './TextField.module.css'

type TextAreaFieldProps = Omit<ComponentProps<'textarea'>, 'id'> & {
  label: string
  hint?: string
  /** Error message in Spanish. The message shakes in each time it changes. */
  error?: string
}

/** `TextField` for longer text. */
export function TextAreaField({ label, hint, error, className, ...props }: TextAreaFieldProps) {
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cx(styles.field, error && styles.invalid, className)}>
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.control}>
        <textarea
          id={inputId}
          className={cx(styles.input, styles.textarea)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...props}
        />
      </div>
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
