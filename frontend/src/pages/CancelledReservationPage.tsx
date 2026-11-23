import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCancelledReservation } from '../api/reservations'
import { retryUnlessSessionExpired, SessionExpiredError } from '../api/errors'
import { signOut } from '../api/session'
import { Button, Card } from '../components/ui'
import { longDate, timeInBuenosAires } from '../lib/date'
import { formatPrice } from '../lib/orderSummary'
import { tableLabel } from '../lib/seating'
import styles from './CancelledReservationPage.module.css'

export function CancelledReservationPage() {
  const { reservationId = '' } = useParams()
  const queryClient = useQueryClient()
  const cancelled = useQuery({
    queryKey: ['reservation', 'cancelled', reservationId],
    queryFn: () => fetchCancelledReservation(reservationId),
    retry: retryUnlessSessionExpired,
  })

  useEffect(() => {
    if (cancelled.error instanceof SessionExpiredError) signOut(queryClient)
  }, [cancelled.error, queryClient])

  const reservation = cancelled.data
  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/reservas/canceladas">
        Volver a reservas canceladas
      </Button>
      {cancelled.isPending && <p role="status">Cargando reserva cancelada…</p>}
      {cancelled.error instanceof Error && <p role="alert">{cancelled.error.message}</p>}
      {reservation && (
        <Card className={styles.card}>
          <p className={styles.eyebrow}>Reserva cancelada</p>
          <h1>{reservation.restaurant.nombre}</h1>
          <p>
            {reservation.cancelled_by === 'diner'
              ? 'Cancelada por vos'
              : reservation.cancelled_by === 'restaurant'
                ? 'Cancelada por el restaurante'
                : 'Cancelada'}
          </p>
          <dl className={styles.details}>
            <div>
              <dt>Fecha y hora</dt>
              <dd>
                {longDate(reservation.date)} · {reservation.start_time}
              </dd>
            </div>
            <div>
              <dt>Comensales</dt>
              <dd>{reservation.party_size}</dd>
            </div>
            <div>
              <dt>Mesa</dt>
              <dd>{tableLabel(reservation.table)}</dd>
            </div>
            <div>
              <dt>Cancelada el</dt>
              <dd>{timeInBuenosAires(reservation.cancelled_at)}</dd>
            </div>
          </dl>
          {reservation.refund_status === 'completed' ? (
            <div className={styles.refunded} role="status">
              <svg className={styles.refundArt} viewBox="0 0 120 72" aria-hidden="true">
                <path pathLength={1} d="M104 46c0-18-16-30-44-30S16 28 16 40" />
                <path pathLength={1} className={styles.refundHead} d="M8 32l8 9 9-8" />
              </svg>
              <span className={styles.coin} aria-hidden="true">
                $
              </span>
              <strong className={styles.refundTitle}>Te devolvimos el pago</strong>
              <span>
                {reservation.refund_amount ? `${formatPrice(reservation.refund_amount)} ` : ''}a tu
                tarjeta. Puede tardar unos días en verse en el resumen.
              </span>
            </div>
          ) : (
            reservation.refund_status && (
              <p className={styles.refund} role="status">
                Reembolso pendiente
              </p>
            )
          )}
        </Card>
      )}
    </main>
  )
}
