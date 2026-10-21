# Implementation plan: choose a restaurant (frontend)

Scope: spec 002, US-5 (map), US-7 (price filter), US-9 (detail) and US-33 (list, brought forward from Sprint 4 on 21/10). Status (2026-10-21): implemented in the frontend for the Sprint 1 demo. There is no restaurants endpoint yet (spec 004), so every screen reads `frontend/src/data/restaurants.fixture.ts`.

## Design

- **Data**: `restaurants.fixture.ts` holds seven Buenos Aires restaurants (`RestaurantPublic`): description, cuisine, `averageSpendPerPerson`, location, occupancy level, menu with prices, reviews and a photo (`frontend/public/restaurants/`). `fetchRestaurants()` and `fetchRestaurant(id)` stand in for the future `GET /api/restaurants` and `GET /api/restaurants/{id}`; swapping them for the generated client is the only change the pages need.
- **Map (US-5)**: `RestaurantMap` uses Leaflet + react-leaflet with OpenStreetMap tiles (ADR 0003). `useGeolocation` asks for the device position; without it the map centers on Buenos Aires, hides distances and offers «Usar mi ubicación» to retry. Distances are straight-line (haversine, `lib/geo.ts`). Restaurants without a valid location are left out (FR-011). Markers are not clustered.
- **Occupancy (US-5 S5, US-33 S3)**: TanStack Query refetches the restaurants every `OCCUPANCY_REFRESH_MS` (30 s, provisional). If a refresh fails, the last values stay and a notice says they may be outdated.
- **Price filter (US-7)**: controlled `PriceFilter` (Chip/Button, `aria-pressed`, live empty-state message). `priceTierFromAverageSpend` derives the $–$$$$ tier from the fixture's `averageSpendPerPerson` (below 15000 → $, below 25000 → $$, through 40000 → $$$, above → $$$$; provisional). `matchesPriceFilter` is a pure predicate: no selection lets everything through; an active selection excludes restaurants without a menu or tier. The selection lives in the URL (`?precio=$$&precio=$$$`), so it survives opening a detail and coming back.
- **List (US-33)**: `RestaurantExplorer` renders the price filter, the list and the map from one query, so the filter applies to markers and list alike (FR-012, FR-014). The list is sorted by distance (by name without a location) and shows photo, price tier, average rating, cuisine, neighborhood, distance and occupancy, with «Ver en el mapa» and «Ver detalle».
- **Detail (US-9)**: `/restaurantes/:id` (`RestaurantDetailPage`) shows the cover photo, price tier, average spend per person, rating, occupancy, dietary restrictions, address, description, menu with prices and the fixture reviews (real reviews come with US-24). «Volver» returns to the page the diner came from, filter included (router state).
- **Routes**: `/mapa` (public, `MapPage`) and the signed-in diner's home (`pages/home/DinerHome.tsx`) both render `RestaurantExplorer`; `/restaurantes/:id` is the detail.
- No backend, database, API generation or new dependencies beyond Leaflet/react-leaflet.

## Constitution check

Scope is backlog-bound (US-5, 7, 9, 33), uses the existing stack plus the map library from ADR 0003, and adds no infrastructure. Every acceptance scenario maps to a test below. The open PO questions (refresh period, location fallback, occupancy source) are implemented with the proposals in the spec and stay marked as pending.

## Acceptance coverage

| Scenario | Test |
| --- | --- |
| US-5 S1–S5 | `frontend/src/pages/MapPage.test.tsx` › `US-5 S1 …` to `US-5 S5 …` |
| US-5 edges | `MapPage.test.tsx` › `US-5 edge keeps the last occupancy and warns when a refresh fails`, `US-5 edge hides restaurants without a valid location (FR-011)`, `US-5 edge falls back to Buenos Aires when the location is denied`; `frontend/src/lib/geo.test.ts` › `US-5 edge …` |
| US-7 S1–S3 | `MapPage.test.tsx` › `US-7 S1 shows only the restaurants of the chosen price, on the map and in the list`, `US-7 S2 …`, `US-7 S3 …`; `frontend/src/components/restaurant/PriceFilter.test.tsx` and `priceFilter.test.ts` › `US-7 S1 …` to `US-7 S3 …` |
| US-7 edges | `PriceFilter.test.tsx` and `priceFilter.test.ts` › `US-7 edge …` (keyboard, no matches, empty source, missing menu or tier) |
| US-9 S1–S4 | `MapPage.test.tsx` › `US-9 S1 …` to `US-9 S4 shows the description, a photo and the opinions of the restaurant` |
| US-9 edge (filter kept) | `MapPage.test.tsx` › `US-9 edge goes back to the map with the same price filter` |
| US-33 S1–S4 | `MapPage.test.tsx` › `US-33 S1 …` to `US-33 S4 opens the detail of a restaurant chosen in the list` |

Not covered by tests: marker clustering (not implemented) and the success criteria on load time and distance accuracy.

## Pending

- Replace the fixture with the restaurants endpoint from spec 004 and regenerate the API types.
- Compute the average spend from at least five reviews with spend per person (US-50).
- PO confirmation of the refresh period, the location fallback and the occupancy source.

## US-7 validation history

The sections below record checks run while US-7 was built on its own, before the map integration. They are historical.

### Validation for numeric average spend (2026-10-19)

All 42 frontend tests across 14 files passed, including 12 conversion cases. ESLint, TypeScript (`tsc -b`), the full frontend Prettier check and `git diff --check` passed. Validation was limited to the frontend for this change; backend checks and visual browser checks were not rerun.

### Previous validation

Current frontend validation runs directly in WSL after the user corrected `frontend/node_modules` permissions and ran `npm ci`: all 30 tests across 14 files passed. ESLint, TypeScript and the Prettier check for the modified catalog page passed during catalog integration; `git diff --check` also passed.

The user visually verified single and multiple selection, deselection, clearing, zero matches and responsive layout at 360 px in the catalog demonstration. These checks use fictional data and do not prove real map marker integration, detail navigation or live API/database behavior.

Earlier temporary-copy frontend checks and backend results are historical; see tasks.md. The earlier root `make format lint test` attempt did not complete, and a successful full root run is not claimed. No checks were rerun for this documentation-only update.

### Numeric average spend update (2026-10-19)

The catalog stores mock average spend per person in ARS, displays the amount and derives categories using the exported helper. Boundary tests cover each threshold and adjacent cent values. PriceFilter and matchesPriceFilter retain their existing behavior. Computing averages from at least five reviews remains future work; no backend or US-5 integration is included.
