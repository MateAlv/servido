/**
 * Where to go after signing in: `?volver=` when it is a path of this site (e.g. the review of a
 * reservation whose session expired, spec 005), otherwise the home. Never another domain.
 */
export function returnPath(params: URLSearchParams): string {
  const volver = params.get('volver')
  return volver?.startsWith('/') && !volver.startsWith('//') ? volver : '/'
}
