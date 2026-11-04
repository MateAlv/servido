import { useEffect, useState } from 'react'

import {
  fetchRestaurantCancellations,
  type RestaurantCancellation,
} from '../api/restaurantReservations'
import { Button, Card, IconArrowLeft, StatusPill } from '../components/ui'
import { tableLabel } from '../lib/seating'
import styles from './RestaurantCancellationsPage.module.css'

function localToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date())
}

export function RestaurantCancellationsPage() {
  const [date, setDate] = useState(localToday)
  const [cancellations, setCancellations] = useState<RestaurantCancellation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchRestaurantCancellations(date)
      .then((response) => {
        if (!active) return
        setCancellations(response.cancellations)
        setError('')
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [date])

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Panel del restaurante</p>
        <h1>Cancelaciones</h1>
        <p>Consultá las reservas canceladas de tu restaurante.</p>
      </header>
      <Card className={styles.card}>
        <label className={styles.date}>
          <span>Fecha de reservas</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Fecha de cancelaciones"
          />
        </label>
        {loading && <p role="status">Cargando cancelaciones…</p>}
        {!loading && error && <p role="alert">{error}</p>}
        {!loading && !error && cancellations.length === 0 && (
          <p role="status">No hay cancelaciones para esta fecha.</p>
        )}
        {!loading &&
          !error &&
          cancellations.map((cancellation) => (
            <article key={cancellation.reservation_id} className={styles.item}>
              <div className={styles.heading}>
                <strong>
                  {cancellation.start_time} a {cancellation.end_time}
                </strong>
                <StatusPill tone="error">Cancelada</StatusPill>
              </div>
              <dl>
                <div>
                  <dt>Mesa</dt>
                  <dd>{tableLabel(cancellation.table)}</dd>
                </div>
                <div>
                  <dt>Personas</dt>
                  <dd>{cancellation.party_size}</dd>
                </div>
                <div>
                  <dt>Cancelada el</dt>
                  <dd>{new Date(cancellation.cancelled_at).toLocaleString('es-AR')}</dd>
                </div>
              </dl>
              {cancellation.preordered_order && <p>El pedido anticipado también fue cancelado.</p>}
            </article>
          ))}
      </Card>
    </main>
  )
}
