import { sessionHeaders } from './session'

export type Closure = {
  id: string
  date: string
  start_time: string | null
  end_time: string | null
  all_day: boolean
  created_at: string
}
export type AffectedReservation = {
  reservation_id: string
  date: string
  start_time: string
  end_time: string
  party_size: number
}
export class ClosureWarningError extends Error {
  readonly reservations: AffectedReservation[]
  constructor(reservations: AffectedReservation[]) {
    super('Hay reservas confirmadas en ese horario.')
    this.reservations = reservations
  }
}
async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...sessionHeaders(), ...init?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = body.detail
    if (response.status === 409 && typeof detail === 'object' && detail.reservations) {
      throw new ClosureWarningError(detail.reservations)
    }
    throw new Error(
      typeof detail === 'string' ? detail : (detail?.message ?? 'No pudimos guardar el bloqueo.'),
    )
  }
  return body
}
export const fetchClosures = async () =>
  (await request('/restaurante/bloqueos')).closures as Closure[]
export const createClosure = (payload: object) =>
  request('/restaurante/bloqueos', {
    method: 'POST',
    body: JSON.stringify(payload),
  }) as Promise<Closure>
export const deleteClosure = (id: string) =>
  request(`/restaurante/bloqueos/${id}`, { method: 'DELETE' })
