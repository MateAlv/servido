import type { Reservation } from '../../api/reservations'
import { Button, Card, StatusPill } from '../../components/ui'
import { longDate } from '../../lib/date'
import { tableLabel } from '../../lib/seating'
import styles from '../ReservationPage.module.css'

/** The reservation the diner just confirmed (US-13 S5). */
export function ConfirmedStep({ reservation }: { reservation: Reservation }) {
  return (
    <Card className={styles.step}>
      <StatusPill tone="ok">Reserva confirmada</StatusPill>
      <h2 className={styles.stepTitle}>¡Listo! Te esperamos.</h2>
      <dl className={styles.summary}>
        <div>
          <dt>Restaurante</dt>
          <dd>{reservation.restaurant.nombre}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{longDate(reservation.date)}</dd>
        </div>
        <div>
          <dt>Horario</dt>
          <dd>
            {reservation.start_time} a {reservation.end_time}
          </dd>
        </div>
        <div>
          <dt>Personas</dt>
          <dd>{reservation.party_size}</dd>
        </div>
        <div>
          <dt>Mesa</dt>
          <dd>{tableLabel(reservation.table)}</dd>
        </div>
      </dl>
      <div className={styles.actions}>
        <Button to="/">Ir al inicio</Button>
      </div>
    </Card>
  )
}
