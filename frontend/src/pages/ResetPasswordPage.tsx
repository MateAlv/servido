import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { getRequestErrorMessage } from '../api/errors'
import { checkRecoveryLink, resetPassword } from '../api/passwordRecovery'
import { Button, Card, PasswordField, Spinner } from '../components/ui'
import styles from './AuthPage.module.css'

const INVALID_LINK = 'Ese link no es válido. Pedí uno nuevo.'
const PASSWORD_HINT = 'Entre 8 y 128 caracteres, con al menos una letra y un número.'

type Role = 'diner' | 'restaurant'

/** Opened from the mailed link (US-31, US-46): sets a new password with the token of the link. */
export function ResetPasswordPage({ role = 'diner' }: { role?: Role }) {
  const restaurant = role === 'restaurant'
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [confirmationError, setConfirmationError] = useState('')
  const [changed, setChanged] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // A query, not an effect: React runs effects twice in development.
  const link = useQuery({
    queryKey: ['password-recovery-link', role, token],
    queryFn: () => checkRecoveryLink(token, role),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
  })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (confirmation !== password) {
      setConfirmationError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      setChanged(await resetPassword(token, password, role))
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, INVALID_LINK))
    } finally {
      setLoading(false)
    }
  }

  const signInPath = restaurant ? '/ingresar?rol=restaurante' : '/ingresar'
  const recoverPath = restaurant ? '/restaurante/recuperar' : '/recuperar'

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>
            {restaurant ? 'Cuenta de restaurante' : 'Cuenta de comensal'}
          </p>
          <h1 className={styles.title}>Elegí tu nueva contraseña</h1>
        </div>
        {changed && (
          <>
            <p className={styles.lead} role="status">
              {changed}
            </p>
            <p className={styles.footer}>
              <Link to={signInPath}>Ingresar con mi nueva contraseña</Link>
            </p>
          </>
        )}
        {!changed && token !== '' && link.isPending && (
          <p className={styles.lead} role="status">
            <Spinner /> Revisando el link…
          </p>
        )}
        {!changed && link.isSuccess && (
          <form onSubmit={submit} noValidate>
            <PasswordField
              label="Nueva contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={PASSWORD_HINT}
              autoComplete="new-password"
              required
            />
            <PasswordField
              label="Confirmar contraseña"
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value)
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
              Cambiar contraseña
            </Button>
          </form>
        )}
        {!changed && (token === '' || link.isError) && (
          <>
            <p className={styles.error} role="alert">
              {link.error?.message ?? INVALID_LINK}
            </p>
            <p className={styles.footer}>
              <Link to={recoverPath}>Pedir un link nuevo</Link>
            </p>
          </>
        )}
        <p className={styles.footer}>
          <Link to={signInPath}>Volver a ingresar</Link>
        </p>
      </Card>
    </main>
  )
}
