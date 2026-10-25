import { useEffect, useState } from 'react'

import { Button, Card, TextField } from '../components/ui'
import { configurationApi, type OpeningShift } from '../api/restaurantConfiguration'
import styles from './RestaurantProfilePage.module.css'

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function OpeningHoursPage() {
  const [hours, setHours] = useState<OpeningShift[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

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
    try {
      setHours(await configurationApi.updateHours(hours))
      setMessage('Guardaste los horarios.')
      setError('')
    } catch (requestError) {
      setError((requestError as Error).message)
    }
  }

  return (
    <main className={styles.page}>
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
