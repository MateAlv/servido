import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button, Card, PasswordField, TextField, useToast } from '../components/ui'
import { api } from '../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../api/errors'
import { RedirectIfSignedIn } from '../components/access'
import styles from './AuthPage.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [confirmationError, setConfirmationError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (passwordConfirmation !== password) {
      setConfirmationError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      const { error } = await api.POST('/api/comensales', {
        body: { nombre, email, password },
      })
      if (error) throw new Error(getApiErrorMessage(error, 'No pudimos crear tu cuenta.'))
      toast('¡Listo! Tu cuenta está creada. Te mandamos un mail para verificar tu email.', {
        tone: 'ok',
      })
      navigate('/ingresar?rol=comensal', { state: { email } })
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'No pudimos crear tu cuenta.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <RedirectIfSignedIn>
      <main className={styles.page}>
        <Card className={styles.card}>
          <div className={styles.head}>
            <p className={styles.eyebrow}>Cuenta de comensal</p>
            <h1 className={styles.title}>Creá tu cuenta</h1>
            <p className={styles.lead}>Reservá y elegí tu comida antes de llegar.</p>
          </div>
          <form onSubmit={submit} noValidate>
            <TextField
              label="Nombre *"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              autoComplete="name"
              required
            />
            <TextField
              label="Email *"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            <PasswordField
              label="Contraseña *"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              Crear cuenta
            </Button>
          </form>
          <p className={styles.footer}>
            ¿Ya tenés cuenta? <Link to="/ingresar?rol=comensal">Ingresá</Link>
          </p>
          <p className={styles.footer}>
            ¿Tenés un restaurante? <Link to="/suma-tu-local">Sumá tu local</Link>
          </p>
        </Card>
      </main>
    </RedirectIfSignedIn>
  )
}
