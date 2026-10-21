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

import type { RestaurantPublic } from '../../data/restaurants.fixture'
import { distanceKm, formatDistance, isValidPoint, type GeoPoint } from '../../lib/geo'
import { OCCUPANCY_LABELS } from '../../lib/occupancy'
import { Button } from '../ui'
import { MapPin, type PinStatus } from './MapPin'
import { OccupancyMeter, type OccupancyLevel } from './OccupancyMeter'
import styles from './RestaurantMap.module.css'

const DEFAULT_CENTER: GeoPoint = { lat: -34.6037, lng: -58.3816 } // Buenos Aires

const PIN_STATUS: Record<OccupancyLevel, PinStatus> = {
  low: 'available',
  medium: 'few',
  high: 'full',
}

type RestaurantMapProps = {
  restaurants: RestaurantPublic[]
  diner: GeoPoint | null
  onSelect: (restaurant: RestaurantPublic) => void
  selectedId?: string
}

function Recenter({ center }: { center: GeoPoint }) {
  const map = useMap()
  useEffect(() => {
    map.setView([center.lat, center.lng], map.getZoom())
  }, [map, center])
  return null
}

export function RestaurantMap({ restaurants, diner, onSelect, selectedId }: RestaurantMapProps) {
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
          <Tooltip permanent direction="top" offset={[0, -8]}>
            Tu ubicación
          </Tooltip>
        </CircleMarker>
      )}

      {restaurants.map((restaurant, index) => {
        const selected = restaurant.id === selectedId
        const distKm = isValidPoint(diner) ? distanceKm(diner, restaurant.location) : null
        const icon = divIcon({
          className: styles.pinWrapper,
          html: renderToStaticMarkup(
            <MapPin
              name={restaurant.name}
              label={OCCUPANCY_LABELS[restaurant.occupancy]}
              status={PIN_STATUS[restaurant.occupancy]}
              selected={selected}
              index={index}
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
            alt={`${restaurant.name}, ${restaurant.location.neighborhood}`}
            title={restaurant.name}
            riseOnHover
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{ click: () => onSelect(restaurant) }}
          >
            <Popup className={styles.popup} maxWidth={280}>
              <h3 className={styles.popupTitle}>{restaurant.name}</h3>
              <div className={styles.popupMeta}>
                <span>{restaurant.cuisine}</span> · <span>{restaurant.priceTier}</span>
                <OccupancyMeter level={restaurant.occupancy} showLabel />
              </div>
              <div className={styles.popupRow}>
                <span className={styles.popupLabel}>Barrio</span>
                <span>{restaurant.location.neighborhood}</span>
              </div>
              <div className={styles.popupRow}>
                <span className={styles.popupLabel}>Dirección</span>
                <span>{restaurant.location.address}</span>
              </div>
              {distKm !== null && (
                <div className={styles.popupRow}>
                  <span className={styles.popupLabel}>Distancia</span>
                  <span>{formatDistance(distKm)}</span>
                </div>
              )}
              <div className={styles.popupActions}>
                <Button size="sm" to={`/restaurantes/${restaurant.id}`}>
                  Ver detalle
                </Button>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
