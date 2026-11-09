import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, Modal, TextField } from '../components/ui'
import {
  ClosureWarningError,
  createClosure,
  deleteClosure,
  fetchClosures,
  type AffectedReservation,
} from '../api/closures'
import styles from './RestaurantClosuresPage.module.css'

export function RestaurantClosuresPage() {
  const client = useQueryClient()
  const closures = useQuery({ queryKey: ['closures'], queryFn: fetchClosures })
  const [date, setDate] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [warning, setWarning] = useState<AffectedReservation[] | null>(null)
  const [requestId, setRequestId] = useState(crypto.randomUUID())
  const [error, setError] = useState('')
  const submit = async (confirmed = false, ids: string[] = []) => {
    setError('')
    if (!date || (!allDay && (!start || !end))) {
      setError('Completá la fecha y el horario.')
      return
    }
    if (!allDay && end <= start) {
      setError('La hora de fin debe ser posterior a la de inicio.')
      return
    }
    try {
      await createClosure({
        date,
        start_time: allDay ? null : start,
        end_time: allDay ? null : end,
        request_id: requestId,
        confirmed,
        acknowledged_reservation_ids: ids,
      })
      setWarning(null)
      setRequestId(crypto.randomUUID())
      await client.invalidateQueries({ queryKey: ['closures'] })
    } catch (e) {
      if (e instanceof ClosureWarningError) setWarning(e.reservations)
      else setError((e as Error).message)
    }
  }
  return (
    <main className={styles.page}>
      <h1>Bloqueos de horario</h1>
      <p>Elegí una fecha o una franja que no quieras recibir reservas.</p>
      <Card>
        <div className={styles.form}>
          <label>
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className={styles.check}>
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />{' '}
            Todo el día
          </label>
          {!allDay && (
            <>
              <TextField
                label="Desde"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
              <TextField
                label="Hasta"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <Button onClick={() => void submit()}>Bloquear horario</Button>
        </div>
      </Card>
      <section>
        <h2>Bloqueos vigentes</h2>
        {closures.data?.map((item) => (
          <Card key={item.id}>
            <div className={styles.row}>
              <span>
                <strong>{item.date}</strong> ·{' '}
                {item.all_day ? 'Todo el día' : `${item.start_time} a ${item.end_time}`}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  void deleteClosure(item.id).then(() =>
                    client.invalidateQueries({ queryKey: ['closures'] }),
                  )
                }
              >
                Quitar
              </Button>
            </div>
          </Card>
        ))}
      </section>
      <Modal
        open={warning !== null}
        onClose={() => setWarning(null)}
        title="Hay reservas confirmadas"
      >
        <p>Si continuás, estas reservas serán canceladas:</p>
        <ul>
          {warning?.map((r) => (
            <li key={r.reservation_id}>
              {r.date}, {r.start_time} · {r.party_size} personas
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setWarning(null)}>
            Desistir
          </Button>
          <Button onClick={() => void submit(true, warning?.map((r) => r.reservation_id) ?? [])}>
            Confirmar bloqueo
          </Button>
        </div>
      </Modal>
    </main>
  )
}
