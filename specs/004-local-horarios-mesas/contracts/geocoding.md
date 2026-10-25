# Geocoding contract

The geocoder is an internal service boundary around OpenStreetMap Nominatim,
selected by [ADR 0003](../../../docs/decisions/0003-maps-leaflet-openstreetmap.md).

## Request

```text
address: nonblank string
```

The adapter sends a single Nominatim search request with the address, JSON
format, an identifying User-Agent, and the repository's configured locale.
Requests are rate-limited to at most one per second.

## Success

```json
{
  "display_name": "normalized address returned by Nominatim",
  "latitude": -34.6037,
  "longitude": -58.3816
}
```

The adapter validates numeric ranges before returning the preview. The caller
may show it on the map and must send the selected coordinates with the profile
save. Geocoding only resolves the address; it does not process `foto_url`,
which is an independently entered profile URL.

## Failure

An empty Nominatim result or an unusable response is a user-visible
address-not-found error. The profile is not saved. Network failures are
reported as an explicit service error rather than silently storing an
unverified address.
