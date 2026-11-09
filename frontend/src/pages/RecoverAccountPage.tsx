import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { getRequestErrorMessage } from '../api/errors'
import { requestRecovery } from '../api/passwordRecovery'
import { Button, Card, TextField } from '../components/ui'
import styles from './AuthPage.module.css'

const FAILED = 'No pudimos enviar el correo. Probá de nuevo.'

/** US-31: asks for the email and requests a recovery link. */
export function RecoverAccountPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      setSent(await requestRecovery(email))
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, FAILED))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>Cuenta de comensal</p>
          <h1 className={styles.title}>Recuperá tu cuenta</h1>
          <p className={styles.lead}>
            Escribí el email con el que te registraste y te mandamos un link para elegir una
            contraseña nueva.
          </p>
        </div>
        {sent ? (
          <p className={styles.lead} role="status">
            {sent} Si no llega en unos minutos, revisá el correo no deseado.
          </p>
        ) : (
          <form onSubmit={submit} noValidate>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth loading={loading}>
              Enviar instrucciones
            </Button>
          </form>
        )}
        <p className={styles.footer}>
          <Link to="/ingresar">Volver a ingresar</Link>
        </p>
      </Card>
    </main>
  )
}
