import { useCallback, useEffect, useState } from 'react'

import type { GeoPoint } from './geo'

export type GeolocationStatus = 'locating' | 'granted' | 'denied' | 'unavailable'

export type GeolocationState = {
  status: GeolocationStatus
  /** Last known position of the diner; null until granted, and forever if denied. */
  point: GeoPoint | null
}

/**
 * Asks the device for its current position (US-5, scenario 1).
 * When the browser has no geolocation or permission is denied, the state says so
 * and the map falls back to the default zone without distances (spec 002 edge case).
 */
export function useGeolocation(): GeolocationState & { retry: () => void } {
  const [state, setState] = useState<GeolocationState>(() => ({
    status: typeof navigator !== 'undefined' && navigator.geolocation ? 'locating' : 'unavailable',
    point: null,
  }))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : null
    if (!geolocation) return

    let cancelled = false
    geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return
        setState({
          status: 'granted',
          point: { lat: position.coords.latitude, lng: position.coords.longitude },
        })
      },
      (error) => {
        if (cancelled) return
        setState({
          status: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
          point: null,
        })
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState((current) => ({ status: 'locating', point: current.point }))
    setAttempt((current) => current + 1)
  }, [])

  return { ...state, retry }
}
