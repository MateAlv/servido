import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './Steam.module.css'

const WISPS = [7, 12, 17]

type SteamProps = {
  size?: number
  className?: string
}

/** Rising steam: something is being cooked. Decorative. */
export function Steam({ size = 28, className }: SteamProps) {
  return (
    <svg
      className={cx(styles.steam, className)}
      style={cssVars({ '--steam-size': `${size}px` })}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      {WISPS.map((x, i) => (
        <path
          key={x}
          className={styles.wisp}
          style={cssVars({ '--i': i })}
          d={`M${x} 21c-2.6-2.5 2.6-4.5 0-7.5s2.6-4.5 0-7`}
        />
      ))}
    </svg>
  )
}
