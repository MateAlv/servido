import type { SeatingArea } from '../lib/seating'

const TOKEN_KEY = 'servido-access-token'

function token(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

/** A confirmed reservation that a change to the tables would leave without a table (US-10 S3). */
export type BookedReservation = { date: string; start_time: string; party_size: number }

/** The restaurant tried to remove or shrink tables that future reservations hold (409). */
export class BookedTablesError extends Error {
  readonly reservations: BookedReservation[]

  constructor(message: string, reservations: BookedReservation[]) {
    super(message)
    this.reservations = reservations
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...init?.headers,
    },
  })
  const body = (await response.json()) as
    T | { detail?: string | { message?: string; reservations?: BookedReservation[] } }
  if (!response.ok) {
    const detail = (
      body as { detail?: string | { message?: string; reservations?: BookedReservation[] } }
    ).detail
    if (response.status === 409 && typeof detail === 'object' && detail.reservations) {
      throw new BookedTablesError(detail.message ?? '', detail.reservations)
    }
    throw new Error(
      typeof detail === 'string' ? detail : (detail?.message ?? 'No pudimos guardar los cambios.'),
    )
  }
  return body as T
}

async function uploadRequest<T>(path: string, form: FormData): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: 'POST',
    headers: token() ? { Authorization: `Bearer ${token()}` } : {},
    body: form,
  })
  const body = (await response.json()) as T | { detail?: string }
  if (!response.ok) {
    const detail = (body as { detail?: string }).detail
    throw new Error(typeof detail === 'string' ? detail : 'No pudimos cargar la imagen.')
  }
  return body as T
}

export type RestaurantProfile = {
  nombre: string
  descripcion: string | null
  tipo_cocina: string | null
  rango_precio: string | null
  foto_url: string | null
  restricciones_tags: string[] | null
  direccion: string | null
  latitud: number | null
  longitud: number | null
}

export type OpeningShift = {
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

export type TableGroup = {
  capacity: number
  quantity: number
  seating_area: SeatingArea
  available: boolean
  free_quantity?: number
}

export const configurationApi = {
  getProfile: () => request<RestaurantProfile>('/restaurante/perfil'),
  updateProfile: (profile: RestaurantProfile) =>
    request<RestaurantProfile>('/restaurante/perfil', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  uploadPhoto: (photo: File) => {
    const form = new FormData()
    form.append('foto', photo)
    return uploadRequest<{ foto_url: string }>('/restaurante/perfil/foto', form)
  },
  geocode: (address: string) =>
    request<{ display_name: string; latitude: number; longitude: number }>(
      '/restaurante/perfil/geocodificar',
      { method: 'POST', body: JSON.stringify({ address }) },
    ),
  getHours: () => request<OpeningShift[]>('/restaurante/horarios'),
  updateHours: (hours: OpeningShift[]) =>
    request<OpeningShift[]>('/restaurante/horarios', {
      method: 'PUT',
      body: JSON.stringify(hours),
    }),
  getTables: () => request<TableGroup[]>('/restaurante/mesas'),
  updateTables: (tables: TableGroup[]) =>
    request<TableGroup[]>('/restaurante/mesas', {
      method: 'PUT',
      body: JSON.stringify(tables),
    }),
}
