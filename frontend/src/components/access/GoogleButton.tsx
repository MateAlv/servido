import { useEffect, useRef, useState } from 'react'

import { GOOGLE_CLIENT_ID, loadGoogleIdentity } from '../../lib/google'
import styles from './Access.module.css'

const LOAD_FAILED = 'No pudimos cargar el botón de Google. Usá tu email.'
const BUTTON_MAX_WIDTH = 400

type GoogleButtonProps = {
  /** "Iniciar sesión con Google" or "Registrarse con Google". */
  text: 'signin_with' | 'signup_with'
  /** Receives the ID token once the person picks their Google account. */
  onCredential: (credential: string) => void
}

/**
 * Google's own button, drawn by Google's script (its brand rules don't allow redrawing it).
 * The ID token it hands back goes to the API, which checks it (spec 007).
 */
export function GoogleButton({ text, onCredential }: GoogleButtonProps) {
  const container = useRef<HTMLDivElement>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  // Google keeps the first callback it gets; this keeps it calling the latest props.
  const handleCredential = useRef(onCredential)

  useEffect(() => {
    handleCredential.current = onCredential
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
          context: text === 'signup_with' ? 'signup' : 'signin',
        })
        google.renderButton(parent, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'pill',
          locale: 'es',
          width: Math.min(parent.offsetWidth || BUTTON_MAX_WIDTH, BUTTON_MAX_WIDTH),
        })
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [text])

  return (
    <>
      <div ref={container} className={styles.googleButton} />
      {loadFailed && (
        <p className={styles.error} role="alert">
          {LOAD_FAILED}
        </p>
      )}
    </>
  )
}
