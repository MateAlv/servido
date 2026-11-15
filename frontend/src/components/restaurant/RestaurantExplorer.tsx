import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { fetchOpenRestaurantIds, fetchRestaurants } from '../../api/restaurants'
import {
  averageRating,
  reviewCountLabel,
  type RestaurantPublic,
} from '../../data/restaurants.fixture'
import { cx } from '../../lib/cx'
import { distanceKm, formatDistance, isValidPoint, type GeoPoint } from '../../lib/geo'
import { OCCUPANCY_REFRESH_MS } from '../../lib/occupancy'
import { formatRating } from '../../lib/rating'
import { useGeolocation } from '../../lib/useGeolocation'
import { LiveIndicator } from '../order'
import { Button, Drawer, IconFilter, IconPin, IconStar, Spinner } from '../ui'
import { ActiveFilters } from './ActiveFilters'
import { FilterPanel } from './FilterPanel'
import { OccupancyMeter } from './OccupancyMeter'
import { RestaurantMap } from './RestaurantMap'
import {
  activeFilterCount,
  detailSearch,
  matchesSearchFilters,
  NO_FILTERS,
  readSearchFilters,
  writeSearchFilters,
  type SearchFilters,
} from './searchFilters'
import styles from './RestaurantExplorer.module.css'

