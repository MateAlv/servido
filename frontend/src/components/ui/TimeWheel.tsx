import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

import { prefersReducedMotion } from '../../lib/motion'
import styles from './TimeWheel.module.css'

/** Matches `--row` in TimeWheel.module.css. */
const ROW_HEIGHT = 44
/** How long the wheel has to stay still before the hour under the band is chosen. */
const SETTLE_MS = 140

type TimeWheelProps = {
  /** Accessible name of the wheel, e.g. «Llegar desde». */
  label: string
  /** Every hour the wheel shows, in order («00:00», «00:30»…). */
  hours: readonly string[]
  value: string
  /** The hours that can be chosen; the others show crossed out and the wheel skips them. */
  selectable: readonly string[]
  onChange: (hour: string) => void
  /** Called when the chosen hour is tapped again or Enter is pressed on it. */
  onPick?: () => void
}

/**
 * A wheel of hours like a phone alarm: it scrolls and settles on the hour under the band.
 * Tapping an hour chooses it; with the keyboard it is one Tab stop and the arrows move it.
 */
export function TimeWheel({ label, hours, value, selectable, onChange, onPick }: TimeWheelProps) {
  const list = useRef<HTMLDivElement>(null)
  const settle = useRef<number | undefined>(undefined)
  const focusNext = useRef(false)
  const valueIndex = Math.max(0, hours.indexOf(value))
  // The hour under the band while the wheel moves; it becomes the value when it settles.
  const [moving, setMoving] = useState<number | null>(null)
  const centered = moving ?? valueIndex

  useLayoutEffect(() => {
    const element = list.current
    if (element && Math.round(element.scrollTop / ROW_HEIGHT) !== valueIndex) {
      element.scrollTop = valueIndex * ROW_HEIGHT
    }
    if (focusNext.current) {
      focusNext.current = false
      element?.querySelector<HTMLButtonElement>(`[data-hour="${hours[valueIndex]}"]`)?.focus({
        preventScroll: true,
      })
    }
  }, [valueIndex, hours])

  useEffect(() => () => window.clearTimeout(settle.current), [])

  function nearestSelectable(index: number): string | undefined {
    const hour = hours[index]
    if (selectable.includes(hour)) return hour
    return selectable.find((candidate) => candidate > hour) ?? selectable.at(-1)
  }

  function scrollTo(index: number) {
    const element = list.current
    if (!element) return
    const top = index * ROW_HEIGHT
    if (typeof element.scrollTo === 'function') {
      element.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    } else {
      element.scrollTop = top
    }
  }

  function handleScroll() {
    const element = list.current
    if (!element) return
    const index = Math.min(
      hours.length - 1,
      Math.max(0, Math.round(element.scrollTop / ROW_HEIGHT)),
    )
    setMoving(index)
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      setMoving(null)
      const hour = nearestSelectable(index)
      if (hour === undefined) return
      if (hour !== value) onChange(hour)
      if (hour !== hours[index]) scrollTo(hours.indexOf(hour))
    }, SETTLE_MS)
  }

  function choose(hour: string) {
    if (hour === value) {
      onPick?.()
      return
    }
    onChange(hour)
    scrollTo(hours.indexOf(hour))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const position = selectable.indexOf(value)
    const next = {
      ArrowDown: selectable[position + 1],
      ArrowUp: selectable[position - 1],
      Home: selectable[0],
      End: selectable.at(-1),
    }[event.key]
    if (!(event.key in { ArrowDown: 1, ArrowUp: 1, Home: 1, End: 1 })) return
    event.preventDefault()
    if (next === undefined || next === value) return
    focusNext.current = true
    onChange(next)
  }

  return (
    <div className={styles.wheel}>
      <span className={styles.band} aria-hidden="true" />
      <div
        ref={list}
        role="group"
        aria-label={label}
        className={styles.list}
        onScroll={handleScroll}
      >
        {hours.map((hour, index) => {
          const disabled = !selectable.includes(hour)
          const chosen = hour === value
          return (
            <button
              key={hour}
              type="button"
              data-hour={hour}
              data-distance={Math.min(3, Math.abs(index - centered))}
              className={styles.hour}
              disabled={disabled}
              aria-pressed={chosen}
              tabIndex={chosen ? 0 : -1}
              onClick={() => choose(hour)}
              onKeyDown={handleKeyDown}
            >
              {hour}
            </button>
          )
        })}
      </div>
    </div>
  )
}
