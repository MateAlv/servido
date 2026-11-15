import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Button, Card, IconArrowLeft, Modal, StarRating } from '../components/ui'
import { dateInBuenosAires, longDate } from '../lib/date'
import { formatPesos, formatRating, formatReviewCount } from '../lib/rating'
import styles from './RestaurantReviewsPage.module.css'
import { ReplyForm } from './reviews/ReplyForm'

const LOAD_FAILED = 'No pudimos cargar las reseñas.'
const OLDER_VISIT = 'Visita anterior: no cuenta en el promedio ni se ve en público.'

/** Why a reply form changed or closed by itself, with what the restaurant had typed. */
type ReplyNotice = { reviewId: string; message: string; draft: string }

type ReplySectionProps = {
  review: RestaurantReview
  open: boolean
  notice?: ReplyNotice
  /** Move the focus to this review's reply button, e.g. after closing its form. */
  takeFocus: boolean
  onFocusTaken: () => void
  onDirtyChange: (dirty: boolean) => void
  onOpen: () => void
  onCancel: () => void
  onSaved: () => Promise<void>
  onConflict: (message: string, draft: string) => Promise<void>
}

/** The reply under a review (US-42): offered only on the reviews shown in Opiniones (C1),
 * edited but never deleted (C4). */
function ReplySection({
  review,
  open,
  notice,
  takeFocus,
  onFocusTaken,
  onDirtyChange,
  onOpen,
  onCancel,
  onSaved,
  onConflict,
}: ReplySectionProps) {
  const { reply } = review
  const showingForm = open && (reply !== null || review.can_reply)
  const actionRef = useRef<HTMLButtonElement>(null)
  const noticeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!takeFocus || showingForm) return
    actionRef.current?.focus()
    onFocusTaken()
  }, [takeFocus, showingForm, onFocusTaken])

  useEffect(() => {
    if (notice && !showingForm) noticeRef.current?.focus()
  }, [notice, showingForm])

  if (showingForm) {
    return (
      <ReplyForm
        key={reply ? 'edit' : 'reply'}
        reviewId={review.id}
        author={review.author}
        current={reply?.text}
        notice={notice?.message}
        draft={notice?.draft}
        onDirtyChange={onDirtyChange}
        onSaved={onSaved}
        onCancel={onCancel}
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
        <div ref={noticeRef} tabIndex={-1} className={styles.replyError} role="alert">
          <p>{notice.message}</p>
          <p className={styles.lostDraft}>Lo que escribiste, sin publicar: {notice.draft}</p>
        </div>
      )}
      {(reply || review.can_reply) && (
        <div className={styles.replyAction}>
          <Button ref={actionRef} variant="secondary" size="sm" onClick={onOpen}>
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
  const [notice, setNotice] = useState<ReplyNotice | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  // What to do once the restaurant agrees to lose its draft; null while nothing is asked.
  const [discarding, setDiscarding] = useState<{ then: () => void } | null>(null)
  const afterDiscard = useRef<(() => void) | null>(null)
  const draftIsDirty = useRef(false)
  const markDirty = useCallback((dirty: boolean) => {
    draftIsDirty.current = dirty
  }, [])
  const focusTaken = useCallback(() => setFocusId(null), [])
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

  /** Runs `action` now, or after confirming when it would lose a draft. */
  function keepingDrafts(action: () => void) {
    if (draftIsDirty.current) setDiscarding({ then: action })
    else action()
  }

  function openForm(reviewId: string) {
    draftIsDirty.current = false
    setOpenId(reviewId)
    setNotice(null)
  }

  function closeForm(reviewId: string) {
    draftIsDirty.current = false
    setOpenId(null)
    setNotice(null)
    setFocusId(reviewId)
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
                  notice={notice?.reviewId === review.id ? notice : undefined}
                  takeFocus={focusId === review.id}
                  onFocusTaken={focusTaken}
                  onDirtyChange={markDirty}
                  onOpen={() => keepingDrafts(() => openForm(review.id))}
                  onCancel={() => keepingDrafts(() => closeForm(review.id))}
                  onSaved={async () => {
                    await refreshReviews()
                    closeForm(review.id)
                  }}
                  onConflict={async (message, draft) => {
                    await refreshReviews()
                    setNotice({ reviewId: review.id, message, draft })
                  }}
                />
              </OpinionCard>
            </Card>
          </li>
        ))}
      </ul>
      <Modal
        open={discarding !== null}
        onClose={() => setDiscarding(null)}
        onClosed={() => {
          const action = afterDiscard.current
          afterDiscard.current = null
          action?.()
        }}
        title="¿Descartás tu respuesta?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDiscarding(null)}>
              Seguir escribiendo
            </Button>
            <Button
              onClick={() => {
                afterDiscard.current = discarding?.then ?? null
                setDiscarding(null)
              }}
            >
              Descartar
            </Button>
          </>
        }
      >
        <p>Lo que escribiste todavía no se publicó y se va a perder.</p>
      </Modal>
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