function updatedAtLabel(at: number): string {
  return new Date(at).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

function byDistanceThenName(diner: GeoPoint | null) {
  return (a: RestaurantPublic, b: RestaurantPublic) =>
    isValidPoint(diner)
      ? distanceKm(diner, a.location) - distanceKm(diner, b.location)
      : a.name.localeCompare(b.name, 'es')
}

function restaurantCount(count: number): string {
  return count === 1 ? '1 restaurante' : `${count} restaurantes`
}

/**
 * Everything a diner needs to choose a restaurant: the search filters, the map and the same
 * restaurants as a list (US-5, US-7, US-9, US-33 and spec 027). The filters live in the URL
 * (`?precio=$$&rating=4&restriccion=sin_tacc&dia=…&hora=…&personas=6`), so they survive a visit
 * to a detail, a reload and a shared link. Occupancy appears only where there is data.
 */
export function RestaurantExplorer() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { filters, pastDay } = readSearchFilters(searchParams)
  const { point: diner, status, retry } = useGeolocation()
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // A new key mounts the panel again, so its day and time controls start from the URL.
  const [panelKey, setPanelKey] = useState(0)
  // A shared link with a day that already passed: the day is dropped and the diner is told.
  const [pastDayNotice, setPastDayNotice] = useState(pastDay)
  const mapRef = useRef<HTMLDivElement>(null)

  const restaurantsQuery = useQuery({
    queryKey: ['restaurants', 'map'],
    queryFn: fetchRestaurants,
    // While the map stays open, occupancy refreshes by itself (US-5, S5).
    refetchInterval: OCCUPANCY_REFRESH_MS,
  })

  const time = filters.time
  const openQuery = useQuery({
    queryKey: ['restaurants', 'open', time?.day, time?.from, time?.to],
    queryFn: () => (time ? fetchOpenRestaurantIds(time.day, time.from, time.to) : []),
    enabled: time !== null,
  })
  const openIds = useMemo(
    () => (openQuery.data ? new Set(openQuery.data) : undefined),
    [openQuery.data],
  )
  const timePending = time !== null && openQuery.isPending
  const timeFailed = time !== null && openQuery.isError

  useEffect(() => {
    if (!pastDay) return
    setSearchParams((current) => writeSearchFilters(current, readSearchFilters(current).filters), {
      replace: true,
    })
  }, [pastDay, setSearchParams])

  // Only restaurants with a usable location appear (spec 002-elegir-restaurante, FR-011).
  const located = useMemo(
    () => (restaurantsQuery.data ?? []).filter((restaurant) => isValidPoint(restaurant.location)),
    [restaurantsQuery.data],
  )

  // Every active filter applies at once, to the markers and to the list alike (F6, FR-006).
  const visible =
    timePending || timeFailed
      ? []
      : located
          .filter((restaurant) => matchesSearchFilters(restaurant, filters, openIds))
          .sort(byDistanceThenName(diner))
  const filterCount = activeFilterCount(filters)
  const resultsKnown = restaurantsQuery.isSuccess && !timePending && !timeFailed

  // The live update time and its failure notice only make sense if some occupancy is shown.
  const hasOccupancy = located.some((restaurant) => restaurant.occupancy)

  const backHere = { from: `${location.pathname}${location.search}` }
  const toDetail = (restaurant: RestaurantPublic) =>
    `/restaurantes/${restaurant.id}${detailSearch(filters)}`

  function changeFilters(next: SearchFilters) {
    setPastDayNotice(false)
    setSearchParams((current) => writeSearchFilters(current, next), { replace: true })
  }

  function clearFilters() {
    changeFilters(NO_FILTERS)
    setPanelKey((key) => key + 1)
  }

  function openDrawer() {
    setPanelKey((key) => key + 1)
    setDrawerOpen(true)
  }

  function showOnMap(restaurant: RestaurantPublic) {
    setSelectedId(restaurant.id)
    mapRef.current?.scrollIntoView({ block: 'nearest' })
  }

  const locationProblem = status === 'denied' || status === 'unavailable'

  return (
    <div className={styles.explorer}>
      <div className={styles.filters}>
        <div className={styles.toolbar}>
          <Button
            variant="secondary"
            icon={<IconFilter />}
            aria-haspopup="dialog"
            aria-label={
              filterCount > 0
                ? `Filtros (${filterCount === 1 ? '1 activo' : `${filterCount} activos`})`
                : undefined
            }
            onClick={openDrawer}
          >
            Filtros
            {filterCount > 0 && <span className={styles.badge}>{filterCount}</span>}
          </Button>
          <ActiveFilters
            filters={filters}
            onChange={(next) => {
              changeFilters(next)
              setPanelKey((key) => key + 1)
            }}
          />
        </div>

        {pastDayNotice && (
          <p className={styles.notice} role="status">
            El día del enlace ya pasó, así que no lo aplicamos. Elegí otro en «Filtros».
          </p>
        )}

        <div className={styles.status}>
          {hasOccupancy && restaurantsQuery.dataUpdatedAt > 0 && (
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

        {restaurantsQuery.isRefetchError && hasOccupancy && (
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

        {timePending && restaurantsQuery.isSuccess && (
          <p className={styles.loading} role="status">
            <Spinner /> Buscando restaurantes con ese horario…
          </p>
        )}

        {timeFailed && (
          <div className={styles.notice} role="alert">
            <p>No pudimos consultar los horarios de los restaurantes. Intentá de nuevo.</p>
            <Button size="sm" variant="secondary" onClick={() => openQuery.refetch()}>
              Reintentar
            </Button>
          </div>
        )}

        {/* The map and the list are never empty without saying why (FR-008, SC-003). */}
        <div role="status">
          {resultsKnown && visible.length === 0 && (
            <div className={styles.empty}>
              {filterCount > 0 ? (
                <>
                  <p>Ningún restaurante cumple los filtros elegidos.</p>
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    Quitar filtros
                  </Button>
                </>
              ) : (
                <p>No hay restaurantes para mostrar.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {visible.length > 0 && (
        <section className={styles.results} aria-labelledby="lista-restaurantes">
          <h2 id="lista-restaurantes" className={styles.listTitle}>
            {restaurantCount(visible.length)}
          </h2>
          <ul className={styles.list}>
            {visible.map((restaurant) => (
              <li
                key={restaurant.id}
                className={styles.item}
                data-selected={restaurant.id === selectedId || undefined}
              >
                {restaurant.foto_url || restaurant.photo ? (
                  <img
                    className={styles.thumb}
                    src={restaurant.foto_url ?? restaurant.photo?.thumb}
                    alt=""
                    width={64}
                    height={64}
                    loading="lazy"
                  />
                ) : (
                  <span className={cx(styles.thumb, styles.monogram)} aria-hidden="true">
                    {restaurant.name.charAt(0)}
                  </span>
                )}
                <div className={styles.itemHead}>
                  <h3 className={styles.itemName}>{restaurant.name}</h3>
                  {restaurant.priceTier && (
                    <span className={styles.tier} aria-label={`Precio ${restaurant.priceTier}`}>
                      {restaurant.priceTier}
                    </span>
                  )}
                </div>
                <p className={styles.itemMeta}>
                  {averageRating(restaurant) !== null && (
                    <span className={styles.itemRating}>
                      <IconStar className={styles.star} />
                      {formatRating(averageRating(restaurant) ?? 0)}
                      <span className="visually-hidden"> de 5 estrellas</span> ·{' '}
                      {reviewCountLabel(restaurant)}
                    </span>
                  )}
                  {[
                    restaurant.cuisine,
                    restaurant.location.neighborhood,
                    isValidPoint(diner) &&
                      `a ${formatDistance(distanceKm(diner, restaurant.location))}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className={styles.itemFoot}>
                  {restaurant.occupancy && <OccupancyMeter level={restaurant.occupancy} />}
                  <span className={styles.itemActions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<IconPin />}
                      onClick={() => showOnMap(restaurant)}
                    >
                      Ver en el mapa
                    </Button>
                    <Button size="sm" to={toDetail(restaurant)} linkState={backHere}>
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
            detailSearch={detailSearch(filters)}
            detailState={backHere}
          />
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filtros"
        footer={
          <>
            <p className="visually-hidden" role="status">
              {resultsKnown &&
                (visible.length === 0
                  ? 'Ningún restaurante cumple los filtros.'
                  : `${restaurantCount(visible.length)} ${visible.length === 1 ? 'cumple' : 'cumplen'} los filtros.`)}
            </p>
            <Button
              variant="ghost"
              aria-label="Limpiar filtros"
              disabled={filterCount === 0}
              onClick={clearFilters}
            >
              Limpiar
            </Button>
            <Button onClick={() => setDrawerOpen(false)}>
              {resultsKnown && visible.length > 0
                ? `Ver ${restaurantCount(visible.length)}`
                : 'Ver resultados'}
            </Button>
          </>
        }
      >
        <FilterPanel key={panelKey} filters={filters} onChange={changeFilters} />
      </Drawer>
    </div>
  )
}
