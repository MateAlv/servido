import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'

import { cx } from '../../lib/cx'
import styles from './Button.module.css'
import { Spinner } from './Spinner'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  /** Shows a spinner and disables the button while an action runs. */
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
  /** Renders a router link with the button look, for actions that navigate. */
  to?: string
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  type = 'button',
  disabled,
  className,
  children,
  to,
  ...props
}: ButtonProps) {
  const classes = cx(
    styles.button,
    styles[variant],
    size !== 'md' && styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className,
  )
  const content = loading ? <Spinner /> : icon && <span className={styles.icon}>{icon}</span>

  if (to !== undefined) {
    return (
      <Link to={to} className={classes}>
        {content}
        {children}
      </Link>
    )
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
      {children}
    </button>
  )
}
