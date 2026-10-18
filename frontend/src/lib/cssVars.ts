import type { CSSProperties } from 'react'

/** Typed helper to pass CSS custom properties through the `style` prop. */
export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties
}
