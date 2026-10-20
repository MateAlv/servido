/**
 * Geographic helpers for the restaurant map (US-5).
 * Distances are straight-line, as decided in ADR 0003 and assumed by spec 002.
 */

export type GeoPoint = {
  lat: number
  lng: number
}

const EARTH_RADIUS_KM = 6371

/** Great-circle (haversine) distance in kilometres between two points. */
export function distanceKm(from: GeoPoint, to: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** "850 m" under a kilometre, otherwise kilometres with the Argentine decimal comma. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`
}

/** True when a point has coordinates Leaflet can place on the map (spec 002, FR-011). */
export function isValidPoint(point: GeoPoint | null): point is GeoPoint {
  return (
    point !== null &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    point.lat >= -90 &&
    point.lat <= 90 &&
    point.lng >= -180 &&
    point.lng <= 180
  )
}
