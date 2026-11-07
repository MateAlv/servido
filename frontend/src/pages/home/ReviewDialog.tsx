import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState } from 'react'

import { getRequestErrorMessage } from '../../api/errors'
import { publishReview, type PendingReview } from '../../api/reviews'
import { signOut } from '../../api/session'
import { OpinionCard } from '../../components/review'
import { Button, Modal, StarRating, TextAreaField, TextField, useToast } from '../../components/ui'
import { longDate } from '../../lib/date'
import styles from './ReviewDialog.module.css'

const MAX_COMMENT_LENGTH = 500
const MAX_SPEND = 1_000_000
const SPEND_ERROR = 'Escribí un monto en pesos enteros, de $1 a $1.000.000.'
const PUBLISH_FAILED = 'No pudimos publicar tu reseña. Probá de nuevo.'
const SESSION_EXPIRED = 'Tu sesión venció. Volvé a ingresar para dejar tu reseña.'
// «Publicar» appears where «Continuar» was: a double tap must not skip the preview.
const DOUBLE_TAP_MS = 500

export type ReviewFormValues = {
  rating: number
  comment: string
  spend: string
}

/** Whole pesos, with or without «$» and thousands dots; `undefined` when it isn't valid. */
function parseSpend(text: string): number | null | undefined {
  const value = text.trim().replace(/^\$\s*/, '')
  if (!value) return null
  if (!/^(\d+|\d{1,3}(\.\d{3})+)$/.test(value)) return undefined
  const amount = Number(value.replaceAll('.', ''))
  return amount >= 1 && amount <= MAX_SPEND ? amount : undefined
}

type ReviewDialogProps = {
  open: boolean
  reservation: PendingReview
  author: string
  values: ReviewFormValues
  onChange: (values: ReviewFormValues) => void
  onClose: () => void
  onPublished: () => void
}

