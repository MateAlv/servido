import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import {
  averageRating,
  fetchRestaurants,
  type RestaurantPublic,
} from '../../data/restaurants.fixture'
import { distanceKm, formatDistance, isValidPoint, type GeoPoint } from '../../lib/geo'
import { OCCUPANCY_REFRESH_MS } from '../../lib/occupancy'
import { useGeolocation } from '../../lib/useGeolocation'
import { LiveIndicator } from '../order'
import { Button, IconPin, IconStar } from '../ui'
import { OccupancyLegend } from './OccupancyLegend'
import { OccupancyMeter } from './OccupancyMeter'
import { PriceFilter } from './PriceFilter'
import { matchesPriceFilter, PRICE_TIERS, type PriceTier } from './priceFilter'
import { RestaurantMap } from './RestaurantMap'
import styles from './RestaurantExplorer.module.css'

/** The price filter lives in the URL (?precio=$$&precio=$$$), so it survives visiting a detail. */
const PRICE_PARAM = 'precio'

function tiersFromParams(params: URLSearchParams): PriceTier[] {
  const chosen = params.getAll(PRICE_PARAM)
  return PRICE_TIERS.filter((tier) => chosen.includes(tier))
}

function updatedAtLabel(at: number): string {
  return new Date(at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function byDistanceThenName(diner: GeoPoint | null) {
  return (a: RestaurantPublic, b: RestaurantPublic) =>
    isValidPoint(diner)
      ? distanceKm(diner, a.location) - distanceKm(diner, b.location)
      : a.name.localeCompare(b.name, 'es')
}

/**
 * Everything a diner needs to choose a restaurant: price filter, map with occupancy,
 * and the same restaurants as a list (US-5, US-7, US-9).
 */
export function RestaurantExplorer() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedTiers = tiersFromParams(searchParams)
  const { point: diner, status, retry } = useGeolocation()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const mapRef = useRef<HTMLDivElement>(null)

  const restaurantsQuery = useQuery({
    queryKey: ['restaurants', 'map'],
    queryFn: fetchRestaurants,
    // While the map stays open, occupancy refreshes by itself (US-5, S5).
    refetchInterval: OCCUPANCY_REFRESH_MS,
  })

  // Only restaurants with a usable location appear (spec 002, FR-011).
  const located = useMemo(
    () => (restaurantsQuery.data ?? []).filter((restaurant) => isValidPoint(restaurant.location)),
    [restaurantsQuery.data],
  )

  // The filter applies to the markers and to the list alike (FR-012).
  const visible = located
    .filter((restaurant) =>
      matchesPriceFilter(restaurant.priceTier, restaurant.menu.length > 0, selectedTiers),
    )
    .sort(byDistanceThenName(diner))

  const backHere = { from: `${location.pathname}${location.search}` }

  function changeTiers(tiers: PriceTier[]) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete(PRICE_PARAM)
        PRICE_TIERS.filter((tier) => tiers.includes(tier)).forEach((tier) =>
          next.append(PRICE_PARAM, tier),
        )
        return next
      },
      { replace: true },
    )
  }

  function showOnMap(restaurant: RestaurantPublic) {
    setSelectedId(restaurant.id)
    mapRef.current?.scrollIntoView({ block: 'nearest' })
  }

  const locationProblem = status === 'denied' || status === 'unavailable'

  return (
    <div className={styles.explorer}>
      <div className={styles.filters}>
        <div className={styles.panel}>
          <PriceFilter
            selectedTiers={selectedTiers}
            onChange={changeTiers}
            resultCount={restaurantsQuery.isSuccess ? visible.length : undefined}
          />
        </div>

        <div className={styles.status}>
          {restaurantsQuery.dataUpdatedAt > 0 && (
            <LiveIndicator>
              Actualizado {updatedAtLabel(restaurantsQuery.dataUpdatedAt)}
            </LiveIndicator>
          )}
          {status === 'locating' && <span className={styles.muted}>Detectando tu ubicación…</span>}
        </div>

        {locationProblem && (
          <div className={styles.notice}>
            <p>
              No pudimos usar tu ubicación, así que el mapa está centrado en Buenos Aires y no se
              muestran las distancias.
            </p>
            <Button size="sm" variant="secondary" onClick={retry}>
              Usar mi ubicación
            </Button>
          </div>
        )}

        {restaurantsQuery.isRefetchError && located.length > 0 && (
          <p className={styles.notice}>
            No pudimos actualizar la concurrencia. Puede estar desactualizada.
          </p>
        )}

        {restaurantsQuery.isPending && <p className={styles.muted}>Buscando restaurantes…</p>}

        {restaurantsQuery.isError && located.length === 0 && (
          <div className={styles.notice}>
            <p>No pudimos cargar los restaurantes. Intentá de nuevo en unos segundos.</p>
            <Button size="sm" variant="secondary" onClick={() => restaurantsQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
      </div>

      {visible.length > 0 && (
        <section className={styles.results} aria-labelledby="lista-restaurantes">
          <h2 id="lista-restaurantes" className={styles.listTitle}>
            {visible.length === 1 ? '1 restaurante' : `${visible.length} restaurantes`}
          </h2>
          <ul className={styles.list}>
            {visible.map((restaurant) => (
              <li
                key={restaurant.id}
                className={styles.item}
                data-selected={restaurant.id === selectedId || undefined}
              >
                <img
                  className={styles.thumb}
                  src={restaurant.foto_url ?? restaurant.photo.thumb}
                  alt=""
                  width={64}
                  height={64}
                  loading="lazy"
                />
                <div className={styles.itemHead}>
                  <h3 className={styles.itemName}>{restaurant.name}</h3>
                  <span className={styles.tier} aria-label={`Precio ${restaurant.priceTier}`}>
                    {restaurant.priceTier}
                  </span>
                </div>
                <p className={styles.itemMeta}>
                  {averageRating(restaurant) !== null && (
                    <span className={styles.stars}>
                      <IconStar className={styles.star} />
                      {averageRating(restaurant)?.toLocaleString('es-AR', {
                        maximumFractionDigits: 1,
                      })}{' '}
                      ·{' '}
                    </span>
                  )}
                  {restaurant.cuisine} · {restaurant.location.neighborhood}
                  {isValidPoint(diner) &&
                    ` · a ${formatDistance(distanceKm(diner, restaurant.location))}`}
                </p>
                <div className={styles.itemFoot}>
                  <OccupancyMeter level={restaurant.occupancy} />
                  <span className={styles.itemActions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<IconPin />}
                      onClick={() => showOnMap(restaurant)}
                    >
                      Ver en el mapa
                    </Button>
                    <Button size="sm" to={`/restaurantes/${restaurant.id}`} linkState={backHere}>
                      Ver detalle
                    </Button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {located.length > 0 && (
        <div ref={mapRef} className={styles.mapArea}>
          <RestaurantMap
            restaurants={visible}
            diner={diner}
            selectedId={selectedId}
            onSelect={(restaurant) => setSelectedId(restaurant.id)}
            detailState={backHere}
          />
          <div className={styles.legend}>
            <OccupancyLegend />
          </div>
        </div>
      )}
    </div>
  )
}
