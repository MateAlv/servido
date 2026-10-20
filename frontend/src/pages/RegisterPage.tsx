import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button, Card, TextField } from '../components/ui'
import { api } from '../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../api/errors'
import styles from './AuthPage.module.css'

export function RegisterPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await api.POST('/api/comensales', {
        body: { nombre, email, password },
      })
      if (error) throw new Error(getApiErrorMessage(error, 'No pudimos crear tu cuenta.'))
      navigate('/ingresar')
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, 'No pudimos crear tu cuenta.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1>Creá tu cuenta</h1>
        <p>Ingresá tus datos para empezar a disfrutar Servido!.</p>
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
          <TextField
            label="Contraseña *"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
            Crear cuenta
          </Button>
        </form>
        <p className={styles.footer}>
          ¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link>
        </p>
      </Card>
    </main>
  )
}