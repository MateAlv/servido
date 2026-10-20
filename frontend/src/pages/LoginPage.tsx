import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button, Card, TextField } from '../components/ui'
import { api } from '../api/client'
import styles from './AuthPage.module.css'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    const detail = error.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
  }
  return fallback
}

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await api.POST('/api/auth/comensal', {
        body: { email, password },
      })
      if (error || !data) {
        throw new Error(getApiErrorMessage(error, 'Credenciales inválidas'))
      }
      sessionStorage.setItem('servido-access-token', data.access_token)
      navigate('/')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1>Ingresá a tu cuenta</h1>
        <p>Usá tu email para continuar.</p>
        <form onSubmit={submit} noValidate>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth loading={loading}>
            Ingresar
          </Button>
        </form>
        <p className={styles.footer}>
          ¿Todavía no tenés cuenta? <Link to="/registrarme">Registrate</Link>
        </p>
      </Card>
    </main>
  )
}
