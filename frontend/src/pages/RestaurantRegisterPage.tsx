import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { api } from '../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../api/errors'
import { Button, Card, PasswordField, TextField, useToast } from '../components/ui'
import { RedirectIfSignedIn } from '../components/access'
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
  const toast = useToast()
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [confirmationError, setConfirmationError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function fieldChange(name: keyof RestaurantFields) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [name]: event.target.value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (passwordConfirmation !== fields.password) {
      setConfirmationError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const { error } = await api.POST('/api/restaurantes', { body: fields })
      if (error) throw new Error(getApiErrorMessage(error, FALLBACK_ERROR))
      toast('¡Listo! La cuenta del restaurante está creada. Ingresá para seguir.', { tone: 'ok' })
      navigate('/ingresar?rol=restaurante', { state: { email: fields.email } })
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, FALLBACK_ERROR))
    } finally {
      setLoading(false)
    }
  }

  return (
    <RedirectIfSignedIn>
      <main className={styles.page}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <p className={styles.eyebrow}>Cuenta de restaurante</p>
            <h1 className={styles.title}>Sumá tu local</h1>
            <p className={styles.lead}>Recibí reservas con el pedido ya elegido.</p>
          </div>
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
            <PasswordField
              label="Contraseña *"
              value={fields.password}
              onChange={fieldChange('password')}
              hint="Entre 8 y 128 caracteres, con al menos una letra y un número."
              autoComplete="new-password"
              required
            />
            <PasswordField
              label="Confirmar contraseña *"
              value={passwordConfirmation}
              onChange={(event) => {
                setPasswordConfirmation(event.target.value)
                setConfirmationError('')
              }}
              error={confirmationError}
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
          <p className={styles.footer}>
            ¿Querés reservar? <Link to="/registrarme">Creá tu cuenta de comensal</Link>
          </p>
        </Card>
      </main>
    </RedirectIfSignedIn>
  )
}
