import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { dinerAccount, restaurantAccount, signIn, type Account } from '../../api/session'
import { Button, PasswordField, TextField } from '../ui'
import type { AccountRole } from './roles'
import styles from './Access.module.css'

const INVALID_CREDENTIALS = 'Credenciales inválidas'

async function requestSignIn(
  role: AccountRole,
  email: string,
  password: string,
): Promise<{ token: string; account: Account }> {
  if (role === 'diner') {
    const { data, error } = await api.POST('/api/auth/comensal', { body: { email, password } })
    if (error || !data) throw new Error(getApiErrorMessage(error, INVALID_CREDENTIALS))
    return { token: data.access_token, account: dinerAccount(data.comensal) }
  }
  const { data, error } = await api.POST('/api/auth/restaurante', { body: { email, password } })
  if (error || !data) throw new Error(getApiErrorMessage(error, INVALID_CREDENTIALS))
  return { token: data.access_token, account: restaurantAccount(data.restaurante) }
}

type AccessFormProps = {
  role: AccountRole
  onSignedIn: (account: Account) => void
  onRegister: () => void
  /** Prefills the email, e.g. right after creating the account. */
  initialEmail?: string
}

/** Email and password for one kind of account. */
export function AccessForm({ role, onSignedIn, onRegister, initialEmail = '' }: AccessFormProps) {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, account } = await requestSignIn(role, email, password)
      signIn(queryClient, token, account)
      onSignedIn(account)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, INVALID_CREDENTIALS))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />
      <PasswordField
        label="Contraseña"
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
      <Button variant="secondary" fullWidth onClick={onRegister}>
        Crear una cuenta
      </Button>
    </form>
  )
}
