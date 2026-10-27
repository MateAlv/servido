import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { api } from '../../api/client'
import { getApiErrorMessage, getRequestErrorMessage } from '../../api/errors'
import { dinerAccount, signIn, type Account } from '../../api/session'

const SIGN_UP_FAILED = 'No pudimos crear tu cuenta con Google. Probá de nuevo.'
// The API asks for the name with this exact message when Google didn't give one (US-58 S3).
export const NAME_MISSING = 'Ingresá tu nombre para terminar de crear tu cuenta.'

export type GoogleSignUp = ReturnType<typeof useGoogleSignUp>

/** Creates the diner account from a Google ID token and opens its session (US-58). */
export function useGoogleSignUp(onSignedIn: (account: Account) => void) {
  const queryClient = useQueryClient()
  const [credential, setCredential] = useState('')
  const [needsName, setNeedsName] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createAccount(googleCredential: string, nombre?: string) {
    setCredential(googleCredential)
    setError('')
    setEmailTaken(false)
    setLoading(true)
    try {
      const { data, error, response } = await api.POST('/api/comensales/google', {
        body: { credential: googleCredential, nombre },
      })
      if (error || !data) {
        const message = getApiErrorMessage(error, SIGN_UP_FAILED)
        setNeedsName(message === NAME_MISSING)
        if (message !== NAME_MISSING) setError(message)
        setEmailTaken(response.status === 409)
        return
      }
      setNeedsName(false)
      const account = dinerAccount(data.comensal)
      signIn(queryClient, data.access_token, account)
      onSignedIn(account)
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, SIGN_UP_FAILED))
    } finally {
      setLoading(false)
    }
  }

  return {
    createAccount,
    completeWithName: (nombre: string) => createAccount(credential, nombre),
    needsName,
    emailTaken,
    error,
    loading,
  }
}
