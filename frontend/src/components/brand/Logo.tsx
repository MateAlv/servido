import type { AnimationEvent } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './Logo.module.css'
import { LogoMark } from './LogoMark'

const LETTERS = [...'Servido']

export type LogoAnimation = 'none' | 'intro' | 'outro' | 'idle'

type LogoProps = {
  /** `full` shows the pin and the "Servido!" wordmark; `mark` only the pin. */
  variant?: 'full' | 'mark'
  layout?: 'inline' | 'stacked'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Shows "Reservá. Pedí. Disfrutá." under the wordmark. */
  tagline?: boolean
  /**
   * `intro` makes the logo appear, `outro` makes it disappear (it stays hidden),
   * `idle` keeps it subtly alive. Change the component's `key` to replay.
   */
  animation?: LogoAnimation
  /** Called when an `intro` or `outro` sequence finishes. */
  onAnimationEnd?: (animation: LogoAnimation) => void
  className?: string
}

export function Logo({
  variant = 'full',
  layout = 'inline',
  size = 'md',
  tagline = false,
  animation = 'none',
  onAnimationEnd,
  className,
}: LogoProps) {
  function handleAnimationEnd(event: AnimationEvent<HTMLSpanElement>) {
    if (event.target === event.currentTarget) onAnimationEnd?.(animation)
  }

  return (
    <span
      role="img"
      aria-label="Servido!"
      className={cx(
        styles.logo,
        styles[size],
        layout === 'stacked' && styles.stacked,
        animation !== 'none' && styles[animation],
        className,
      )}
      data-entrance={animation === 'intro' ? '' : undefined}
      onAnimationEnd={handleAnimationEnd}
    >
      <LogoMark
        classes={{
          root: styles.mark,
          shadow: styles.shadow,
          body: styles.body,
          face: styles.face,
          plate: styles.plate,
          lid: styles.lid,
          ray: styles.ray,
        }}
      />
      {variant === 'full' && (
        <span className={styles.text}>
          <span className={styles.wordmark}>
            {LETTERS.map((letter, i) => (
              <span key={i} className={styles.letter} style={cssVars({ '--i': i })}>
                {letter}
              </span>
            ))}
            <span className={styles.bang}>!</span>
          </span>
          {tagline && <span className={styles.tagline}>Reservá. Pedí. Disfrutá.</span>}
        </span>
      )}
    </span>
  )
}
