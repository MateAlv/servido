import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { fetchCancelledReservations } from '../api/reservations'
import { retryUnlessSessionExpired, SessionExpiredError } from '../api/errors'
import { signOut } from '../api/session'
import { Button, Card } from '../components/ui'
import { longDate } from '../lib/date'
import styles from './CancelledReservationsPage.module.css'

export function CancelledReservationsPage() {
  const queryClient = useQueryClient()
  const cancelled = useQuery({
    queryKey: ['reservations', 'cancelled'],
    queryFn: fetchCancelledReservations,
    retry: retryUnlessSessionExpired,
  })

  useEffect(() => {
    if (cancelled.error instanceof SessionExpiredError) signOut(queryClient)
  }, [cancelled.error, queryClient])

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/reservas">
        Volver a mis reservas
      </Button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Tu cuenta</p>
        <h1>Reservas canceladas</h1>
      </header>
      {cancelled.isPending && <p role="status">Cargando reservas canceladas…</p>}
      {cancelled.error instanceof Error && <p role="alert">{cancelled.error.message}</p>}
      {!cancelled.isPending && !cancelled.error && cancelled.data?.length === 0 && (
        <p role="status">No tenés reservas canceladas.</p>
      )}
      {cancelled.data && cancelled.data.length > 0 && (
        <ul className={styles.list}>
          {cancelled.data.map((reservation) => (
            <li key={reservation.id}>
              <Card className={styles.card}>
                <p className={styles.restaurant}>{reservation.restaurant.nombre}</p>
                <p>
                  {longDate(reservation.date)} · {reservation.start_time}
                </p>
                <Button variant="secondary" size="sm" to={`/reservas/canceladas/${reservation.id}`}>
                  Ver detalle
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
