import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { accessToken, useAccount } from '../api/session'
import { Button, Card, TextField } from '../components/ui'
import styles from './AddDishPage.module.css'

const categories = [
  ['entrada', 'Entrada'],
  ['plato_principal', 'Plato principal'],
  ['postre', 'Postre'],
  ['bebida', 'Bebida'],
]
const restrictions = [
  ['sin_tacc', 'Sin TACC'],
  ['vegetariano', 'Vegetariano'],
  ['vegano', 'Vegano'],
]

export function AddDishPage() {
  const navigate = useNavigate()
  const { data: account, isPending } = useAccount()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>([])

  if (isPending) return <main className={styles.page}>Cargando…</main>
  if (account?.rol !== 'restaurant') {
    navigate('/ingresar', { replace: true })
    return null
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)
    const form = new FormData(event.currentTarget)
    selectedRestrictions.forEach((value) => form.append('restricciones_alimenticias', value))
    const response = await fetch('/api/restaurantes/me/platos', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken() ?? ''}` },
      body: form,
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.detail ?? 'No pudimos guardar el plato. Revisá los datos e intentá de nuevo.')
      setSaving(false)
      return
    }
    navigate('/restaurante/menu')
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Menú</p>
        <h1>Agregar un plato</h1>
        <p>Completá los datos para que tu equipo pueda ofrecerlo en los pedidos.</p>
      </header>
      <Card>
        <form className={styles.form} onSubmit={submit}>
          <TextField name="nombre" label="Nombre *" required maxLength={150} />
          <TextField name="descripcion" label="Descripción" maxLength={2000} />
          <label className={styles.label} htmlFor="categoria">
            Categoría *
          </label>
          <select
            id="categoria"
            name="categoria"
            required
            className={styles.select}
            defaultValue=""
          >
            <option value="" disabled>
              Elegí una categoría
            </option>
            {categories.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <TextField
            name="precio"
            label="Precio en pesos argentinos *"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
          <fieldset className={styles.fieldset}>
            <legend>Restricciones alimenticias</legend>
            {restrictions.map(([value, label]) => (
              <label key={value} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={selectedRestrictions.includes(value)}
                  onChange={() =>
                    setSelectedRestrictions((current) =>
                      current.includes(value)
                        ? current.filter((item) => item !== value)
                        : [...current, value],
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <TextField
            name="tiempo_preparacion_minutos"
            label="Tiempo de preparación (minutos)"
            type="number"
            min="1"
            step="1"
          />
          <label className={styles.label} htmlFor="foto">
            Foto (JPG o PNG, hasta 5 MB)
          </label>
          <input id="foto" name="foto" type="file" accept="image/jpeg,image/png" />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={() => navigate('/')}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Guardar plato
            </Button>
          </div>
        </form>
      </Card>
    </main>
  )
}
