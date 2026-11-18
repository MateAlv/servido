import { useEffect, useMemo, useState } from 'react'

import {
  cancelRestaurantReservation,
  fetchRestaurantReservations,
  type RestaurantReservation,
} from '../api/restaurantReservations'
import { configurationApi, type OpeningShift } from '../api/restaurantConfiguration'
import { Button, Card, IconArrowLeft, Modal, StatusPill, useToast } from '../components/ui'
import { longDate, todayInBuenosAires } from '../lib/date'
import { tableLabel } from '../lib/seating'
import styles from './RestaurantReservationsPage.module.css'

const DAY_NAMES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

function shiftLabel(shift: OpeningShift) {
  return `${shift.start_time} a ${shift.end_time}`
}

function previousDate(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function reservationShift(reservation: RestaurantReservation, shifts: OpeningShift[]) {
  return shifts.find(
    (shift) =>
      reservation.start_time >= shift.start_time && reservation.start_time < shift.end_time,
  )
}

function reservationCard(
  reservation: RestaurantReservation,
  cancelling: string | null,
  onCancel: (reservation: RestaurantReservation) => void,
) {
  const cancelled = reservation.status === 'cancelled'
  return (
    <Card key={reservation.id} className={styles.reservation}>
      <div className={styles.reservationHead}>
        <strong>
          {reservation.start_time} a {reservation.end_time}
        </strong>
        <StatusPill tone={cancelled ? 'error' : 'ok'}>
          {cancelled ? 'Cancelada' : 'Confirmada'}
        </StatusPill>
      </div>
      <dl className={styles.details}>
        <div>
          <dt>Mesa</dt>
          <dd>{tableLabel(reservation.table)}</dd>
        </div>
        <div>
          <dt>Personas</dt>
          <dd>{reservation.party_size}</dd>
        </div>
      </dl>
      {!cancelled && (
        <Button
          variant="secondary"
          size="sm"
          loading={cancelling === reservation.id}
          onClick={() => onCancel(reservation)}
        >
          Cancelar reserva
        </Button>
      )}
      <Button variant="ghost" size="sm" to={`/restaurante/reservas/${reservation.id}/comensal`}>
        Ver comensal
      </Button>
    </Card>
  )
}

export function RestaurantReservationsPage() {
  const toast = useToast()
  const [date, setDate] = useState(todayInBuenosAires)
  const [reservations, setReservations] = useState<RestaurantReservation[]>([])
  const [shifts, setShifts] = useState<OpeningShift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [pendingCancellation, setPendingCancellation] = useState<RestaurantReservation | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([fetchRestaurantReservations(date), configurationApi.getHours()])
      .then(([calendar, hours]) => {
        if (!active) return
        setError('')
        setReservations(calendar.reservations)
        setShifts(hours.filter((shift) => shift.active))
      })
      .catch((requestError: Error) => {
        if (!active) return
        setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [date])

  const groupedReservations = useMemo(() => {
    const weekday = ((new Date(`${date}T12:00:00-03:00`).getDay() + 6) % 7) + 1
    const dayShifts = shifts.filter((shift) => shift.day_of_week === weekday)
    const groups = dayShifts.map((shift) => ({
      key: `${shift.day_of_week}-${shift.start_time}`,
      title: shiftLabel(shift),
      reservations: reservations.filter((reservation) => reservationShift(reservation, [shift])),
    }))
    const ungrouped = reservations.filter(
      (reservation) => !reservationShift(reservation, dayShifts),
    )
    if (ungrouped.length > 0)
      groups.push({ key: 'other', title: 'Otros horarios', reservations: ungrouped })
    return groups.filter((group) => group.reservations.length > 0)
  }, [date, reservations, shifts])

  const dayIndex = new Date(`${date}T12:00:00-03:00`).getDay()
  const dayName = DAY_NAMES[(dayIndex + 6) % 7]
  const cancel = async (reservation: RestaurantReservation) => {
    setCancelling(reservation.id)
    try {
      const result = await cancelRestaurantReservation(reservation.id)
      setReservations((items) =>
        items.map((item) => (item.id === reservation.id ? { ...item, status: 'cancelled' } : item)),
      )
      toast(result.message, { tone: 'ok' })
    } catch (requestError) {
      toast((requestError as Error).message, { tone: 'error' })
    } finally {
      setCancelling(null)
    }
  }
  const confirmCancellation = async () => {
    if (!pendingCancellation) return
    await cancel(pendingCancellation)
    setPendingCancellation(null)
  }

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Panel del restaurante</p>
        <h1>Reservas</h1>
        <p>Organizá el salón y el personal según las visitas esperadas.</p>
      </header>
      <Card className={styles.calendar}>
        <div className={styles.dateControls}>
          <Button variant="secondary" size="sm" onClick={() => setDate(previousDate(date, -1))}>
            Día anterior
          </Button>
          <label>
            <span>Fecha de reservas</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Fecha de reservas"
            />
          </label>
          <Button variant="secondary" size="sm" onClick={() => setDate(previousDate(date, 1))}>
            Día siguiente
          </Button>
        </div>
        <h2>
          {dayName}, {longDate(date)}
        </h2>
        {loading && <p role="status">Cargando reservas…</p>}
        {!loading && error && <p role="alert">{error}</p>}
        {!loading && !error && groupedReservations.length === 0 && (
          <p role="status">No hay reservas registradas para esta fecha.</p>
        )}
        {!loading &&
          !error &&
          groupedReservations.map((group) => (
            <section
              key={group.key}
              className={styles.shift}
              aria-labelledby={`shift-${group.key}`}
            >
              <h3 id={`shift-${group.key}`}>Turno de {group.title}</h3>
              <div className={styles.reservations}>
                {group.reservations.map((reservation) =>
                  reservationCard(reservation, cancelling, setPendingCancellation),
                )}
              </div>
            </section>
          ))}
      </Card>
      <Modal
        open={pendingCancellation !== null}
        onClose={() => {
          if (!cancelling) setPendingCancellation(null)
        }}
        title="Confirmar cancelación"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingCancellation(null)}
              disabled={cancelling !== null}
            >
              Volver
            </Button>
            <Button loading={cancelling !== null} onClick={() => void confirmCancellation()}>
              Confirmar cancelación
            </Button>
          </>
        }
      >
        <p>
          La cancelación es definitiva. Se avisará al comensal y, si corresponde, se procesará el
          reembolso.
        </p>
      </Modal>
    </main>
  )
}
