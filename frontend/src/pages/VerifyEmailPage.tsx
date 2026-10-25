import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'

import { api } from '../api/client'
import { getApiErrorMessage } from '../api/errors'
import { ACCOUNT_QUERY_KEY } from '../api/session'
import { Card, Spinner } from '../components/ui'
import styles from './AuthPage.module.css'

const INVALID_LINK = 'No pudimos verificar tu email: el enlace no es válido o venció.'

async function verifyEmail(token: string): Promise<string> {
  const { data, error } = await api.POST('/api/comensales/verificacion', { body: { token } })
  if (error || !data) throw new Error(getApiErrorMessage(error, INVALID_LINK))
  return data.detail
}

/** Opened from the mailed link (US-51): checks the token and says how it went. */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const queryClient = useQueryClient()
  // A query, not an effect: React runs effects twice in development, and the second call
  // would report "ya estaba verificado".
  const verification = useQuery({
    queryKey: ['email-verification', token],
    queryFn: () => verifyEmail(token),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    // The signed-in account, if any, now shows as verified.
    if (verification.isSuccess) void queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY })
  }, [verification.isSuccess, queryClient])

  return (
    <main className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Verificación de email</h1>
        {verification.isPending && token !== '' && (
          <p className={styles.lead} role="status">
            <Spinner /> Verificando tu email…
          </p>
        )}
        {verification.isSuccess && (
          <p className={styles.lead} role="status">
            {verification.data}
          </p>
        )}
        {(token === '' || verification.isError) && (
          <p className={styles.error} role="alert">
            {verification.error?.message ?? INVALID_LINK} Si ya ingresaste, podés pedir otro mail
            desde el inicio.
          </p>
        )}
        <p className={styles.footer}>
          <Link to="/">Ir al inicio</Link>
        </p>
      </Card>
    </main>
  )
}
