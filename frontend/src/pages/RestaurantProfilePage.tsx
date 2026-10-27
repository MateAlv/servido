import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { Button, Card, IconArrowLeft, TextField, useToast } from '../components/ui'
import { configurationApi, type RestaurantProfile } from '../api/restaurantConfiguration'
import styles from './RestaurantProfilePage.module.css'

const dietaryRestrictions = [
  ['sin_tacc', 'Sin TACC'],
  ['vegetariano', 'Vegetariano'],
  ['vegano', 'Vegano'],
] as const

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
  const [photo, setPhoto] = useState<File>()
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    configurationApi
      .getProfile()
      .then(setProfile)
      .catch((requestError: Error) => setError(requestError.message))
  }, [])

  function change<Field extends keyof RestaurantProfile>(
    field: Field,
    value: RestaurantProfile[Field],
  ) {
    setProfile((current) => ({ ...current, [field]: value }))
    if (field === 'direccion') {
      setPreview(undefined)
      setProfile((current) => ({ ...current, latitud: null, longitud: null }))
    }
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
    if (!profile.nombre.trim()) {
      setError('Ingresá el nombre del restaurante.')
      return
    }
    if (profile.direccion?.trim() && !preview && profile.latitud === null) {
      setError('Verificá la dirección antes de guardar.')
      return
    }
    try {
      let next = preview
        ? { ...profile, latitud: preview.latitude, longitud: preview.longitude }
        : profile
      if (photo) {
        const uploaded = await configurationApi.uploadPhoto(photo)
        next = { ...next, foto_url: uploaded.foto_url }
      }
      setProfile(await configurationApi.updateProfile(next))
      toast('Guardaste los datos de tu local.', { tone: 'ok' })
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
          <fieldset className={styles.fieldset}>
            <legend>Restricciones alimenticias</legend>
            {dietaryRestrictions.map(([value, label]) => (
              <label key={value} className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={profile.restricciones_tags?.includes(value) ?? false}
                  onChange={() => {
                    const current = profile.restricciones_tags ?? []
                    change(
                      'restricciones_tags',
                      current.includes(value)
                        ? current.filter((item) => item !== value)
                        : [...current, value],
                    )
                  }}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className={styles.fileLabel} htmlFor="foto">
            Foto del restaurante
          </label>
          <input
            id="foto"
            type="file"
            accept="image/jpeg,image/png"
            onChange={(event) => {
              const selected = event.target.files?.[0]
              setPhoto(selected)
              if (selected) setProfile((current) => ({ ...current, foto_url: URL.createObjectURL(selected) }))
            }}
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
