import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { api } from '../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../api/errors'
import { Button, Card, TextField } from '../components/ui'
import styles from './AuthPage.module.css'

const FALLBACK_ERROR = 'No pudimos crear la cuenta del restaurante.'

type RestaurantFields = {
  nombre: string
  email: string
  cuit: string
  telefono: string
  password: string
}

const EMPTY_FIELDS: RestaurantFields = {
  nombre: '',
  email: '',
  cuit: '',
  telefono: '',
  password: '',
}

export function RestaurantRegisterPage() {
  const navigate = useNavigate()
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function fieldChange(name: keyof RestaurantFields) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [name]: event.target.value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await api.POST('/api/restaurantes', { body: fields })
      if (error) throw new Error(getApiErrorMessage(error, FALLBACK_ERROR))
      navigate('/ingresar?rol=restaurante')
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, FALLBACK_ERROR))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1>Sumá tu local</h1>
        <p>Creá la cuenta de tu restaurante para recibir reservas en Servido!.</p>
        <form onSubmit={submit} noValidate>
          <TextField
            label="Nombre del restaurante *"
            value={fields.nombre}
            onChange={fieldChange('nombre')}
            autoComplete="organization"
            required
          />
          <TextField
            label="Email *"
            type="email"
            value={fields.email}
            onChange={fieldChange('email')}
            autoComplete="email"
            required
          />
          <TextField
            label="CUIT *"
            inputMode="numeric"
            value={fields.cuit}
            onChange={fieldChange('cuit')}
            hint="11 dígitos, con o sin guiones."
            required
          />
          <TextField
            label="Teléfono *"
            type="tel"
            value={fields.telefono}
            onChange={fieldChange('telefono')}
            autoComplete="tel"
            required
          />
          <TextField
            label="Contraseña *"
            type="password"
            value={fields.password}
            onChange={fieldChange('password')}
            hint="Entre 8 y 128 caracteres, con al menos una letra y un número."
            autoComplete="new-password"
            required
          />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth loading={loading}>
            Crear cuenta del restaurante
          </Button>
        </form>
        <p className={styles.footer}>
          ¿Ya tenés cuenta? <Link to="/ingresar?rol=restaurante">Ingresá</Link>
        </p>
      </Card>
    </main>
  )
}