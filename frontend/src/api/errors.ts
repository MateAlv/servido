/** The message to show for an API error: the server's Spanish text, or the fallback. */
export function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    const detail = error.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
  }
  return fallback
}

export const CONNECTION_ERROR_MESSAGE =
  'No pudimos conectarnos con Servido!. Probá de nuevo en un momento.'

/**
 * The message for an error thrown while calling the API. A request that never got an answer
 * (no network, server down) throws a TypeError with the browser's English text, so it is replaced.
 */
export function getRequestErrorMessage(requestError: unknown, fallback: string) {
  if (requestError instanceof TypeError) return CONNECTION_ERROR_MESSAGE
  if (requestError instanceof Error) return requestError.message
  return fallback
}
