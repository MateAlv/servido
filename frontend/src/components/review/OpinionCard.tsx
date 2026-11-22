import { useEffect, useState, type ReactNode } from 'react'

import type { PhotoReference } from '../../api/reviews'
import { formatPesos } from '../../lib/rating'
import { StarRating } from '../ui'
import { ExpandableText } from './ExpandableText'
import styles from './OpinionCard.module.css'

const LONG_COMMENT = 280
const SHORT_COMMENT = 240

type Photo = File | PhotoReference

type OpinionCardProps = {
  photos?: readonly Photo[]
  loadPhoto?: (url: string) => Promise<Blob>
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
  photos,
  loadPhoto,
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
      {photos && photos.length > 0 && (
        <ul className={styles.photos}>
          {photos.map((photo, index) => (
            <li key={'id' in photo ? photo.id : index}>
              <OpinionPhoto photo={photo} index={index} loadPhoto={loadPhoto} />
            </li>
          ))}
        </ul>
      )}
      {remark && <p className={styles.remark}>{remark}</p>}
      {children}
    </article>
  )
}

function OpinionPhoto({
  photo,
  index,
  loadPhoto,
}: {
  photo: Photo
  index: number
  loadPhoto?: (url: string) => Promise<Blob>
}) {
  const [objectUrl, setObjectUrl] = useState<{ photo: Photo; url: string }>()
  const [failed, setFailed] = useState<Photo>()
  useEffect(() => {
    if ('url' in photo && !loadPhoto) return
    let active = true
    let url: string | undefined
    const blob = 'url' in photo && loadPhoto ? loadPhoto(photo.url) : Promise.resolve(photo as File)
    void blob
      .then((file) => {
        if (!active) return
        url = URL.createObjectURL(file)
        setObjectUrl({ photo, url })
      })
      .catch(() => {
        if (active) setFailed(photo)
      })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [photo, loadPhoto])
  const src =
    'url' in photo && !loadPhoto
      ? photo.url
      : objectUrl?.photo === photo
        ? objectUrl.url
        : undefined
  if (failed === photo) return <span>No pudimos cargar la foto.</span>
  return src ? (
    <img className={styles.photo} src={src} alt={`Foto ${index + 1} de la reseña`} loading="lazy" />
  ) : null
}
