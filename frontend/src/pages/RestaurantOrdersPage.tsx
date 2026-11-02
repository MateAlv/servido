import { useEffect, useState } from 'react'

import {
  fetchCurrentShiftOrders,
  fetchRestaurantOrder,
  type RestaurantOrder,
  type RestaurantOrders,
} from '../api/restaurantOrders'
import { Button, Card, IconArrowLeft, StatusPill } from '../components/ui'
import styles from './RestaurantOrdersPage.module.css'

const money = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
})

function paymentState(order: RestaurantOrder) {
  return (
    <StatusPill tone={order.payment.status === 'paid' ? 'ok' : 'warn'}>
      {order.payment.status === 'paid' ? 'Pagado' : 'Pendiente de pago'}
    </StatusPill>
  )
}

function OrderCard({
  order,
  onSelect,
  isSelected,
}: {
  order: RestaurantOrder
  onSelect: () => void
  isSelected: boolean
}) {
  return (
    <Card className={styles.order}>
      <div className={styles.orderHeader}>
        <div>
          <p className={styles.eyebrow}>Reserva {order.reservation_id}</p>
          <h3>{order.arrival_time}</h3>
        </div>
        <Button variant="secondary" size="sm" onClick={onSelect}>
          {isSelected ? 'Ocultar detalle' : 'Ver detalle'}
        </Button>
      </div>
      {paymentState(order)}
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
    if (selected?.id === order.id) {
      setSelected(null)
      return
    }

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
                  <OrderCard
                    key={order.id}
                    order={order}
                    onSelect={() => showDetail(order)}
                    isSelected={selected?.id === order.id}
                  />
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
            {paymentState(selected)}
            <p>
              Medio de pago:{' '}
              {selected.payment.method === 'cash'
                ? 'Efectivo'
                : selected.payment.method === 'online'
                  ? 'Electrónico'
                  : 'No seleccionado'}
            </p>
            <ul className={`${styles.items} ${styles.breakdown}`} aria-label="Desglose del pedido">
              {selected.items.map((item) => (
                <li key={`${item.dish_name}-${item.quantity}`}>
                  <span>{item.dish_name}</span>
                  <span>Cantidad: {item.quantity}</span>
                  <span>Precio unitario: {money.format(Number(item.unit_price))}</span>
                  <strong>Subtotal: {money.format(Number(item.subtotal))}</strong>
                </li>
              ))}
            </ul>
            <p>
              <strong>Total: {money.format(Number(selected.payment.total))}</strong>
            </p>
            <p>Impuestos incluidos</p>
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
