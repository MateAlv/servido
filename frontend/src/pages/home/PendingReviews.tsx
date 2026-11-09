import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import {
  getRequestErrorMessage,
  retryUnlessSessionExpired,
  SessionExpiredError,
} from '../../api/errors'
import { fetchPendingReviews, type PendingReview } from '../../api/reviews'
import { signOut, type Account } from '../../api/session'
import { Button, Card } from '../../components/ui'
import { longDate } from '../../lib/date'
import styles from './PendingReviews.module.css'
import { ReviewDialog, type ReviewFormValues } from './ReviewDialog'

const EMPTY_FORM: ReviewFormValues = { rating: 0, comment: '', spend: '' }
const LOAD_FAILED = 'No pudimos cargar tus reseñas pendientes.'

function hasContent({ rating, comment, spend }: ReviewFormValues) {
  return rating > 0 || comment.trim() !== '' || spend.trim() !== ''
}

/** «¿Cómo estuvo?» (spec 014, R7): the diner's finished reservations without a review. Hidden
 * when there are none. What the diner typed stays until publishing, even with the form closed. */
export function PendingReviews({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<PendingReview | null>(null)
  const [open, setOpen] = useState(false)
  const [openings, setOpenings] = useState(0)
  const [forms, setForms] = useState<Record<string, ReviewFormValues>>({})
  const [published, setPublished] = useState<PendingReview | null>(null)
  const confirmation = useRef<HTMLDivElement>(null)
  const pending = useQuery({
    queryKey: ['reviews', 'pending'],
    queryFn: fetchPendingReviews,
    retry: retryUnlessSessionExpired,
  })

  useEffect(() => {
    if (pending.error instanceof SessionExpiredError) signOut(queryClient)
  }, [pending.error, queryClient])

  useEffect(() => {
    if (published) confirmation.current?.focus()
  }, [published])

  if (pending.isError) {
    if (pending.error instanceof SessionExpiredError) return null
    return (
      <section className={styles.section}>
        <p role="alert" className={styles.lead}>
          {getRequestErrorMessage(pending.error, LOAD_FAILED)}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void pending.refetch()}>
          Reintentar
        </Button>
      </section>
    )
  }

  const reservations = pending.data?.reservations ?? []
  // The dialog stays mounted while it closes, even if its reservation just left the list.
  if (reservations.length === 0 && !selected && !published) return null
  const verified = account.email_verificado

  return (
    <section
      aria-labelledby={reservations.length > 0 ? 'pending-reviews-title' : undefined}
      className={styles.section}
    >
      {published && (
        <div ref={confirmation} tabIndex={-1} role="status" className={styles.confirmation}>
          {published.hidden_by_later_visit ? (
            <p>¡Gracias! Tu reseña de {published.restaurant_name} ya le llegó al restaurante.</p>
          ) : (
            <p>
              ¡Gracias! Publicamos tu reseña de {published.restaurant_name}.{' '}
              <Button variant="ghost" size="sm" to={`/restaurantes/${published.restaurant_id}`}>
                Ver el restaurante
              </Button>
            </p>
          )}
        </div>
      )}
      {reservations.length > 0 && (
        <>
          <h2 id="pending-reviews-title" className={styles.title}>
            ¿Cómo estuvo?
          </h2>
          <p className={styles.lead}>Contales a los demás cómo fue tu visita.</p>
          {!verified && (
            <p className={styles.lead}>
              Para dejar tu reseña, primero verificá tu email con el enlace que te mandamos.
            </p>
          )}
          <ul className={styles.list}>
            {reservations.map((reservation) => {
              const started = hasContent(forms[reservation.reservation_id] ?? EMPTY_FORM)
              const action = started ? 'Seguir mi reseña' : 'Dejar reseña'
              return (
                <li key={reservation.reservation_id}>
                  <Card className={styles.card}>
                    <p className={styles.restaurant}>{reservation.restaurant_name}</p>
                    <p className={styles.when}>
                      {longDate(reservation.date)} · {reservation.start_time}
                    </p>
                    {verified && (
                      <div className={styles.action}>
                        <Button
                          aria-label={`${action} de ${reservation.restaurant_name}, ${longDate(reservation.date)} a las ${reservation.start_time}`}
                          onClick={() => {
                            setSelected(reservation)
                            setOpenings(openings + 1)
                            setOpen(true)
                          }}
                        >
                          {action}
                        </Button>
                      </div>
                    )}
                  </Card>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {selected && pending.data && (
        <ReviewDialog
          key={openings}
          open={open}
          reservation={selected}
          author={pending.data.author}
          values={forms[selected.reservation_id] ?? EMPTY_FORM}
          onChange={(values) => setForms({ ...forms, [selected.reservation_id]: values })}
          onClose={() => setOpen(false)}
          onPublished={() => {
            setPublished(selected)
            setSelected(null)
            setOpen(false)
          }}
        />
      )}
    </section>
  )
}
