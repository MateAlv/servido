import { useEffect, useState, type AnimationEvent } from 'react'

import { cx } from '../../lib/cx'
import { useReducedMotion } from '../../lib/motion'
import styles from './BrandSplash.module.css'
import { Logo, type LogoAnimation } from './Logo'

type Phase = 'intro' | 'hold' | 'outro' | 'lift' | 'done'

type BrandSplashProps = {
  /** While false, the logo stays on screen after its intro. */
  ready?: boolean
  onDone?: () => void
}

/**
 * Full-screen brand moment: the logo appears, waits until `ready`, disappears,
 * and the screen lifts away. A click skips ahead. Skipped entirely when the user
 * prefers reduced motion.
 */
export function BrandSplash({ ready = true, onDone }: BrandSplashProps) {
  const reducedMotion = useReducedMotion()
  const [storedPhase, setPhase] = useState<Phase>('intro')
  const phase = storedPhase === 'hold' && ready ? 'outro' : storedPhase
  const skipped = reducedMotion && ready
  const visible = phase !== 'done' && !skipped

  useEffect(() => {
    if (skipped) onDone?.()
  }, [skipped, onDone])

  const covering = visible && phase !== 'lift'

  useEffect(() => {
    if (!covering) return
    const root = document.documentElement
    root.dataset.splash = ''
    return () => {
      delete root.dataset.splash
    }
  }, [covering])

  if (!visible) return null

  function handleLogoEnd(animation: LogoAnimation) {
    if (animation === 'intro') setPhase(ready ? 'outro' : 'hold')
    if (animation === 'outro') setPhase('lift')
  }

  function skip() {
    if (phase === 'intro' && ready) setPhase('outro')
  }

  function handleLiftEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || phase !== 'lift') return
    setPhase('done')
    onDone?.()
  }

  const logoAnimation: LogoAnimation =
    phase === 'intro' ? 'intro' : phase === 'hold' ? 'idle' : 'outro'

  return (
    <div
      className={cx(styles.splash, phase === 'lift' && styles.lift)}
      aria-hidden="true"
      data-testid="brand-splash"
      data-splash-root=""
      onAnimationEnd={handleLiftEnd}
      onClick={skip}
    >
      <span className={styles.halo} />
      <Logo
        layout="stacked"
        size="xl"
        tagline
        animation={logoAnimation}
        onAnimationEnd={handleLogoEnd}
      />
    </div>
  )
}
