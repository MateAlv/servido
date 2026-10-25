import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { signIn, type Account } from '../../api/session'
import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from '../../lib/google'
import styles from './Access.module.css'

const SIGN_IN_FAILED = 'No pudimos ingresar con Google. Probá de nuevo.'
const LOAD_FAILED = 'No pudimos cargar el ingreso con Google. Ingresá con tu email.'
const BUTTON_MAX_WIDTH = 400

type GoogleSignInButtonProps = {
  onSignedIn: (account: Account) => void
}

/**
 * Google's own "Sign in with Google" button for diners (US-52). Google hands back an ID token,
 * which the API checks before opening the diner's session.
 */
export function GoogleSignInButton({ onSignedIn }: GoogleSignInButtonProps) {
  const queryClient = useQueryClient()
  const container = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')
  const [noAccount, setNoAccount] = useState(false)
  // Google keeps the first callback it gets; this keeps it calling the latest props.
  const handleCredential = useRef<(credential: string) => void>(() => {})

  async function signInWithCredential(credential: string) {
    setError('')
    setNoAccount(false)
    try {
      const { data, error, response } = await api.POST('/api/auth/comensal/google', {
        body: { credential },
      })
      if (error || !data) {
        setNoAccount(response.status === 404)
        setError(getApiErrorMessage(error, SIGN_IN_FAILED))
        return
      }
      const { comensal } = data
      const account: Account = {
        rol: 'diner',
        id: comensal.id,
        nombre: comensal.nombre ?? null,
        email: comensal.email,
        email_verificado: comensal.email_verificado,
      }
      signIn(queryClient, data.access_token, account)
      onSignedIn(account)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, SIGN_IN_FAILED))
    }
  }

  useEffect(() => {
    handleCredential.current = signInWithCredential
  })

  useEffect(() => {
    let cancelled = false
    loadGoogleIdentity()
      .then((google) => {
        const parent = container.current
        if (cancelled || !parent) return
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => handleCredential.current(credential),
          ux_mode: 'popup',
          context: 'signin',
        })
        google.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          locale: 'es',
          width: Math.min(parent.offsetWidth || BUTTON_MAX_WIDTH, BUTTON_MAX_WIDTH),
        })
      })
      .catch(() => {
        if (!cancelled) setError(LOAD_FAILED)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className={styles.google}>
      <div ref={container} className={styles.googleButton} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
          {noAccount && (
            <>
              {' '}
              <Link to="/registrarme">Creá tu cuenta</Link>
            </>
          )}
        </p>
      )}
    </div>
  )
}
