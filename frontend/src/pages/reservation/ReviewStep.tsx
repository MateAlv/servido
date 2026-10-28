import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import type { AvailableTable } from '../../api/availability'
import { getRequestErrorMessage } from '../../api/errors'
import { confirmReservation, fetchDayReservations, type Reservation } from '../../api/reservations'
import { Button, Card } from '../../components/ui'
import { longDate, timesOverlap } from '../../lib/date'
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
  const [requestId] = useState(() => crypto.randomUUID())
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const dayReservations = useQuery({
    queryKey: ['reservations', fecha],
    queryFn: () => fetchDayReservations(fecha),
  })
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
      setError(result.message)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, CONFIRM_FAILED))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <Card className={styles.step}>
      <h2 className={styles.stepTitle}>Revisá tu reserva</h2>
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
      {overlapping.map((reservation) => (
        <p key={reservation.id} className={styles.notice} role="status">
          Ya tenés una reserva en {reservation.restaurant.nombre} de {reservation.start_time} a{' '}
          {reservation.end_time}. Podés confirmar igual.
        </p>
      ))}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="ghost" onClick={onBack} disabled={confirming}>
          Volver
        </Button>
        <Button onClick={confirm} loading={confirming}>
          Confirmar reserva
        </Button>
      </div>
    </Card>
  )
}
