import type { ReactNode } from 'react'

import { formatPesos } from '../../lib/rating'
import { StarRating } from '../ui'
import { ExpandableText } from './ExpandableText'
import styles from './OpinionCard.module.css'

const LONG_COMMENT = 280
const SHORT_COMMENT = 240

type OpinionCardProps = {
  author: string
  rating: number
  comment?: string | null
  spendPerPerson?: number | null
  /** «Visitó el martes, 3 de noviembre». */
  visit: string
  /** A remark for whoever reads the list, such as why this review doesn't count. */
  remark?: string
  /** What goes under the review, such as the restaurant's reply (US-42). */
  children?: ReactNode
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
  children,
}: OpinionCardProps) {
  return (
    <article className={styles.opinion} aria-label={`Reseña de ${author}`}>
      <div className={styles.head}>
        <span className={styles.author}>{author}</span>
        <StarRating value={rating} size={14} />
      </div>
      {comment && (
        <ExpandableText
          text={comment}
          longerThan={LONG_COMMENT}
          shortenTo={SHORT_COMMENT}
          className={styles.comment}
        />
      )}
      <p className={styles.note}>{visit}</p>
      {spendPerPerson != null && (
        <p className={styles.note}>{formatPesos(spendPerPerson)} por persona</p>
      )}
      {remark && <p className={styles.remark}>{remark}</p>}
      {children}
    </article>
  )
}
