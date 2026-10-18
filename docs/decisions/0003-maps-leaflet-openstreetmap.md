# 0003 — Maps with Leaflet and OpenStreetMap

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

US-5 (map of restaurants) is in Sprint 1 and US-6 needs to turn an address into coordinates. Google Maps requires a billing account; risk 7 of the risk register already lists OpenStreetMap as the fallback.

## Decision

Use Leaflet (`react-leaflet`) with OpenStreetMap tiles for maps, and OpenStreetMap's Nominatim for geocoding addresses.

## Consequences

- No billing account or API key.
- OpenStreetMap's usage policies apply: attribution on the map, and at most one Nominatim request per second with an identifying User-Agent. Geocode once when the restaurant saves its address, never on every page view.
- Distances in the specs are straight-line distances, computed in code (haversine).
