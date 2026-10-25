import { useEffect, useState, type FormEvent } from 'react'

import { Button, Card, TextField } from '../components/ui'
import { configurationApi, type RestaurantProfile } from '../api/restaurantConfiguration'
import styles from './RestaurantProfilePage.module.css'

const EMPTY_PROFILE: RestaurantProfile = {
  nombre: '',
  descripcion: null,
  tipo_cocina: null,
  rango_precio: null,
  foto_url: null,
  restricciones_tags: null,
  direccion: null,
  latitud: null,
  longitud: null,
}

export function RestaurantProfilePage() {
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [preview, setPreview] = useState<{
    display_name: string
    latitude: number
    longitude: number
  }>()
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    configurationApi
      .getProfile()
      .then(setProfile)
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  function change(field: keyof RestaurantProfile, value: string | null) {
    setProfile((current) => ({ ...current, [field]: value }))
    setMessage('')
  }

  async function previewAddress() {
    if (!profile.direccion?.trim()) {
      setError('Ingresá una dirección.')
      return
    }
    try {
      setPreview(await configurationApi.geocode(profile.direccion))
      setError('')
    } catch (requestError) {
      setError((requestError as Error).message)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    try {
      const next = preview
        ? { ...profile, latitud: preview.latitude, longitud: preview.longitude }
        : profile
      setProfile(await configurationApi.updateProfile(next))
      setMessage('Guardaste los datos de tu local.')
      setError('')
    } catch (requestError) {
      setError((requestError as Error).message)
    }
  }

  return (
    <main className={styles.page}>
      <header>
        <p className={styles.eyebrow}>Configuración del local</p>
        <h1 className={styles.title}>Tu perfil público</h1>
        <p className={styles.lead}>
          Esta información aparece cuando los comensales buscan dónde comer.
        </p>
      </header>
      <Card>
        <form className={styles.form} onSubmit={save}>
          <TextField
            label="Nombre del restaurante"
            required
            value={profile.nombre}
            onChange={(event) => change('nombre', event.target.value)}
          />
          <TextField
            label="Tipo de cocina"
            value={profile.tipo_cocina ?? ''}
            onChange={(event) => change('tipo_cocina', event.target.value)}
          />
          <TextField
            label="Rango de precios"
            hint="Por ejemplo: $, $$ o $$$."
            value={profile.rango_precio ?? ''}
            onChange={(event) => change('rango_precio', event.target.value)}
          />
          <TextField
            label="URL de foto"
            type="url"
            hint="Ingresá una URL pública. Este MVP no carga archivos."
            value={profile.foto_url ?? ''}
            onChange={(event) => change('foto_url', event.target.value || null)}
          />
          {profile.foto_url && (
            <img
              className={styles.photo}
              src={profile.foto_url}
              alt="Vista previa del restaurante"
            />
          )}
          <label className={styles.textareaLabel} htmlFor="descripcion">
            Descripción
          </label>
          <textarea
            id="descripcion"
            className={styles.textarea}
            value={profile.descripcion ?? ''}
            onChange={(event) => change('descripcion', event.target.value)}
          />
          <TextField
            label="Dirección"
            value={profile.direccion ?? ''}
            onChange={(event) => change('direccion', event.target.value)}
          />
          <Button type="button" variant="secondary" onClick={previewAddress}>
            Verificar dirección
          </Button>
          {preview && (
            <p className={styles.preview}>Ubicación encontrada: {preview.display_name}</p>
          )}
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
          <Button type="submit">Guardar perfil</Button>
        </form>
      </Card>
    </main>
  )
}
