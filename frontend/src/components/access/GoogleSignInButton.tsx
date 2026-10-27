import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { dinerAccount, restaurantAccount, signIn, type Account } from '../../api/session'
import { Button } from '../ui'
import { GoogleButton } from './GoogleButton'
import { GoogleSignUpFeedback } from './GoogleSignUpFeedback'
import type { AccountRole } from './roles'
import { useGoogleSignUp } from './useGoogleSignUp'
import styles from './Access.module.css'

const SIGN_IN_FAILED = 'No pudimos ingresar con Google. Probá de nuevo.'

type GoogleSignInResult = { token: string; account: Account } | { status: number; message: string }

async function requestGoogleSignIn(
  role: AccountRole,
  credential: string,
): Promise<GoogleSignInResult> {
  if (role === 'diner') {
    const { data, error, response } = await api.POST('/api/auth/comensal/google', {
      body: { credential },
    })
    if (error || !data) {
      return { status: response.status, message: getApiErrorMessage(error, SIGN_IN_FAILED) }
    }
    return { token: data.access_token, account: dinerAccount(data.comensal) }
  }
  const { data, error, response } = await api.POST('/api/auth/restaurante/google', {
    body: { credential },
  })
  if (error || !data) {
    return { status: response.status, message: getApiErrorMessage(error, SIGN_IN_FAILED) }
  }
  return { token: data.access_token, account: restaurantAccount(data.restaurante) }
}

type GoogleSignInButtonProps = {
  role: AccountRole
  onSignedIn: (account: Account) => void
}

/**
 * "Iniciar sesión con Google" for diners (US-52) and restaurants (US-28). When the Google account
 * has no account of that role, it offers to create one with that same Google account: right here
 * for a diner (US-58), or in the restaurant form, which still needs its details (US-2 S5).
 */
export function GoogleSignInButton({ role, onSignedIn }: GoogleSignInButtonProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  // The credential of a Google account without an account of this role, kept to create one.
  const [unregistered, setUnregistered] = useState('')
  const signUp = useGoogleSignUp(onSignedIn)

  async function signInWithCredential(credential: string) {
    setError('')
    setUnregistered('')
    try {
      const result = await requestGoogleSignIn(role, credential)
      if ('message' in result) {
        if (result.status === 404) setUnregistered(credential)
        setError(result.message)
        return
      }
      signIn(queryClient, result.token, result.account)
      onSignedIn(result.account)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, SIGN_IN_FAILED))
    }
  }

  function createAccount() {
    if (role === 'restaurant') {
      navigate('/suma-tu-local', { state: { googleCredential: unregistered } })
      return
    }
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
          {role === 'diner' ? 'Crear cuenta con Google' : 'Registrar el restaurante con Google'}
        </Button>
      )}
      <GoogleSignUpFeedback signUp={signUp} />
    </div>
  )
}
