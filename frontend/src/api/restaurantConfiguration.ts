const TOKEN_KEY = 'servido-access-token'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token =
    typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN_KEY)
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const body = (await response.json()) as T | { detail?: string }
  if (!response.ok) {
    const detail = (body as { detail?: string | { message?: string } }).detail
    const message =
      typeof detail === 'string'
        ? detail
        : detail?.message ?? 'No pudimos guardar los cambios.'
    throw new Error(message)
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
