import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { dinerAccount, signIn, type Account } from '../../api/session'
import { Button } from '../ui'
import { GoogleButton } from './GoogleButton'
import { GoogleSignUpFeedback } from './GoogleSignUpFeedback'
import { useGoogleSignUp } from './useGoogleSignUp'
import styles from './Access.module.css'

const SIGN_IN_FAILED = 'No pudimos ingresar con Google. Probá de nuevo.'

type GoogleSignInButtonProps = {
  onSignedIn: (account: Account) => void
}

/**
 * "Iniciar sesión con Google" for diners (US-52). When the Google account has no diner, it
 * offers to create one with that same Google account (US-58).
 */
export function GoogleSignInButton({ onSignedIn }: GoogleSignInButtonProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState('')
  // The credential of a Google account without a diner, kept to create the account with it.
  const [unregistered, setUnregistered] = useState('')
  const signUp = useGoogleSignUp(onSignedIn)

  async function signInWithCredential(credential: string) {
    setError('')
    setUnregistered('')
    try {
      const { data, error, response } = await api.POST('/api/auth/comensal/google', {
        body: { credential },
      })
      if (error || !data) {
        if (response.status === 404) setUnregistered(credential)
        setError(getApiErrorMessage(error, SIGN_IN_FAILED))
        return
      }
      const account = dinerAccount(data.comensal)
      signIn(queryClient, data.access_token, account)
      onSignedIn(account)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, SIGN_IN_FAILED))
    }
  }

  function createAccount() {
    setError('')
    void signUp.createAccount(unregistered)
  }

  return (
    <div className={styles.google}>
      <GoogleButton text="signin_with" onCredential={signInWithCredential} />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {error && unregistered && (
        <Button variant="secondary" fullWidth onClick={createAccount}>
          Crear cuenta con Google
        </Button>
      )}
      <GoogleSignUpFeedback signUp={signUp} />
    </div>
  )
}