/** The form of a review (US-27, US-50), and how it will look before publishing it (R16). */
export function ReviewDialog({
  open,
  reservation,
  author,
  values,
  onChange,
  onClose,
  onPublished,
}: ReviewDialogProps) {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const ids = useId()
  const ratingErrorId = `${ids}-rating-error`
  const warningId = `${ids}-warning`
  const formRef = useRef<HTMLDivElement>(null)
  const previewTitle = useRef<HTMLHeadingElement>(null)
  const previewOpenedAt = useRef(0)
  const [step, setStep] = useState<'form' | 'preview'>('form')
  const [ratingError, setRatingError] = useState('')
  const [spendError, setSpendError] = useState('')
  const [publishError, setPublishError] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [outdated, setOutdated] = useState(false)
  const [attempts, setAttempts] = useState(0)

  const { rating, comment, spend } = values
  const cleanComment = comment.trim()
  const parsedSpend = parseSpend(spend)
  const commentTooLong = cleanComment.length > MAX_COMMENT_LENGTH
  const hidden = reservation.hidden_by_later_visit
  const visitDate = longDate(reservation.date)

  useEffect(() => {
    if (!open) return
    if (step === 'preview') previewTitle.current?.focus()
    else formRef.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus()
  }, [open, step])

  useEffect(() => {
    if (attempts === 0) return
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    const target =
      invalid?.getAttribute('role') === 'radiogroup'
        ? invalid.querySelector<HTMLElement>('[tabindex="0"]')
        : invalid
    target?.focus()
  }, [attempts])

  function goToPreview() {
    const missingRating = rating === 0
    const badSpend = parsedSpend === undefined
    setRatingError(missingRating ? 'Elegí una calificación de 1 a 5 estrellas.' : '')
    setSpendError(badSpend ? SPEND_ERROR : '')
    if (missingRating || commentTooLong || badSpend) {
      setAttempts(attempts + 1)
      return
    }
    setPublishError('')
    previewOpenedAt.current = Date.now()
    setStep('preview')
  }

  async function publish() {
    if (Date.now() - previewOpenedAt.current < DOUBLE_TAP_MS) return
    setPublishError('')
    setPublishing(true)
    try {
      const failure = await publishReview(reservation.reservation_id, {
        rating,
        comment: cleanComment || null,
        spend_per_person: parsedSpend ?? null,
      })
      if (failure?.kind === 'session') {
        showToast(SESSION_EXPIRED, { tone: 'error' })
        signOut(queryClient)
        return
      }
      if (failure) {
        if (failure.kind === 'conflict') {
          setOutdated(true)
          void queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] })
        }
        setPublishError(failure.message)
        return
      }
      void queryClient.invalidateQueries({ queryKey: ['reviews', 'pending'] })
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] })
      onPublished()
    } catch (requestError) {
      setPublishError(getRequestErrorMessage(requestError, PUBLISH_FAILED))
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Tu reseña de ${reservation.restaurant_name}`}>
      {step === 'form' ? (
        <div ref={formRef} className={styles.step}>
          <p className={styles.when}>
            {visitDate} · {reservation.start_time}
          </p>
          {hidden && (
            <p className={styles.notice}>
              Ya reseñaste una visita más reciente a este local: esta reseña la va a ver solo el
              restaurante.
            </p>
          )}
          <div>
            <p className={styles.ratingLabel} aria-hidden="true">
              ¿Cómo estuvo tu visita?
            </p>
            <div className={styles.ratingRow}>
              <StarRating
                value={rating}
                onChange={(value) => {
                  onChange({ ...values, rating: value })
                  setRatingError('')
                }}
                label={`¿Cómo estuvo tu visita del ${visitDate}?`}
                size={40}
                invalid={Boolean(ratingError)}
                describedBy={ratingError ? ratingErrorId : undefined}
              />
              {rating > 0 && (
                <span className={styles.ratingValue} aria-hidden="true">
                  {rating} de 5
                </span>
              )}
            </div>
            {ratingError && (
              <p id={ratingErrorId} className={styles.error} role="alert">
                {ratingError}
              </p>
            )}
          </div>
          <TextAreaField
            label="Tu comentario (opcional)"
            hint={`${cleanComment.length} de ${MAX_COMMENT_LENGTH} caracteres`}
            error={
              commentTooLong
                ? `El comentario puede tener hasta ${MAX_COMMENT_LENGTH} caracteres.`
                : ''
            }
            value={comment}
            onChange={(event) => onChange({ ...values, comment: event.target.value })}
          />
          <TextField
            label="¿Cuánto gastaste por persona? (opcional)"
            hint="En pesos. El monto se publica en tu reseña."
            inputMode="numeric"
            error={spendError}
            value={spend}
            onChange={(event) => {
              onChange({ ...values, spend: event.target.value })
              setSpendError('')
            }}
          />
        </div>
      ) : (
        <div className={styles.step}>
          <h3 ref={previewTitle} tabIndex={-1} className={styles.previewTitle}>
            {hidden ? 'Así la va a ver el restaurante' : 'Así se va a ver'}
          </h3>
          <div className={styles.preview}>
            <OpinionCard
              author={author}
              rating={rating}
              comment={cleanComment || null}
              spendPerPerson={parsedSpend}
              visit={`Visitó el ${visitDate}`}
            />
          </div>
          <div id={warningId} className={styles.notice}>
            <p>
              <strong>Todavía no se publicó.</strong> Es definitiva: después de publicarla no la vas
              a poder cambiar ni borrar.
            </p>
            {hidden ? (
              <p>
                Ya reseñaste una visita más reciente a este local: esta reseña la ve solo el
                restaurante. No aparece en público ni cuenta en el promedio.
              </p>
            ) : (
              <>
                {cleanComment ? (
                  <p>
                    Se va a ver en la página del restaurante
                    {parsedSpend != null && ', con el monto que gastaste'}.
                  </p>
                ) : (
                  <p>
                    Sin comentario, tu calificación cuenta en el promedio, pero no aparece en
                    Opiniones.
                  </p>
                )}
                {reservation.replaces_earlier_review && (
                  <p>
                    Tu reseña anterior de este local deja de verse en público y de contar en el
                    promedio. El restaurante la sigue viendo.
                  </p>
                )}
              </>
            )}
          </div>
          {publishError && (
            <p className={styles.error} role="alert">
              {publishError}
            </p>
          )}
        </div>
      )}
      <div className={styles.actions}>
        {step === 'form' && <Button onClick={goToPreview}>Continuar</Button>}
        {step === 'preview' && outdated && <Button onClick={onClose}>Cerrar</Button>}
        {step === 'preview' && !outdated && (
          <>
            <Button variant="secondary" disabled={publishing} onClick={() => setStep('form')}>
              Volver
            </Button>
            <Button loading={publishing} aria-describedby={warningId} onClick={publish}>
              Publicar
            </Button>
          </>
        )}
      </div>
    </Modal>
  )
}
