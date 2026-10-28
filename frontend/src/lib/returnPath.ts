/**
 * Where to go after signing in: `?volver=` when it is a path of this site (e.g. the review of a
 * reservation whose session expired, spec 005), otherwise the home. Never another domain.
 */
export function returnPath(params: URLSearchParams): string {
  const volver = params.get('volver')
  if (!volver?.startsWith('/')) return '/'
  // The URL parser resolves tricks like `/\tevil.com` the way the browser would.
  const target = new URL(volver, window.location.origin)
  if (target.origin !== window.location.origin) return '/'
  const path = target.pathname + target.search + target.hash
  // Dot segments can resolve to `//host`, which a router would read as another site.
  return /^\/(?![/\\])/.test(path) ? path : '/'
}

/** Keeps `?volver=` when moving between the sign-in and sign-up pages. */
export function withReturnPath(path: string, params: URLSearchParams): string {
  const volver = params.get('volver')
  if (!volver) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}volver=${encodeURIComponent(volver)}`
}
