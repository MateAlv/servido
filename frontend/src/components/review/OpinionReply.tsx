import { longDate } from '../../lib/date'
import { StatusPill } from '../ui'
import styles from './OpinionReply.module.css'

type OpinionReplyProps = {
  /** «Respuesta de La Esquina» in public, «Tu respuesta» in the restaurant's list. */
  label: string
  text: string
  /** ISO date the reply was published. */
  date: string
  edited: boolean
}

/** The restaurant's reply under a review (US-42): only the current text, marked «Editada» when it
 * changed after publishing (spec 025, C3). */
export function OpinionReply({ label, text, date, edited }: OpinionReplyProps) {
  return (
    <section className={styles.reply} aria-label={label}>
      <p className={styles.label}>{label}</p>
      <p className={styles.text}>{text}</p>
      <p className={styles.meta}>
        <span className={styles.date}>{longDate(date)}</span>
        {edited && <StatusPill tone="neutral">Editada</StatusPill>}
      </p>
    </section>
  )
}
