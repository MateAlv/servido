import { useState } from 'react'

import { formatPesos } from '../../lib/rating'
import { StarRating } from '../ui'
import styles from './OpinionCard.module.css'

const LONG_COMMENT = 280
const SHORT_COMMENT = 240

function shorten(comment: string): string {
  const cut = comment.slice(0, SHORT_COMMENT)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

type OpinionCardProps = {
  author: string
  rating: number
  comment?: string | null
  spendPerPerson?: number | null
  /** «Visitó el martes, 3 de noviembre». */
  visit: string
  /** A remark for whoever reads the list, such as why this review doesn't count. */
  remark?: string
}

/** One review as people read it: the same in the restaurant's detail, in the diner's preview
 * before publishing (US-50) and in the restaurant's list (US-24). */
export function OpinionCard({
  author,
  rating,
  comment,
  spendPerPerson,
  visit,
  remark,
}: OpinionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const isLong = comment != null && comment.length > LONG_COMMENT

  return (
    <article className={styles.opinion} aria-label={`Reseña de ${author}`}>
      <div className={styles.head}>
        <span className={styles.author}>{author}</span>
        <StarRating value={rating} size={14} />
      </div>
      {comment && (
        <p className={styles.comment}>
          {isLong && !expanded ? shorten(comment) : comment}{' '}
          {isLong && !expanded && (
            <button type="button" className={styles.readMore} onClick={() => setExpanded(true)}>
              Leer más
            </button>
          )}
        </p>
      )}
      <p className={styles.note}>{visit}</p>
      {spendPerPerson != null && (
        <p className={styles.note}>{formatPesos(spendPerPerson)} por persona</p>
      )}
      {remark && <p className={styles.remark}>{remark}</p>}
    </article>
  )
}
