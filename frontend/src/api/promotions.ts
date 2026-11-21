/** Promociones del restaurante autenticado (spec 028, US-48; `contracts/promotions-api.md`). */
import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type Promotion = components['schemas']['PromotionResponse']
export type PromotionList = components['schemas']['PromotionListResponse']
export type PromotionCreate = components['schemas']['PromotionCreateRequest']
export type PromotionPayload = components['schemas']['PromotionPayload']
export type PromotionPolicy = components['schemas']['PromotionPolicyRequest']
export type PromotionState = components['schemas']['PromotionStateRequest']

const LOAD_FAILED = 'No pudimos cargar las promociones.'
const SAVE_FAILED = 'No pudimos guardar la promoción. Probá de nuevo.'

export async function fetchPromotions(): Promise<PromotionList> {
  const { data, error, response } = await api.GET('/api/restaurant/promotions', {
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}

export async function createPromotion(payload: PromotionCreate): Promise<Promotion> {
  const { data, error, response } = await api.POST('/api/restaurant/promotions', {
    body: payload,
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, SAVE_FAILED))
  return data
}

export async function updatePromotion(id: string, payload: PromotionPayload): Promise<Promotion> {
  const { data, error, response } = await api.PUT('/api/restaurant/promotions/{promotion_id}', {
    params: { path: { promotion_id: id } },
    body: payload,
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, SAVE_FAILED))
  return data
}

export async function updatePolicy(stackPromotions: boolean): Promise<boolean> {
  const { data, error, response } = await api.PUT('/api/restaurant/promotions/policies', {
    body: { stack_promotions: stackPromotions },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, 'No pudimos guardar la política.'))
  return data.stack_promotions
}

export async function changePromotionState(id: string, active: boolean): Promise<Promotion> {
  const { data, error, response } = await api.PATCH('/api/restaurant/promotions/{promotion_id}', {
    params: { path: { promotion_id: id } },
    body: { active },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, SAVE_FAILED))
  return data
}
