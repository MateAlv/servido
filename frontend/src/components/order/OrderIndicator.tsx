import { useState } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './OrderIndicator.module.css'

type OrderIndicatorProps = {
  /** Number of dishes in the order. */
  count: number
  onClick?: () => void
  label?: string
}

/** The order button for the header: the cloche lid pops and the badge bumps when a dish is added. */
export function OrderIndicator({ count, onClick, label = 'Tu pedido' }: OrderIndicatorProps) {
  const [previous, setPrevious] = useState(count)
  const [bumps, setBumps] = useState(0)

  if (count !== previous) {
    setPrevious(count)
    if (count > previous) setBumps(bumps + 1)
  }

  return (
    <button
      type="button"
      className={styles.indicator}
      aria-label={`${label}: ${count} ${count === 1 ? 'plato' : 'platos'}`}
      onClick={onClick}
    >
      <svg className={styles.cloche} viewBox="0 0 32 32" aria-hidden="true">
        {bumps > 0 && (
          <g key={`puff-${bumps}`} className={styles.puff}>
            {[10, 16, 22].map((x, i) => (
              <circle key={x} cx={x} cy="9" r="1.8" style={cssVars({ '--i': i })} />
            ))}
          </g>
        )}
        <g key={`lid-${bumps}`} className={cx(styles.lid, bumps > 0 && styles.lidPop)}>
          <path d="M6 23a10 9.5 0 0 1 20 0Z" />
          <circle cx="16" cy="11.6" r="2" />
        </g>
        <rect x="4" y="24.2" width="24" height="3" rx="1.5" />
      </svg>
      {count > 0 && (
        <span key={`badge-${bumps}`} className={cx(styles.badge, bumps > 0 && styles.bump)}>
          {count}
        </span>
      )}
    </button>
  )
}
