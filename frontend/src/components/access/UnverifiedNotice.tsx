import { useState } from 'react'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { sessionHeaders, type Account } from '../../api/session'
import { Button } from '../ui'
import styles from './UnverifiedNotice.module.css'

const RESEND_FAILED = 'No pudimos enviar el mail. Probá de nuevo en un momento.'

/** Reminds a diner (US-51) or a restaurant (US-44) to verify their email and resends the link. */
export function UnverifiedNotice({ account }: { account: Account }) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  if (account.email_verificado) return null

  const restaurant = account.rol === 'restaurant'

  async function resend() {
    setMessage('')
    setError('')
    setSending(true)
    try {
      const { data, error } = restaurant
        ? await api.POST('/api/restaurantes/verificacion/reenvio', {
            headers: sessionHeaders(),
          })
        : await api.POST('/api/comensales/verificacion/reenvio', {
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
        {restaurant
          ? 'Verificá tu email para publicar tu restaurante en Servido!. Te mandamos un enlace a '
          : 'Verificá tu email para confirmar pedidos. Te mandamos un enlace a '}
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
