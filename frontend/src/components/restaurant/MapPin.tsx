import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './MapPin.module.css'

export type PinStatus = 'available' | 'few' | 'full'

const GLYPHS: Record<PinStatus, string> = { available: '●', few: '▲', full: '■' }

type MapPinProps = {
  /** Restaurant name, for the accessible label. */
  name: string
  /** Visible text, e.g. "6 mesas" or "Completo". */
  label: string
  status: PinStatus
  selected?: boolean
  /** Position in the list; pins drop in one after another. */
  index?: number
  onClick?: () => void
}

/**
 * Restaurant marker for the map. Anchor it at its bottom center (the tail).
 * With Leaflet, render it inside a `divIcon`; the animations are plain CSS.
 */
export function MapPin({ name, label, status, selected = false, index = 0, onClick }: MapPinProps) {
  return (
    <button
      type="button"
      className={cx(styles.pin, selected && styles.selected)}
      style={cssVars({ '--i': index })}
      aria-label={`${name}: ${label}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className={cx(styles.icon, styles[status])} aria-hidden="true">
        {GLYPHS[status]}
      </span>
      <span aria-hidden="true">{label}</span>
    </button>
  )
}
