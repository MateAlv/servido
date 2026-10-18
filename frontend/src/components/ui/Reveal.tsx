import { createElement, useEffect, useState, type ReactNode } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './Reveal.module.css'

type RevealProps = {
  children: ReactNode
  as?: 'div' | 'section' | 'article' | 'li' | 'span'
  /** Delay in milliseconds; use multiples of 60 to stagger siblings. */
  delay?: number
  variant?: 'up' | 'fade' | 'pop'
  className?: string
}

/**
 * Plays an entrance animation the first time its content scrolls into view.
 * It also sets `data-visible`, so children can start their own animations then.
 */
export function Reveal({
  children,
  as = 'div',
  delay = 0,
  variant = 'up',
  className,
}: RevealProps) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (visible || !element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { threshold: 0.15 },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [element, visible])

  return createElement(
    as,
    {
      ref: setElement,
      className: cx(styles.reveal, visible && styles.visible, styles[variant], className),
      style: cssVars({ '--reveal-delay': `${delay}ms` }),
      'data-entrance': '',
      'data-visible': visible ? '' : undefined,
    },
    children,
  )
}
