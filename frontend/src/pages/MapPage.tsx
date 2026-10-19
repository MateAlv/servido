import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { Button, Reveal } from '../components/ui'
import { LiveIndicator } from '../components/order'
import { RestaurantMap } from '../components/restaurant'
import { fetchRestaurants, type RestaurantPublic } from '../data/restaurants.fixture'
import { isValidPoint } from '../lib/geo'
import { OCCUPANCY_REFRESH_MS } from '../lib/occupancy'
import { useGeolocation } from '../lib/useGeolocation'
import styles from './MapPage.module.css'

function updatedAtLabel(at: number): string {
  return new Date(at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export function MapPage() {
  const { point: diner, status, retry } = useGeolocation()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)

  const restaurantsQuery = useQuery({
    queryKey: ['restaurants', 'map'],
    queryFn: fetchRestaurants,
    // While the map stays open, occupancy refreshes by itself (US-5, S5).
    refetchInterval: OCCUPANCY_REFRESH_MS,
  })

  // Only restaurants with a usable location appear on the map (spec 002, FR-011).
  const restaurants = useMemo(
    () => (restaurantsQuery.data ?? []).filter((restaurant) => isValidPoint(restaurant.location)),
    [restaurantsQuery.data],
  )

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <div>
          <Reveal>
            <h1 className={styles.title}>Mapa de restaurantes</h1>
          </Reveal>
          <Reveal delay={60}>
            <p className={styles.subtitle}>
              Cada restaurante aparece con su concurrencia (bajo / medio / alto). Tocá uno para ver
              la distancia desde tu posición y su detalle.
            </p>
          </Reveal>
        </div>
        <div className={styles.actions}>
          {restaurantsQuery.dataUpdatedAt > 0 && (
            <LiveIndicator>
              Actualizado {updatedAtLabel(restaurantsQuery.dataUpdatedAt)}
            </LiveIndicator>
          )}
          <Button variant="secondary" size="sm" to="/">
            Volver al inicio
          </Button>
          {status === 'denied' || status === 'unavailable' ? (
            <Button size="sm" onClick={retry}>
              Habilitar ubicación
            </Button>
          ) : null}
        </div>
      </header>

      {status === 'locating' && <p className={styles.notice}>Detectando tu ubicación…</p>}

      {(status === 'denied' || status === 'unavailable') && (
        <p className={styles.notice}>
          No pudimos usar tu ubicación, así que el mapa está centrado en Buenos Aires y no se
          muestran las distancias. Habilitá la ubicación en tu navegador para verlas.
        </p>
      )}

      {restaurantsQuery.isRefetchError && restaurants.length > 0 && (
        <p className={styles.notice}>
          No pudimos actualizar la concurrencia. Puede estar desactualizada.
        </p>
      )}

      {restaurantsQuery.isPending && <p className={styles.notice}>Buscando restaurantes…</p>}

      {restaurantsQuery.isError && restaurants.length === 0 && (
        <div className={styles.noticeRow}>
          <p className={styles.notice}>
            No pudimos cargar los restaurantes del mapa. Intentá de nuevo en unos segundos.
          </p>
          <Button size="sm" variant="secondary" onClick={() => restaurantsQuery.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {!restaurantsQuery.isPending && restaurants.length === 0 && !restaurantsQuery.isError && (
        <p className={styles.notice}>
          Todavía no hay restaurantes para mostrar. El registro de restaurantes se implementa en la
          spec 004.
        </p>
      )}

      {restaurants.length > 0 && (
        <RestaurantMap
          restaurants={restaurants}
          diner={diner}
          selectedId={selectedId}
          onSelect={(restaurant: RestaurantPublic) => setSelectedId(restaurant.id)}
        />
      )}
    </main>
  )
}
