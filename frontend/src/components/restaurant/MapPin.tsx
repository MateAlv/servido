import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './MapPin.module.css'

type MapPinProps = {
  /** Restaurant name, shown on the pin. */
  name: string
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
 * Restaurant marker for the map: a bubble with its name. Occupancy is shown only in the card
 * that opens on click. Anchor it at its bottom center (the tail). With Leaflet, render it inside
 * a `divIcon`; the animations are plain CSS.
 */
export function MapPin({
  name,
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
        <span className={styles.name}>{name}</span>
      </span>
    )
  }

  return (
    <button
      type="button"
      className={cx(styles.pin, selected && styles.selected)}
      style={cssVars({ '--i': index })}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span className={styles.name}>{name}</span>
    </button>
  )
}
