/** US-34 management operations; US-12 creation/list contracts remain compatible. */
import { useEffect } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'

import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders, signOut } from './session'

export type ManagedDish = components['schemas']['DishManagementResponse']
export type OwnedDish = components['schemas']['DishResponse']
type EditBody = components['schemas']['Body_edit_dish_api_restaurant_dishes__dish_id__put']

export const dishKeys = {
  list: (accountId: string) => ['dishes', accountId] as const,
  detail: (accountId: string, dishId: string) => ['dishes', accountId, dishId] as const,
}
export const STALE_DISH_MESSAGE =
  'El plato había cambiado desde que lo abriste. Guardamos tus cambios.'

export class DishRequestError extends Error {
  fields: Record<string, string> = {}
  constructor(error: unknown) {
    super(getApiErrorMessage(error, 'No pudimos guardar los cambios. Probá de nuevo.'))
    if (error && typeof error === 'object' && 'detail' in error && Array.isArray(error.detail)) {
      for (const item of error.detail) {
        if (Array.isArray(item.loc) && typeof item.msg === 'string') {
          this.fields[String(item.loc.at(-1))] = item.msg
        }
      }
    }
  }
}

function readResult<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.response.status === 401) throw new SessionExpiredError()
  if (result.error || !result.response.ok) throw new DishRequestError(result.error)
  return result.data as T
}

export async function fetchOwnedDishes() {
  return readResult(await api.GET('/api/restaurantes/me/platos', { headers: sessionHeaders() }))
}
export async function fetchManagedDish(dishId: string) {
  return readResult(
    await api.GET('/api/restaurant/dishes/{dish_id}', {
      params: { path: { dish_id: dishId } },
      headers: sessionHeaders(),
    }),
  )
}
export async function editDish(dishId: string, form: FormData) {
  return readResult(
    await api.PUT('/api/restaurant/dishes/{dish_id}', {
      params: { path: { dish_id: dishId } },
      headers: sessionHeaders(),
      // Generated binary fields use string. The serializer sends the actual browser File parts.
      body: form as unknown as EditBody,
      bodySerializer: () => form,
    }),
  )
}
export async function changeDishAvailability(dishId: string, available: boolean) {
  const current = await fetchManagedDish(dishId)
  return readResult(
    await api.PATCH('/api/restaurant/dishes/{dish_id}/availability', {
      params: { path: { dish_id: dishId } },
      headers: sessionHeaders(),
      body: { available, expected_revision: current.revision },
    }),
  )
}
export async function removeDish(dishId: string) {
  readResult(
    await api.DELETE('/api/restaurant/dishes/{dish_id}', {
      params: { path: { dish_id: dishId } },
      headers: sessionHeaders(),
    }),
  )
}
export async function refreshDishQueries(client: QueryClient, accountId: string) {
  await Promise.all([
    client.invalidateQueries({ queryKey: dishKeys.list(accountId) }),
    client.invalidateQueries({ queryKey: ['restaurants'] }),
  ])
}
export function useDishSessionError(error: unknown) {
  const client = useQueryClient()
  useEffect(() => {
    if (error instanceof SessionExpiredError) signOut(client)
  }, [client, error])
}
