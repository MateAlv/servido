import { useId, useState } from 'react'

import { longDate } from '../../lib/date'
import styles from './OpinionReply.module.css'
import { shorten } from './shorten'

// About three lines at 360 px, so the reply never outweighs the review above it.
const LONG_REPLY = 160
const SHORT_REPLY = 130

type OpinionReplyProps = {
  /** «Respuesta de La Esquina» in public, «Tu respuesta» in the restaurant's list. */
  label: string
  text: string
  /** ISO date the reply was published. */
  date: string
  edited: boolean
  /** Shortens a long reply until «Leer más», as the comments do (Opiniones). */
  collapsible?: boolean
}

/** The restaurant's reply under a review (US-42): only the current text, marked «Editada» when it
 * changed after publishing (spec 025, C3). */
export function OpinionReply({
  label,
  text,
  date,
  edited,
  collapsible = false,
}: OpinionReplyProps) {
  const labelId = useId()
  const [expanded, setExpanded] = useState(false)
  const shortened = collapsible && !expanded && text.length > LONG_REPLY

  return (
    <div className={styles.reply} role="group" aria-labelledby={labelId}>
      <p id={labelId} className={styles.label}>
        {label}
      </p>
      <p className={styles.text}>
        {shortened ? shorten(text, SHORT_REPLY) : text}{' '}
        {shortened && (
          <button type="button" className={styles.readMore} onClick={() => setExpanded(true)}>
            Leer más
          </button>
        )}
      </p>
      <p className={styles.meta}>
        Respondió el {longDate(date)}
        {edited && (
          <>
            {' · '}
            <span className={styles.edited}>Editada</span>
          </>
        )}
      </p>
    </div>
  )
}
