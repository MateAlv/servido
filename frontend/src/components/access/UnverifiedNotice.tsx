import { useState } from 'react'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { sessionHeaders, type Account } from '../../api/session'
import { Button } from '../ui'
import styles from './UnverifiedNotice.module.css'

const RESEND_FAILED = 'No pudimos enviar el mail. Probá de nuevo en un momento.'

/** Reminds a diner to verify their email and lets them ask for a new link (US-51, FR-012). */
export function UnverifiedNotice({ account }: { account: Account }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (account.rol !== 'diner' || account.email_verificado) return null

  async function resend() {
    setMessage('')
    setError('')
    setSending(true)
    try {
      const { data, error } = await api.POST('/api/comensales/verificacion/reenvio', {
        headers: sessionHeaders(),
      })
      if (error || !data) throw new Error(getApiErrorMessage(error, RESEND_FAILED))
      setMessage(data.detail)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, RESEND_FAILED))
    } finally {
      setSending(false)
    }
  }

  return (
    <section className={styles.notice} aria-label="Verificación de email">
      <p className={styles.text}>
        Verificá tu email para poder hacer pedidos. Te mandamos un enlace a{' '}
        <strong>{account.email}</strong>.
      </p>
      <Button size="sm" variant="secondary" loading={sending} onClick={resend}>
        Reenviar mail de verificación
      </Button>
      <p className={styles.status} role="status">
        {message}
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
