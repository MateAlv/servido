import type { ReactNode } from 'react'

import { cx } from '../../lib/cx'
import { cssVars } from '../../lib/cssVars'
import styles from './Timeline.module.css'

export type TimelineStep = {
  time: string
  title: string
  detail?: ReactNode
  state: 'done' | 'current' | 'upcoming'
}

const STATE_LABELS = { done: 'completado', current: 'en curso', upcoming: 'pendiente' }

type TimelineProps = {
  steps: TimelineStep[]
  /** Delay in milliseconds before the first step appears. */
  delay?: number
}

/** Journey of a reservation: reserved → kitchen starts → you arrive. The current step pulses. */
export function Timeline({ steps, delay = 0 }: TimelineProps) {
  return (
    <ol
      className={styles.timeline}
      style={cssVars({ '--timeline-delay': `${delay}ms` })}
      data-entrance=""
    >
      {steps.map((step, i) => (
        <li
          key={`${step.time}-${step.title}`}
          className={cx(styles.step, styles[step.state])}
          style={cssVars({ '--i': i })}
        >
          <span className={styles.dot} aria-hidden="true" />
          <div>
            <span className={styles.time}>{step.time}</span> {step.title}
            <span className="visually-hidden"> ({STATE_LABELS[step.state]})</span>
            {step.detail && <span className={styles.detail}>{step.detail}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}
