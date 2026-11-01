import { useEffect, useState } from 'react'

import {
  fetchCurrentShiftOrders,
  fetchRestaurantOrder,
  type RestaurantOrder,
  type RestaurantOrders,
} from '../api/restaurantOrders'
import { Button, Card, IconArrowLeft } from '../components/ui'
import styles from './RestaurantOrdersPage.module.css'

function OrderCard({ order, onSelect }: { order: RestaurantOrder; onSelect: () => void }) {
  return (
    <Card className={styles.order}>
      <div className={styles.orderHeader}>
        <div>
          <p className={styles.eyebrow}>Reserva {order.reservation_id}</p>
          <h3>{order.arrival_time}</h3>
        </div>
        <Button variant="secondary" size="sm" onClick={onSelect}>
          Ver detalle
        </Button>
      </div>
      <ul className={styles.items}>
        {order.items.map((item) => (
          <li key={`${item.dish_name}-${item.quantity}`}>
            <span>{item.dish_name}</span>
            <strong>×{item.quantity}</strong>
          </li>
        ))}
      </ul>
      {order.prep_time_warning && (
        <p className={styles.warning} role="note">
          Este pedido tiene un plato con tiempo de preparación 0 minutos.
        </p>
      )}
    </Card>
  )
}

export function RestaurantOrdersPage() {
  const [calendar, setCalendar] = useState<RestaurantOrders | null>(null)
  const [selected, setSelected] = useState<RestaurantOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetchCurrentShiftOrders()
      .then((result) => {
        if (!active) return
        setCalendar(result)
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
  }, [])

  async function showDetail(order: RestaurantOrder) {
    try {
      setSelected(await fetchRestaurantOrder(order.id))
    } catch (requestError) {
      setError((requestError as Error).message)
    }
  }

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Panel del restaurante</p>
        <h1>Pedidos del turno</h1>
        <p>Organizá la cocina según las reservas que están por llegar.</p>
      </header>
      <Card className={styles.calendar}>
        {loading && <p role="status">Cargando pedidos…</p>}
        {!loading && error && <p role="alert">{error}</p>}
        {!loading && !error && !calendar?.shift && (
          <p role="status">No hay un turno activo en este momento.</p>
        )}
        {!loading && !error && calendar?.shift && (
          <>
            <h2>
              Turno de {calendar.shift.start_time} a {calendar.shift.end_time}
            </h2>
            {calendar.orders.length === 0 ? (
              <p role="status">No hay pedidos para mostrar.</p>
            ) : (
              <div className={styles.orders}>
                {calendar.orders.map((order) => (
                  <OrderCard key={order.id} order={order} onSelect={() => showDetail(order)} />
                ))}
              </div>
            )}
          </>
        )}
        {selected && (
          <section className={styles.detail} aria-labelledby="order-detail-title">
            <h2 id="order-detail-title">Detalle del pedido</h2>
            <p>
              Reserva {selected.reservation_id} para las {selected.arrival_time}
            </p>
            <ul className={styles.items}>
              {selected.items.map((item) => (
                <li key={`${item.dish_name}-${item.quantity}`}>
                  <span>{item.dish_name}</span>
                  <strong>×{item.quantity}</strong>
                </li>
              ))}
            </ul>
            {selected.prep_time_warning && (
              <p className={styles.warning} role="note">
                Revisá los platos con tiempo de preparación 0 minutos.
              </p>
            )}
          </section>
        )}
      </Card>
    </main>
  )
}
