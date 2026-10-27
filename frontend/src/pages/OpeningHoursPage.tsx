import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { Button, Card, IconArrowLeft, TextField, useToast } from '../components/ui'
import { configurationApi, type OpeningShift } from '../api/restaurantConfiguration'
import styles from './RestaurantProfilePage.module.css'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function OpeningHoursPage() {
  const [hours, setHours] = useState<OpeningShift[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    configurationApi
      .getHours()
      .then(setHours)
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  function addShift() {
    setHours((current) => [
      ...current,
      { day_of_week: 1, start_time: '12:00', end_time: '15:00', active: true },
    ])
  }

  async function save() {
    const invalid = hours.some(
      (shift) => !shift.start_time || !shift.end_time || shift.end_time <= shift.start_time,
    )
    const activeByDay = new Map<number, OpeningShift[]>()
    hours
      .filter((shift) => shift.active)
      .forEach((shift) => {
        activeByDay.set(shift.day_of_week, [...(activeByDay.get(shift.day_of_week) ?? []), shift])
      })
    const overlaps = [...activeByDay.values()].some((dayShifts) => {
      const sorted = [...dayShifts].sort((a, b) => a.start_time.localeCompare(b.start_time))
      return sorted.some(
        (shift, index) => index > 0 && shift.start_time < sorted[index - 1].end_time,
      )
    })
    if (invalid || overlaps) {
      setError(
        invalid
          ? 'La hora de fin debe ser posterior a la de inicio.'
          : 'Los turnos del mismo día no pueden superponerse.',
      )
      setMessage('')
      return
    }
    try {
      setHours(await configurationApi.updateHours(hours))
      toast('Guardaste los horarios.', { tone: 'ok' })
      navigate('/')
      setError('')
    } catch (requestError) {
      setError((requestError as Error).message)
    }
  }

  return (
    <main className={styles.page}>
      <Button className={styles.back} variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <header>
        <p className={styles.eyebrow}>Configuración del local</p>
        <h1 className={styles.title}>Horarios de atención</h1>
      </header>
      <Card>
        <div className={styles.form}>
          {hours.map((shift, index) => (
            <fieldset key={`${shift.day_of_week}-${index}`} className={styles.form}>
              <legend>{DAYS[shift.day_of_week - 1]}</legend>
              <label>
                Día
                <select
                  value={shift.day_of_week}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, day_of_week: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                >
                  {DAYS.map((day, dayIndex) => (
                    <option key={day} value={dayIndex + 1}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <TextField
                label="Desde"
                type="time"
                value={shift.start_time}
                onChange={(event) =>
                  setHours((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, start_time: event.target.value } : item,
                    ),
                  )
                }
              />
              <TextField
                label="Hasta"
                type="time"
                value={shift.end_time}
                onChange={(event) =>
                  setHours((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, end_time: event.target.value } : item,
                    ),
                  )
                }
              />
              <label>
                <input
                  type="checkbox"
                  checked={shift.active}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, active: event.target.checked } : item,
                      ),
                    )
                  }
                />{' '}
                Atiendo este día
              </label>
            </fieldset>
          ))}
          <Button type="button" variant="secondary" onClick={addShift}>
            Agregar turno
          </Button>
          <Button type="button" onClick={save}>
            Guardar horarios
          </Button>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
        </div>
      </Card>
    </main>
  )
}
