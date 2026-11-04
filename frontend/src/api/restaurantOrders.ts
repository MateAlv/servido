import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type RestaurantOrder = components['schemas']['RestaurantOrderResponse']
export type RestaurantOrders = components['schemas']['RestaurantOrdersResponse']

const LOAD_FAILED = 'No pudimos consultar los pedidos. Probá de nuevo.'

export async function fetchCurrentShiftOrders(): Promise<RestaurantOrders> {
  const { data, error, response } = await api.GET('/api/restaurante/pedidos/turno-actual', {
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}

export async function fetchRestaurantOrder(orderId: string): Promise<RestaurantOrder> {
  const { data, error, response } = await api.GET('/api/restaurante/pedidos/{order_id}', {
    params: { path: { order_id: orderId } },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}
