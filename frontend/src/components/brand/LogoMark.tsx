import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import base from './LogoMark.module.css'

type Part =
  | 'root'
  | 'shadow'
  | 'body'
  | 'face'
  | 'plate'
  | 'lid'
  | 'rays'
  | 'ray'
  | 'orbitTrack'
  | 'orbitComet'

export type LogoMarkClasses = Partial<Record<Part, string>>

/** Rays radiate from the pin's head (center 32,32) at -62°, -38° and -14°. */
const RAYS = [
  [45.2, 7.3, 48.2, 1.5],
  [54.1, 14.8, 59.2, 10.8],
  [59.2, 25.2, 65.5, 23.7],
] as const

type LogoMarkProps = {
  /** Extra classes per part, so each consumer animates the parts its own way. */
  classes?: LogoMarkClasses
  /** Draws a dashed orbit around the pin's head (used by the spinner). */
  orbit?: boolean
}

/** The Servido! pin: an orange location pin holding a cloche, with three rays. */
export function LogoMark({ classes = {}, orbit = false }: LogoMarkProps) {
  return (
    <svg
      className={cx(base.svg, classes.root)}
      viewBox="0 -2 70 82"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse className={cx(base.shadow, classes.shadow)} cx="32" cy="76" rx="10" ry="2.6" />
      {orbit && (
        <>
          <circle className={cx(base.orbitTrack, classes.orbitTrack)} cx="32" cy="32" r="29.5" />
          <circle
            className={cx(base.orbitComet, classes.orbitComet)}
            cx="32"
            cy="32"
            r="29.5"
            pathLength={100}
            strokeDasharray="16 84"
          />
        </>
      )}
      <g className={cx(base.body, classes.body)}>
        <path
          className={base.pin}
          d="M32 74C19.5 60 8 48 8 32a24 24 0 0 1 48 0c0 16-11.5 28-24 42Z"
        />
        <circle className={cx(base.face, classes.face)} cx="32" cy="32" r="15.5" />
        <rect
          className={cx(base.plate, classes.plate)}
          x="20.5"
          y="38.2"
          width="23"
          height="3.4"
          rx="1.7"
        />
        <g className={cx(base.lid, classes.lid)}>
          <path className={base.dome} d="M22.5 37.2a9.5 9 0 0 1 19 0Z" />
          <circle className={base.knob} cx="32" cy="26.6" r="2" />
          <path className={base.highlight} d="M26 34.2a6 5.5 0 0 1 3.6-4.2" />
        </g>
      </g>
      <g className={classes.rays}>
        {RAYS.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            className={cx(base.ray, classes.ray)}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            style={cssVars({ '--i': i })}
          />
        ))}
      </g>
    </svg>
  )
}
