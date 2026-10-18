import { useState, type KeyboardEvent } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import { IconStar } from './icons'
import styles from './StarRating.module.css'

const STARS = [1, 2, 3, 4, 5]

type StarRatingProps = {
  value: number
  /** Without it the rating is read-only (for example a restaurant's average). */
  onChange?: (value: number) => void
  label?: string
  size?: number
}

function starsLabel(value: number) {
  return `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })} de 5 estrellas`
}

/** Rating from 1 to 5; selected stars pop in sequence. */
export function StarRating({
  value,
  onChange,
  label = 'Calificación',
  size = 28,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const sizeStyle = cssVars({ '--star-size': `${size}px` })

  if (!onChange) {
    return (
      <span role="img" aria-label={starsLabel(value)} className={styles.rating} style={sizeStyle}>
        {STARS.map((star) => (
          <IconStar key={star} className={star > Math.round(value) ? styles.empty : undefined} />
        ))}
      </span>
    )
  }

  const select = onChange
  const shown = hovered ?? value

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key]
    if (!step) return
    event.preventDefault()
    select(Math.min(5, Math.max(1, value + step)))
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={styles.rating}
      style={sizeStyle}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => setHovered(null)}
    >
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={star === value}
          aria-label={star === 1 ? '1 estrella' : `${star} estrellas`}
          tabIndex={star === (value || 1) ? 0 : -1}
          className={cx(styles.star, star > shown && styles.empty)}
          onMouseEnter={() => setHovered(star)}
          onClick={() => select(star)}
        >
          <IconStar
            key={star <= value ? `${value}-on` : 'off'}
            className={star <= value ? styles.pop : undefined}
            style={cssVars({ '--i': star - 1 })}
          />
        </button>
      ))}
    </div>
  )
}
