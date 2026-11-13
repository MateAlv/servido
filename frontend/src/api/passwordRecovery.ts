import { api } from './client'
import { getApiErrorMessage } from './errors'

const CONNECTION_FALLBACK = 'No pudimos contactar a Servido!. Probá de nuevo en un momento.'

type RecoveryRole = 'diner' | 'restaurant'

/** Asks for a recovery mail (US-31 S1, US-46 S1). The API answers the same for any email. */
export async function requestRecovery(
  email: string,
  role: RecoveryRole = 'diner',
): Promise<string> {
  const { data, error } =
    role === 'restaurant'
      ? await api.POST('/api/restaurantes/recuperacion', { body: { email } })
      : await api.POST('/api/comensales/recuperacion', { body: { email } })
  if (error || !data) throw new Error(getApiErrorMessage(error, CONNECTION_FALLBACK))
  return data.detail
}

/** Checks the token of the mailed link before showing the form (US-31 S3, S6, S7, US-46 S4). */
export async function checkRecoveryLink(
  token: string,
  role: RecoveryRole = 'diner',
): Promise<string> {
  const { data, error } =
    role === 'restaurant'
      ? await api.POST('/api/restaurantes/recuperacion/validacion', { body: { token } })
      : await api.POST('/api/comensales/recuperacion/validacion', { body: { token } })
  if (error || !data) throw new Error(getApiErrorMessage(error, CONNECTION_FALLBACK))
  return data.detail
}

/** Sets the new password with the token of the link (US-31 S3, S4, US-46 S4, S5). */
export async function resetPassword(
  token: string,
  password: string,
  role: RecoveryRole = 'diner',
): Promise<string> {
  const { data, error } =
    role === 'restaurant'
      ? await api.PUT('/api/restaurantes/recuperacion', { body: { token, password } })
      : await api.PUT('/api/comensales/recuperacion', { body: { token, password } })
  if (error || !data) throw new Error(getApiErrorMessage(error, CONNECTION_FALLBACK))
  return data.detail
}
