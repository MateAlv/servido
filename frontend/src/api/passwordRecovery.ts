import { api } from './client'
import { getApiErrorMessage } from './errors'

const CONNECTION_FALLBACK = 'No pudimos contactar a Servido!. Probá de nuevo en un momento.'

/** Asks for a recovery mail (US-31 S1). The API answers the same for any email (S8). */
export async function requestRecovery(email: string): Promise<string> {
  const { data, error } = await api.POST('/api/comensales/recuperacion', { body: { email } })
  if (error || !data) throw new Error(getApiErrorMessage(error, CONNECTION_FALLBACK))
  return data.detail
}

/** Checks the token of the mailed link before showing the form (US-31 S3, S6, S7). */
export async function checkRecoveryLink(token: string): Promise<string> {
  const { data, error } = await api.POST('/api/comensales/recuperacion/validacion', {
    body: { token },
  })
  if (error || !data) throw new Error(getApiErrorMessage(error, CONNECTION_FALLBACK))
  return data.detail
}

/** Sets the new password with the token of the link (US-31 S3, S4). */
export async function resetPassword(token: string, password: string): Promise<string> {
  const { data, error } = await api.PUT('/api/comensales/recuperacion', {
    body: { token, password },
  })
  if (error || !data) throw new Error(getApiErrorMessage(error, CONNECTION_FALLBACK))
  return data.detail
}
