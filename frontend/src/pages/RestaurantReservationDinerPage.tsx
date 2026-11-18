import { useEffect, useState } from 'react'
import { useParams } from 'react-router'

import {
  fetchReservationDiner,
  fetchReservationOrder,
  type ReservationDiner,
  type RestaurantReservationOrder,
} from '../api/restaurantReservations'
import { Button, Card, IconArrowLeft, StatusPill } from '../components/ui'
import { formatPrice } from '../lib/orderSummary'
import styles from './RestaurantReservationDinerPage.module.css'

export function RestaurantReservationDinerPage() {
  const { reservationId = '' } = useParams()
  const [reservation, setReservation] = useState<ReservationDiner | null>(null)
  const [order, setOrder] = useState<RestaurantReservationOrder | null>(null)
  const [reservationError, setReservationError] = useState('')
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    fetchReservationDiner(reservationId)
      .then(setReservation)
      .catch((requestError: Error) => setReservationError(requestError.message))

    fetchReservationOrder(reservationId)
      .then(setOrder)
      .catch((requestError: Error) => setOrderError(requestError.message))
  }, [reservationId])

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/restaurante/reservas" icon={<IconArrowLeft />}>
        Volver a reservas
      </Button>
      <Card>
        <p className={styles.eyebrow}>Detalle de la reserva</p>
        <h1>Datos del comensal</h1>
        {!reservation && !reservationError && <p role="status">Cargando datos del comensal…</p>}
        {reservationError && <p role="alert">{reservationError}</p>}
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
      {orderError && (
        <Card>
          <p className={styles.eyebrow}>Pedido anticipado</p>
          <p role="alert">{orderError}</p>
        </Card>
      )}
      {!order && !orderError && (
        <Card>
          <p className={styles.eyebrow}>Pedido anticipado</p>
          <p role="status">Cargando pedido anticipado…</p>
        </Card>
      )}
      {order && (
        <Card>
          <p className={styles.eyebrow}>Pedido anticipado</p>
          {order.reservation_status === 'cancelled' ? (
            <p>La reserva está cancelada: su pedido también se canceló.</p>
          ) : order.order ? (
            <>
              <StatusPill tone="ok">Pedido confirmado</StatusPill>
              <ul className={styles.order}>
                {order.order.items.map((item, index) => (
                  <li key={index}>
                    <span>
                      {item.dish_name} × {item.quantity}
                    </span>
                    <strong>{formatPrice(item.subtotal)}</strong>
                  </li>
                ))}
              </ul>
              <p className={styles.total}>
                Total <strong>{formatPrice(order.order.payment.total)}</strong>
              </p>
            </>
          ) : (
            <p>Esta reserva no tiene pedido anticipado confirmado.</p>
          )}
        </Card>
      )}
    </main>
  )
}
