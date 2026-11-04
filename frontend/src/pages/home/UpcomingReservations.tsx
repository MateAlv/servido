import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { retryUnlessSessionExpired, SessionExpiredError } from '../../api/errors'
import { fetchUpcomingReservations, type UpcomingReservation } from '../../api/orders'
import { signOut } from '../../api/session'
import { Button, Card, StatusPill } from '../../components/ui'
import { longDate, todayInBuenosAires } from '../../lib/date'
import styles from './UpcomingReservations.module.css'

function dayLabel(isoDate: string): string {
  const today = todayInBuenosAires()
  const [year, month, day] = today.split('-').map(Number)
  const tomorrow = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
  if (isoDate === today) return 'Hoy'
  if (isoDate === tomorrow) return 'Mañana'
  return longDate(isoDate)
}

function OrderState({ reservation }: { reservation: UpcomingReservation }) {
  const orderPath = `/reservas/${reservation.id}/pedido`
  if (reservation.has_cart) {
    return (
      <>
        <StatusPill tone="warn">
          {reservation.has_order
            ? 'Pedido confirmado · con cambios sin confirmar'
            : 'Pedido sin confirmar'}
        </StatusPill>
        <Button to={orderPath} size="sm">
          Seguir armando
        </Button>
      </>
    )
  }
  if (reservation.has_order) {
    return (
      <>
        <StatusPill tone="ok">Pedido confirmado</StatusPill>
        <Button to={orderPath} size="sm" variant="secondary">
          Ver pedido
        </Button>
      </>
    )
  }
  if (reservation.order_open) {
    return (
      <Button to={orderPath} size="sm">
        Armar pedido
      </Button>
    )
  }
  return null
}

/** «Tus próximas reservas» (spec 009, P4): how the diner gets back to an order. Hidden when
 * there are none; the reservation detail stays in US-23. */
export function UpcomingReservations() {
  const queryClient = useQueryClient()
  const upcoming = useQuery({
    queryKey: ['reservations', 'upcoming'],
    queryFn: fetchUpcomingReservations,
    retry: retryUnlessSessionExpired,
  })

  useEffect(() => {
    if (upcoming.error instanceof SessionExpiredError) signOut(queryClient)
  }, [upcoming.error, queryClient])

  if (!upcoming.data?.length) return null
  return (
    <section aria-labelledby="upcoming-title" className={styles.section}>
      <h2 id="upcoming-title" className={styles.title}>
        Tus próximas reservas
      </h2>
      <ul className={styles.list}>
        {upcoming.data.map((reservation) => (
          <li key={reservation.id}>
            <Card className={styles.card}>
              <p className={styles.restaurant}>{reservation.restaurant.nombre}</p>
              <p className={styles.when}>
                {dayLabel(reservation.date)} · {reservation.start_time} ·{' '}
                {reservation.party_size === 1 ? '1 persona' : `${reservation.party_size} personas`}
              </p>
              <div className={styles.order}>
                <OrderState reservation={reservation} />
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
