import 'leaflet/dist/leaflet.css'

import { divIcon } from 'leaflet'
import { useEffect, useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet'

import { averageRating, type RestaurantPublic } from '../../data/restaurants.fixture'
import { distanceKm, formatDistance, isValidPoint, type GeoPoint } from '../../lib/geo'
import { OCCUPANCY_LABELS } from '../../lib/occupancy'
import { Button, IconStar } from '../ui'
import { MapPin } from './MapPin'
import { PIN_STATUS_BY_OCCUPANCY } from './pinStatus'
import { OccupancyMeter } from './OccupancyMeter'
import styles from './RestaurantMap.module.css'

const DEFAULT_CENTER: GeoPoint = { lat: -34.6037, lng: -58.3816 } // Buenos Aires
const POPUP_WIDTH = 280

type RestaurantMapProps = {
  restaurants: RestaurantPublic[]
  diner: GeoPoint | null
  onSelect: (restaurant: RestaurantPublic) => void
  selectedId?: string
  /** Router state for the "Ver detalle" link, so the detail can send the diner back here. */
  detailState?: unknown
}

function Recenter({ center }: { center: GeoPoint }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom())
  }, [map, center])
  return null
}

/** Brings the selected restaurant into view, e.g. after choosing it from the list. */
function FocusSelected({ lat, lng }: { lat?: number; lng?: number }) {
  const map = useMap()
  useEffect(() => {
    if (lat !== undefined && lng !== undefined) map.panTo([lat, lng])
  }, [map, lat, lng])
  return null
}

export function RestaurantMap({
  restaurants,
  diner,
  onSelect,
  selectedId,
  detailState,
}: RestaurantMapProps) {
  const selectedPoint = restaurants.find((restaurant) => restaurant.id === selectedId)?.location
  const center = useMemo(() => (isValidPoint(diner) ? diner : DEFAULT_CENTER), [diner])

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className={styles.map}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      <FocusSelected lat={selectedPoint?.lat} lng={selectedPoint?.lng} />

      {isValidPoint(diner) && (
        <CircleMarker
          center={[diner.lat, diner.lng]}
          radius={8}
          pathOptions={{
            color: 'var(--color-surface)',
            weight: 3,
            fillColor: 'var(--color-primary)',
            fillOpacity: 1,
          }}
        >
          {/* Below the dot: restaurant pins grow upwards from their own point. */}
          <Tooltip permanent direction="bottom" offset={[0, 8]}>
            Tu ubicación
          </Tooltip>
        </CircleMarker>
      )}

      {restaurants.map((restaurant, index) => {
        const selected = restaurant.id === selectedId
        const distKm = isValidPoint(diner) ? distanceKm(diner, restaurant.location) : null
        const rating = averageRating(restaurant)
        // Without occupancy data the pin shows only the name: nothing is said about it.
        const statusLabel = restaurant.occupancy
          ? `concurrencia ${OCCUPANCY_LABELS[restaurant.occupancy].toLowerCase()}`
          : undefined
        const markerLabel = statusLabel ? `${restaurant.name}, ${statusLabel}` : restaurant.name
        const icon = divIcon({
          className: styles.pinWrapper,
          html: renderToStaticMarkup(
            <MapPin
              name={restaurant.name}
              status={
                restaurant.occupancy ? PIN_STATUS_BY_OCCUPANCY[restaurant.occupancy] : undefined
              }
              statusLabel={statusLabel}
              selected={selected}
              index={index}
              interactive={false}
            />,
          ),
          iconSize: [0, 0],
          popupAnchor: [0, -44],
        })

        return (
          <Marker
            key={restaurant.id}
            position={[restaurant.location.lat, restaurant.location.lng]}
            icon={icon}
            alt={markerLabel}
            title={markerLabel}
            riseOnHover
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(restaurant) }}
          >
            <Popup
              className={styles.popup}
              minWidth={POPUP_WIDTH}
              maxWidth={POPUP_WIDTH}
              autoPanPaddingTopLeft={[56, 16]}
              autoPanPaddingBottomRight={[16, 16]}
            >
              <article className={styles.card}>
                <img
                  className={styles.cover}
                  src={restaurant.foto_url ?? restaurant.photo.cover}
                  alt=""
                  width={POPUP_WIDTH}
                  height={120}
                />
                <div className={styles.cardBody}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.popupTitle}>{restaurant.name}</h3>
                    {restaurant.priceTier && (
                      <span className={styles.tier} aria-label={`Precio ${restaurant.priceTier}`}>
                        {restaurant.priceTier}
                      </span>
                    )}
                  </div>
                  <p className={styles.popupMeta}>
                    {rating !== null && (
                      <span className={styles.stars}>
                        <IconStar className={styles.star} />
                        {rating.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                      </span>
                    )}
                    <span>{restaurant.cuisine}</span>
                  </p>
                  {restaurant.occupancy && (
                    <OccupancyMeter level={restaurant.occupancy} showLabel />
                  )}
                  <dl className={styles.facts}>
                    {restaurant.location.neighborhood && (
                      <>
                        <dt>Barrio</dt>
                        <dd>{restaurant.location.neighborhood}</dd>
                      </>
                    )}
                    {restaurant.location.address && (
                      <>
                        <dt>Dirección</dt>
                        <dd>{restaurant.location.address}</dd>
                      </>
                    )}
                    {distKm !== null && (
                      <>
                        <dt>Distancia</dt>
                        <dd>{formatDistance(distKm)}</dd>
                      </>
                    )}
                  </dl>
                  <Button
                    size="sm"
                    fullWidth
                    to={`/restaurantes/${restaurant.id}`}
                    linkState={detailState}
                  >
                    Ver detalle
                  </Button>
                </div>
              </article>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
