import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import type { PinStatus } from './pinStatus'
import styles from './MapPin.module.css'

const GLYPHS: Record<PinStatus, string> = { available: '●', few: '▲', full: '■', unknown: '○' }

/** The colored shape of a pin, also used by the map legend. */
export function PinGlyph({ status, className }: { status: PinStatus; className?: string }) {
  return (
    <span className={cx(styles.icon, styles[status], className)} aria-hidden="true">
      {GLYPHS[status]}
    </span>
  )
}

type MapPinProps = {
  /** Restaurant name, shown on the pin. */
  name: string
  status: PinStatus
  /** What the status means, for screen readers (e.g. "concurrencia media"). */
  statusLabel: string
  selected?: boolean
  /** Position in the list; pins drop in one after another. */
  index?: number
  onClick?: () => void
  /**
   * False inside a Leaflet marker, which is already the focusable button: the pin is then only
   * its look, and the marker carries the name.
   */
  interactive?: boolean
}

/**
 * Restaurant marker for the map: its name and the occupancy shape. Anchor it at its bottom
 * center (the tail). With Leaflet, render it inside a `divIcon`; the animations are plain CSS.
 */
export function MapPin({
  name,
  status,
  statusLabel,
  selected = false,
  index = 0,
  onClick,
  interactive = true,
}: MapPinProps) {
  if (!interactive) {
    return (
      <span
        className={cx(styles.pin, selected && styles.selected)}
        style={cssVars({ '--i': index })}
        aria-hidden="true"
      >
        <PinGlyph status={status} />
        <span className={styles.name}>{name}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={cx(styles.pin, selected && styles.selected)}
      style={cssVars({ '--i': index })}
      aria-label={`${name}: ${statusLabel}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      <PinGlyph status={status} />
      <span className={styles.name} aria-hidden="true">
        {name}
      </span>
    </button>
  )
}
