import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { fetchReservationDiner, type ReservationDiner } from '../api/restaurantReservations'
import { Button, Card, IconArrowLeft } from '../components/ui'
import styles from './RestaurantReservationDinerPage.module.css'

export function RestaurantReservationDinerPage() {
  const { reservationId = '' } = useParams()
  const [reservation, setReservation] = useState<ReservationDiner | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchReservationDiner(reservationId)
      .then(setReservation)
      .catch((requestError: Error) => setError(requestError.message))
  }, [reservationId])

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/restaurante/reservas" icon={<IconArrowLeft />}>
        Volver a reservas
      </Button>
      <Card>
        <p className={styles.eyebrow}>Detalle de la reserva</p>
        <h1>Datos del comensal</h1>
        {!reservation && !error && <p role="status">Cargando datos del comensal…</p>}
        {error && <p role="alert">{error}</p>}
        {reservation && (
          <dl className={styles.details}>
            <div>
              <dt>Nombre</dt>
              <dd>{reservation.diner.name ?? 'Sin nombre informado'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{reservation.diner.email}</dd>
            </div>
          </dl>
        )}
      </Card>
    </main>
  )
}
