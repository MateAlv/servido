/** Reviews of finished reservations (US-24, US-27, US-50, spec 014; `contracts/reviews-api.md`)
 * and the restaurant's replies (US-42, spec 025). */
import { api } from './client'
import { getApiErrorMessage, SessionExpiredError } from './errors'
import type { components } from './schema'
import { sessionHeaders } from './session'

export type PendingReviews = components['schemas']['PendingReviewsResponse']
export type PendingReview = components['schemas']['PendingReview']
export type RestaurantReviews = components['schemas']['RestaurantReviewsResponse']
export type RestaurantReview = components['schemas']['RestaurantReview']
export type ReviewDraft = components['schemas']['ReviewRequest']
export type ReviewReply = components['schemas']['ReviewReplyResponse']

export type PublishFailure =
  | { kind: 'session' }
  /** Already reviewed, or no longer reviewable: the list of pending reviews is out of date. */
  | { kind: 'conflict'; message: string }
  | { kind: 'failed'; message: string }

const LOAD_FAILED = 'No pudimos cargar las reseñas.'
const PUBLISH_FAILED = 'No pudimos publicar tu reseña. Probá de nuevo.'
const REPLY_FAILED = 'No pudimos guardar tu respuesta. Probá de nuevo.'

export async function fetchPendingReviews(): Promise<PendingReviews> {
  const { data, error, response } = await api.GET('/api/reviews/pending', {
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}

/** Publishes the review; `null` when it went well. */
export async function publishReview(
  reservationId: string,
  draft: ReviewDraft,
): Promise<PublishFailure | null> {
  const { error, response } = await api.POST('/api/reservations/{reservation_id}/review', {
    params: { path: { reservation_id: reservationId } },
    body: draft,
    headers: sessionHeaders(),
  })
  if (response.ok) return null
  if (response.status === 401) return { kind: 'session' }
  const message = getApiErrorMessage(error, PUBLISH_FAILED)
  return response.status === 409 ? { kind: 'conflict', message } : { kind: 'failed', message }
}

export async function fetchRestaurantReviews(offset: number): Promise<RestaurantReviews> {
  const { data, error, response } = await api.GET('/api/restaurant/reviews', {
    params: { query: { offset } },
    headers: sessionHeaders(),
  })
  if (response.status === 401) throw new SessionExpiredError()
  if (error || !data) throw new Error(getApiErrorMessage(error, LOAD_FAILED))
  return data
}

/** The reply could not be saved. A conflict means the list is out of date: the review was
 * replied from another tab, or it left Opiniones. */
export type ReplyFailure = PublishFailure

function replyFailure(status: number, error: unknown): ReplyFailure {
  if (status === 401) return { kind: 'session' }
  const message = getApiErrorMessage(error, REPLY_FAILED)
  return status === 409 ? { kind: 'conflict', message } : { kind: 'failed', message }
}

/** Publishes the restaurant's reply to a review; `null` when it went well. */
export async function publishReply(reviewId: string, text: string): Promise<ReplyFailure | null> {
  const { error, response } = await api.POST('/api/restaurant/reviews/{review_id}/reply', {
    params: { path: { review_id: reviewId } },
    body: { text },
    headers: sessionHeaders(),
  })
  return response.ok ? null : replyFailure(response.status, error)
}

/** Replaces the text of the restaurant's reply; `null` when it went well. */
export async function editReply(reviewId: string, text: string): Promise<ReplyFailure | null> {
  const { error, response } = await api.PUT('/api/restaurant/reviews/{review_id}/reply', {
    params: { path: { review_id: reviewId } },
    body: { text },
    headers: sessionHeaders(),
  })
  return response.ok ? null : replyFailure(response.status, error)
}
