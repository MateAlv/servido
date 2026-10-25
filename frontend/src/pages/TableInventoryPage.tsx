import { useEffect, useState } from 'react'

import { Button, Card, TextField } from '../components/ui'
import { configurationApi, type TableGroup } from '../api/restaurantConfiguration'
import styles from './RestaurantProfilePage.module.css'

export function TableInventoryPage() {
  const [groups, setGroups] = useState<TableGroup[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    configurationApi
      .getTables()
      .then(setGroups)
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  function addGroup() {
    setGroups((current) => [...current, { capacity: 2, quantity: 1, available: true }])
  }

  async function save() {
    try {
      setGroups(await configurationApi.updateTables(groups))
      setMessage('Guardaste el inventario de mesas.')
      setError('')
    } catch (requestError) {
      setError((requestError as Error).message)
    }
  }

  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Configuración del local</p>
        <h1 className={styles.title}>Inventario de mesas</h1>
        <p className={styles.lead}>
          Registrá grupos: por ejemplo, 4 mesas de capacidad 2. No hay Mesa 1 ni Mesa 2.
        </p>
      </header>
      <Card>
        <div className={styles.form}>
          {groups.map((group, index) => (
            <fieldset key={index} className={styles.form}>
              <legend>Grupo de mesas</legend>
              <TextField
                label="Cantidad"
                type="number"
                min={1}
                value={group.quantity}
                onChange={(event) =>
                  setGroups((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, quantity: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
              <TextField
                label="Capacidad de cada mesa"
                type="number"
                min={1}
                value={group.capacity}
                onChange={(event) =>
                  setGroups((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, capacity: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
              <label>
                <input
                  type="checkbox"
                  checked={group.available}
                  onChange={(event) =>
                    setGroups((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, available: event.target.checked } : item,
                      ),
                    )
                  }
                />{' '}
                Disponible para reservar
              </label>
            </fieldset>
          ))}
          <Button type="button" variant="secondary" onClick={addGroup}>
            Agregar grupo
          </Button>
          <Button type="button" onClick={save}>
            Guardar mesas
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
