import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'

import {
  getRequestErrorMessage,
  retryUnlessSessionExpired,
  SessionExpiredError,
} from '../api/errors'
import { fetchRestaurantReviews, type RestaurantReview } from '../api/reviews'
import { signOut, useAccount } from '../api/session'
import { LogoSpinner } from '../components/brand'
import { OpinionCard, OpinionReply } from '../components/review'
import { Button, Card, IconArrowLeft, StarRating } from '../components/ui'
import { dateInBuenosAires, longDate } from '../lib/date'
import { formatPesos, formatRating, formatReviewCount } from '../lib/rating'
import styles from './RestaurantReviewsPage.module.css'
import { ReplyForm } from './reviews/ReplyForm'

const LOAD_FAILED = 'No pudimos cargar las reseñas.'
const OLDER_VISIT = 'Visita anterior: no cuenta en el promedio ni se ve en público.'

type ReplySectionProps = {
  review: RestaurantReview
  open: boolean
  notice?: string
  onOpen: () => void
  onClose: () => void
  onSaved: () => Promise<void>
  onConflict: (message: string) => Promise<void>
}

/** The reply under a review (US-42): offered only on the reviews shown in Opiniones (C1),
 * edited but never deleted (C4). */
function ReplySection({
  review,
  open,
  notice,
  onOpen,
  onClose,
  onSaved,
  onConflict,
}: ReplySectionProps) {
  const { reply } = review
  if (open && (reply || review.can_reply)) {
    return (
      <ReplyForm
        key={reply ? 'edit' : 'reply'}
        reviewId={review.id}
        author={review.author}
        current={reply?.text}
        notice={notice}
        onSaved={onSaved}
        onCancel={onClose}
        onConflict={onConflict}
      />
    )
  }
  return (
    <>
      {reply && (
        <OpinionReply
          label="Tu respuesta"
          text={reply.text}
          date={dateInBuenosAires(reply.created_at)}
          edited={reply.edited_at !== null}
        />
      )}
      {notice && (
        <p className={styles.replyError} role="alert">
          {notice}
        </p>
      )}
      {(reply || review.can_reply) && (
        <div className={styles.replyAction}>
          <Button variant="secondary" size="sm" onClick={onOpen}>
            {reply ? 'Editar respuesta' : 'Responder'}
          </Button>
        </div>
      )}
    </>
  )
}

function ReviewsList() {
  const queryClient = useQueryClient()
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ reviewId: string; message: string } | null>(null)
  const reviews = useInfiniteQuery({
    queryKey: ['restaurant', 'reviews'],
    queryFn: ({ pageParam }) => fetchRestaurantReviews(pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.next_offset ?? undefined,
    retry: retryUnlessSessionExpired,
  })

  useEffect(() => {
    if (reviews.error instanceof SessionExpiredError) signOut(queryClient)
  }, [reviews.error, queryClient])

  async function refreshReviews() {
    void queryClient.invalidateQueries({ queryKey: ['restaurants'] })
    await queryClient.invalidateQueries({ queryKey: ['restaurant', 'reviews'] })
  }

  if (reviews.isPending) return <p role="status">Cargando reseñas…</p>
  if (reviews.isError)
    return <p role="alert">{getRequestErrorMessage(reviews.error, LOAD_FAILED)}</p>

  const [summary] = reviews.data.pages
  const loaded = reviews.data.pages.flatMap((page) => page.reviews)
  if (summary.total_reviews === 0) {
    return (
      <Card>
        <p role="status" className={styles.empty}>
          Todavía no tenés reseñas. Van a aparecer acá cuando los comensales las publiquen.
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card className={styles.summary}>
        <p className={styles.average}>
          {formatRating(summary.rating ?? 0)}
          <StarRating value={summary.rating ?? 0} size={20} />
        </p>
        <p className={styles.counts}>
          Los comensales ven {formatRating(summary.rating ?? 0)} ·{' '}
          {formatReviewCount(summary.review_count)}.
        </p>
        {summary.total_reviews > summary.review_count && (
          <p className={styles.note}>
            Recibiste {summary.total_reviews} en total: si alguien volvió a tu local, solo cuenta su
            visita más reciente.
          </p>
        )}
        {summary.average_spend_per_person !== null && (
          <p className={styles.note}>
            Tu categoría de precio es {summary.price_tier}: sale del gasto medio de{' '}
            {summary.spend_people} comensales, {formatPesos(summary.average_spend_per_person)} por
            persona. Reemplaza a la que declaraste en tu perfil.
          </p>
        )}
      </Card>
      <h2 className="visually-hidden">Todas las reseñas</h2>
      <ul className={styles.list}>
        {loaded.map((review) => (
          <li key={review.id}>
            <Card>
              <OpinionCard
                author={review.author}
                rating={review.rating}
                comment={review.comment}
                spendPerPerson={review.spend_per_person}
                visit={`Visitó el ${longDate(review.visit_date)} a las ${review.visit_time}`}
                remark={review.counts_in_average ? undefined : OLDER_VISIT}
              >
                <ReplySection
                  review={review}
                  open={openId === review.id}
                  notice={notice?.reviewId === review.id ? notice.message : undefined}
                  onOpen={() => {
                    setOpenId(review.id)
                    setNotice(null)
                  }}
                  onClose={() => {
                    setOpenId(null)
                    setNotice(null)
                  }}
                  onSaved={async () => {
                    await refreshReviews()
                    setOpenId(null)
                    setNotice(null)
                  }}
                  onConflict={async (message) => {
                    await refreshReviews()
                    setNotice({ reviewId: review.id, message })
                  }}
                />
              </OpinionCard>
            </Card>
          </li>
        ))}
      </ul>
      {reviews.isFetchNextPageError && (
        <p role="alert">No pudimos cargar más reseñas. Probá de nuevo.</p>
      )}
      {reviews.hasNextPage && (
        <div className={styles.more}>
          <p className={styles.note}>
            Viendo {loaded.length} de {summary.total_reviews}.
          </p>
          <Button
            variant="secondary"
            loading={reviews.isFetchingNextPage}
            onClick={() => void reviews.fetchNextPage()}
          >
            Ver más
          </Button>
        </div>
      )}
    </>
  )
}

/** The reviews the restaurant received (US-24): it can't change them, only reply (US-42). */
export function RestaurantReviewsPage() {
  const { data: account, isPending } = useAccount()

  if (isPending) {
    return (
      <main className={styles.page}>
        <LogoSpinner />
      </main>
    )
  }
  if (!account) {
    return <Navigate to="/ingresar?rol=restaurante&volver=/restaurante/resenas" replace />
  }
  if (account.rol !== 'restaurant') return <Navigate to="/" replace />

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Panel del restaurante</p>
        <h1 className={styles.title}>Reseñas</h1>
        <p className={styles.lead}>
          Lo que dicen los comensales que ya visitaron tu local, de la última publicada a la más
          antigua.
        </p>
      </header>
      <ReviewsList />
    </main>
  )
}
