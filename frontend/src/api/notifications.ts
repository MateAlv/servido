import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type Notifications = components['schemas']['NotificationsResponse']

export async function fetchNotifications(): Promise<Notifications> {
  const { data, error, response } = await api.GET('/api/notificaciones', {
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) {
    throw new Error(getApiErrorMessage(error, 'No pudimos cargar tus avisos.'))
  }
  return data
}
