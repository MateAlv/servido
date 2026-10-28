import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import {
  Button,
  Card,
  IconArrowLeft,
  SegmentedControl,
  TextField,
  useToast,
} from '../components/ui'
import { configurationApi, type TableGroup } from '../api/restaurantConfiguration'
import { SEATING_AREA_OPTIONS } from '../lib/seating'
import styles from './RestaurantProfilePage.module.css'

export function TableInventoryPage() {
  const [groups, setGroups] = useState<TableGroup[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    configurationApi
      .getTables()
      .then(setGroups)
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  function addGroup() {
    setGroups((current) => [
      ...current,
      { capacity: 2, quantity: 1, seating_area: 'indoor', available: true },
    ])
  }

  async function save() {
    if (
      groups.some(
        (group) =>
          !Number.isInteger(group.capacity) ||
          group.capacity <= 0 ||
          !Number.isInteger(group.quantity) ||
          group.quantity <= 0,
      )
    ) {
      setError('La capacidad y la cantidad deben ser números enteros mayores a cero.')
      setMessage('')
      return
    }
    const keys = groups.map((group) => `${group.capacity}-${group.seating_area}`)
    if (new Set(keys).size !== groups.length) {
      setError('No puede haber dos grupos con la misma capacidad y el mismo tipo de mesa.')
      setMessage('')
      return
    }
    try {
      setGroups(await configurationApi.updateTables(groups))
      toast('Guardaste el inventario de mesas.', { tone: 'ok' })
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
        <h1 className={styles.title}>Inventario de mesas</h1>
        <p className={styles.lead}>
          Registrá grupos: por ejemplo, 4 mesas de capacidad 2 adentro. No hay Mesa 1 ni Mesa 2.
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
              <SegmentedControl
                label="Tipo de mesa"
                options={SEATING_AREA_OPTIONS}
                value={group.seating_area}
                onChange={(seatingArea) =>
                  setGroups((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, seating_area: seatingArea } : item,
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
