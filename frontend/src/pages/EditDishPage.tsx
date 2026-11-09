import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router'

import {
  dishKeys,
  DishRequestError,
  editDish,
  fetchManagedDish,
  refreshDishQueries,
  STALE_DISH_MESSAGE,
  useDishSessionError,
  type ManagedDish,
} from '../api/dishes'
import { getRequestErrorMessage } from '../api/errors'
import { useAccount } from '../api/session'
import { Button, Card, TextField } from '../components/ui'
import styles from './EditDishPage.module.css'

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

export function EditDishPage() {
  const { data: account, isPending } = useAccount()
  const { dishId = '' } = useParams()
  if (isPending) return <main className={styles.page}>Cargando…</main>
  if (account?.rol !== 'restaurant') return <Navigate to="/ingresar" replace />
  return <EditDish accountId={account.id} dishId={dishId} />
}

function EditDish({ accountId, dishId }: { accountId: string; dishId: string }) {
  const query = useQuery({
    queryKey: dishKeys.detail(accountId, dishId),
    queryFn: () => fetchManagedDish(dishId),
    retry: false,
  })
  useDishSessionError(query.error)
  return (
    <main className={styles.page}>
      <Link to="/restaurante/menu">← Volver al menú</Link>
      <h1>Editar plato</h1>
      {query.isPending ? (
        <p role="status">Cargando plato…</p>
      ) : query.error ? (
        <p role="alert">{getRequestErrorMessage(query.error, 'No pudimos cargar el plato.')}</p>
      ) : (
        <DishForm key={dishId} dish={query.data} accountId={accountId} />
      )}
    </main>
  )
}

function DishForm({ dish: initialDish, accountId }: { dish: ManagedDish; accountId: string }) {
  const [dish] = useState(initialDish)
  const client = useQueryClient()
  const navigate = useNavigate()
  const [fields, setFields] = useState<Record<string, string>>({})
  const [photoAction, setPhotoAction] = useState<'keep' | 'replace' | 'remove'>('keep')
  const mutation = useMutation({
    mutationFn: (form: FormData) => editDish(dish.id, form),
    onSuccess: async (result) => {
      await refreshDishQueries(client, accountId)
      navigate('/restaurante/menu', {
        state: {
          notice: result.changed_since_open
            ? STALE_DISH_MESSAGE
            : 'Guardamos los cambios del plato.',
        },
      })
    },
    onError: (error) => {
      if (error instanceof DishRequestError) setFields(error.fields)
    },
  })
  useDishSessionError(mutation.error)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending) return
    const form = new FormData(event.currentTarget)
    const errors: Record<string, string> = {}
    const name = String(form.get('name') ?? '').trim()
    const price = String(form.get('price') ?? '')
    if (!name) errors.name = 'Ingresá el nombre del plato.'
    if (!form.get('category')) errors.category = 'Elegí una categoría válida.'
    if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0 || Number(price) > 99999999.99)
      errors.price = 'Ingresá un precio mayor a cero, con hasta dos decimales.'
    const minutes = String(form.get('prep_time_minutes') ?? '')
    if (minutes && (!/^\d+$/.test(minutes) || Number(minutes) < 1 || Number(minutes) > 2147483647))
      errors.prep_time_minutes = 'Ingresá minutos enteros entre 1 y 2147483647.'
    const photoInput = event.currentTarget.elements.namedItem('photo') as HTMLInputElement | null
    const photo = photoInput?.files?.[0]
    if (
      photoAction === 'replace' &&
      (!photo ||
        !photo.size ||
        !['image/jpeg', 'image/png'].includes(photo.type) ||
        photo.size > 5 * 1024 * 1024)
    )
      errors.photo = 'Elegí una foto JPG o PNG de hasta 5 MB.'
    setFields(errors)
    if (Object.keys(errors).length) return
    if (photoAction === 'replace' && photo) form.set('photo', photo)
    else form.delete('photo')
    form.set('expected_revision', String(dish.revision))
    mutation.mutate(form)
  }
  return (
    <Card>
      <form className={styles.form} onSubmit={submit}>
        <TextField
          name="name"
          label="Nombre *"
          defaultValue={dish.name}
          required
          maxLength={150}
          error={fields.name}
        />
        <TextField
          name="description"
          label="Descripción"
          defaultValue={dish.description ?? ''}
          maxLength={2000}
          error={fields.description}
        />
        <label htmlFor="dish-category">Categoría *</label>
        <select
          id="dish-category"
          name="category"
          defaultValue={dish.category}
          required
          aria-invalid={Boolean(fields.category)}
          aria-describedby={fields.category ? 'category-error' : undefined}
        >
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fields.category && (
          <p id="category-error" role="alert">
            {fields.category}
          </p>
        )}
        <TextField
          name="price"
          label="Precio en pesos argentinos *"
          type="number"
          required
          min="0.01"
          max="99999999.99"
          step="0.01"
          defaultValue={dish.price}
          error={fields.price}
        />
        <fieldset>
          <legend>Restricciones alimenticias</legend>
          {restrictions.map(([value, label]) => (
            <label key={value}>
              <input
                type="checkbox"
                name="dietary_restrictions"
                value={value}
                defaultChecked={dish.dietary_restrictions.includes(value)}
              />{' '}
              {label}
            </label>
          ))}
        </fieldset>
        <TextField
          name="prep_time_minutes"
          label="Tiempo de preparación (minutos)"
          type="number"
          min="1"
          max="2147483647"
          step="1"
          defaultValue={dish.prep_time_minutes ?? ''}
          error={fields.prep_time_minutes}
        />
        {dish.photo_url && (
          <img className={styles.photo} src={dish.photo_url} alt={`Foto actual de ${dish.name}`} />
        )}
        <label htmlFor="photo-action">Foto</label>
        <select
          id="photo-action"
          name="photo_action"
          value={photoAction}
          onChange={(event) => setPhotoAction(event.target.value as typeof photoAction)}
        >
          <option value="keep">Conservar foto actual</option>
          <option value="replace">Reemplazar foto</option>
          <option value="remove">Quitar foto</option>
        </select>
        {photoAction === 'replace' && (
          <TextField
            name="photo"
            label="Nueva foto (JPG o PNG, hasta 5 MB)"
            type="file"
            accept="image/jpeg,image/png"
            error={fields.photo}
          />
        )}
        {mutation.error && (
          <p role="alert">
            {getRequestErrorMessage(mutation.error, 'No pudimos guardar el plato.')}
          </p>
        )}
        <div className={styles.actions}>
          <Button to="/restaurante/menu" variant="secondary">
            Cancelar
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  )
}
