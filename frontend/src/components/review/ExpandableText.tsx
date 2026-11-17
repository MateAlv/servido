import { useId, useState } from 'react'

import styles from './ExpandableText.module.css'
import { shorten } from './shorten'

type ExpandableTextProps = {
  text: string
  /** Texts longer than this many characters start shortened. */
  longerThan: number
  /** How many characters the shortened text keeps. */
  shortenTo: number
  className?: string
}

/** A comment or a reply that starts shortened, with «Leer más» / «Ver menos». The toggle stays the
 * same button, so it keeps the focus. */
export function ExpandableText({ text, longerThan, shortenTo, className }: ExpandableTextProps) {
  const textId = useId()
  const [expanded, setExpanded] = useState(false)
  const isLong = text.length > longerThan

  return (
    <p className={className}>
      <span id={textId}>{isLong && !expanded ? shorten(text, shortenTo) : text}</span>
      {isLong && (
        <>
          {' '}
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={expanded}
            aria-controls={textId}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Ver menos' : 'Leer más'}
          </button>
        </>
      )}
    </p>
  )
}
