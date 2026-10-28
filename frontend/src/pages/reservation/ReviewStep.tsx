import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import type { AvailableTable } from '../../api/availability'
import { getRequestErrorMessage, SessionExpiredError } from '../../api/errors'
import { confirmReservation, fetchDayReservations, type Reservation } from '../../api/reservations'
import { Button, Card } from '../../components/ui'
import { longDate, timesOverlap } from '../../lib/date'
import { newRequestId } from '../../lib/requestId'
import { tableLabel } from '../../lib/seating'
import styles from '../ReservationPage.module.css'

const CONFIRM_FAILED = 'No pudimos confirmar la reserva. Probá de nuevo.'

type ReviewStepProps = {
  restaurant: { id: string; name: string }
  fecha: string
  hora: string
  endTime: string
  personas: number
  table: AvailableTable
  onBack: () => void
  onConfirmed: (reservation: Reservation) => void
  /** Something changed during the review (409): back to the selection with this message. */
  onConflict: (message: string) => void
  onSessionExpired: () => void
}

/**
 * US-13: the diner checks the selection before confirming. Nothing is created until they press
 * «Confirmar reserva» (S4); an overlapping reservation of theirs is warned about, not blocked (S6).
 */
export function ReviewStep({
  restaurant,
  fecha,
  hora,
  endTime,
  personas,
  table,
  onBack,
  onConfirmed,
  onConflict,
  onSessionExpired,
}: ReviewStepProps) {
  // One id per review: a double click or a retry returns the same reservation.
  const [requestId] = useState(newRequestId)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)

  // The step replaces the button that opened it: focus its title so keyboards and screen
  // readers land on the review.
  useEffect(() => {
    title.current?.focus()
  }, [])

  const dayReservations = useQuery({
    queryKey: ['reservations', fecha],
    queryFn: () => fetchDayReservations(fecha),
    // Only a warning hangs on it: on failure, say so right away instead of retrying.
    retry: false,
  })
  const sessionExpired = dayReservations.error instanceof SessionExpiredError
  useEffect(() => {
    if (sessionExpired) onSessionExpired()
  }, [sessionExpired, onSessionExpired])
  const overlapping = (dayReservations.data ?? []).filter((reservation) =>
    timesOverlap(reservation.start_time, reservation.end_time, hora, endTime),
  )

  async function confirm() {
    setConfirming(true)
    setError('')
    try {
      const result = await confirmReservation({
        restaurant_id: restaurant.id,
        date: fecha,
        start_time: hora,
        party_size: personas,
        table: { capacity: table.capacity, seating_area: table.seating_area },
        request_id: requestId,
      })
      if (result.ok) return onConfirmed(result.reservation)
      if (result.status === 409) return onConflict(result.message)
      if (result.status === 401) return onSessionExpired()
      if (result.status === 404) return setNotFound(true)
      setError(result.message)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, CONFIRM_FAILED))
    } finally {
      setConfirming(false)
    }
  }

  if (notFound) {
    return (
      <Card className={styles.step}>
        <h2 className={styles.stepTitle}>No encontramos ese restaurante</h2>
        <p className={styles.muted}>Puede que ya no exista. Buscá otro en el mapa.</p>
        <Link to="/mapa">Ir al mapa</Link>
      </Card>
    )
  }

  return (
    <Card className={styles.step}>
      <h2 ref={title} tabIndex={-1} className={styles.stepTitle}>
        Revisá tu reserva
      </h2>
      <dl className={styles.summary}>
        <div>
          <dt>Restaurante</dt>
          <dd>{restaurant.name}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{longDate(fecha)}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>
            {hora} a {endTime}
          </dd>
        </div>
        <div>
          <dt>Personas</dt>
          <dd>{personas}</dd>
        </div>
        <div>
          <dt>Mesa</dt>
          <dd>{tableLabel(table)}</dd>
        </div>
      </dl>
      {dayReservations.isError && !sessionExpired && (
        <p className={styles.notice} role="status">
          No pudimos revisar tus otras reservas de ese día.
        </p>
      )}
      {overlapping.map((reservation) => (
        <p key={reservation.id} className={`${styles.notice} ${styles.warn}`} role="status">
          Ya tenés una reserva{' '}
          {reservation.restaurant.id === restaurant.id
            ? 'acá'
            : `en ${reservation.restaurant.nombre}`}{' '}
          de {reservation.start_time} a {reservation.end_time}. Podés confirmar igual.
        </p>
      ))}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.reviewActions}>
        <Button onClick={confirm} loading={confirming || dayReservations.isPending}>
          Confirmar reserva
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={confirming}>
          Cambiar datos
        </Button>
      </div>
    </Card>
  )
}
