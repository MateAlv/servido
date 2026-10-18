import type { ComponentProps, ReactNode } from 'react'

import { cx } from '../../lib/cx'
import styles from './IconButton.module.css'

type IconButtonProps = Omit<ComponentProps<'button'>, 'children' | 'aria-label'> & {
  /** Required: icon-only buttons need a text alternative. */
  label: string
  children: ReactNode
  variant?: 'surface' | 'ghost'
}

export function IconButton({
  label,
  children,
  variant = 'surface',
  type = 'button',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(styles.iconButton, variant === 'ghost' && styles.ghost, className)}
      {...props}
    >
      {children}
    </button>
  )
}
