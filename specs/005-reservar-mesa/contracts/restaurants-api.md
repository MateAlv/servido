# Bookable restaurants API contract (enabler for US-11 and US-13)

Base path: `/api`. Public reads: no session needed, because the map and the detail are public (spec 002). Team decision of 28/10 (D4): the diner reaches real restaurants through these endpoints, shown next to the test restaurants of spec 002, and only these can be booked.

A restaurant is **bookable** when it has coordinates (`latitud`, `longitud`), at least one active shift and at least one available table group (spec 004). Others are not listed and answer `404`.

New code, so field names follow the glossary in English; the values come from the profile the restaurant loads in spec 004 (US-6).

## `GET /restaurants`

```json
{
  "restaurants": [
    {
      "id": "6f1c…",
      "name": "La Esquina de Palermo",
      "description": "Parrilla clásica porteña.",
      "cuisine": "Parrilla",
      "price_tier": "$$",
      "dietary_restrictions": ["Sin TACC"],
      "address": "Calle de Palermo 123",
      "neighborhood": "Palermo",
      "lat": -34.5885,
      "lng": -58.4265,
      "photo_url": "/media/restaurants/….jpg"
    }
  ]
}
```

- Ordered by `name`. Nullable profile fields come back as `null`.
- `price_tier` is the restaurant's `rango_precio` when it is one of `$`, `$$`, `$$$`, `$$$$`, and `null` otherwise (spec 004 stores free text up to 10 characters).
- The frontend maps each one into the shape the map, the list and the detail already use (`RestaurantPublic` in `restaurants.fixture.ts`). What the database doesn't have yet is shown as missing, never invented:
  - **Price** (US-7): the tier comes from `price_tier` instead of `averageSpendPerPerson`. A restaurant with `price_tier: null` only appears when no price filter is selected.
  - **Occupancy** (US-5): `null`, shown as «Sin datos» in the pin, the list and the detail, which need that neutral state.
  - **Rating and reviews** (US-24): none; the detail says so.
  - **Photo**: the placeholder when `photo_url` is `null`.
- These are changes to spec 002 (US-5, US-7, US-9, US-33), recorded there as the decision D4 of 28/10.

## `GET /restaurants/{restaurant_id}`

The same fields plus the menu the restaurant loaded with spec 006 (US-12), for the detail (US-9 shows the menu) and the header of the reservation page.

```json
{
  "id": "6f1c…",
  "name": "La Esquina de Palermo",
  "…": "…",
  "menu": [
    {
      "id": "d03b…",
      "name": "Bife de chorizo",
      "description": "Con papas rústicas.",
      "category": "principales",
      "price": "18500.00",
      "photo_url": null,
      "dietary_restrictions": []
    }
  ]
}
```

- `404` with `{"detail": "No encontramos ese restaurante."}` when the id is unknown or the restaurant is not bookable.
- `price` is a decimal string (money is never a float).
