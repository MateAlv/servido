# Tasks: choose a restaurant

T001–T010 were the independent US-7 frontend work. T006–T007 and T011–T014 cover the integration with the map, the list and the detail (US-5, US-9, US-33). Everything reads `frontend/src/data/restaurants.fixture.ts` until spec 004 adds the restaurants endpoint.

- [x] T001 Create the controlled price selector and token-based responsive styles.
- [x] T002 Add a pure price/menu predicate without inventing restaurant API properties.
- [x] T003 Add automated S1/S2/S3 and edge-case tests using a controlled test harness.
- [x] T004 Export the selector and document its integration interface in the design guide.
- [x] T005 Run formatting, lint, type checks and tests; record results (see validation below).
- [x] T006 Integrate the price filter with the US-5 map and the list in `RestaurantExplorer.tsx`; tested by `MapPage.test.tsx` › `US-7 S1 shows only the restaurants of the chosen price, on the map and in the list`, `US-7 S2 …` and `US-7 S3 …`. The real restaurant contract waits for spec 004.
- [x] T007 Preserve selection across US-9 detail navigation (`?precio=` in the URL); tested by `MapPage.test.tsx` › `US-9 edge goes back to the map with the same price filter`.
- [x] T008 Register PriceFilter in the design catalog with an interactive fictional-data demonstration in DesignSystemPage.tsx.

- [x] T009 Derive provisional price tiers from numeric mock average spend in ARS; cover 15000, 25000 and 40000 boundaries and adjacent cents.
- [x] T010 Update the catalog fixtures and US-7 documentation without changing selector/predicate behavior or integrating the map/backend.
- [x] T011 [US5] Build the Leaflet map with the diner position, occupancy markers, distance, Buenos Aires fallback without location, and a 30 s occupancy refresh (`RestaurantMap.tsx`, `useGeolocation.ts`, `lib/geo.ts`, `lib/occupancy.ts`); tested by `MapPage.test.tsx` › `US-5 S1 …` to `US-5 S5 …` and `US-5 edge …`, and `geo.test.ts`. Marker clustering is not implemented.
- [x] T012 [US9] Build `/restaurantes/:id` (`RestaurantDetailPage.tsx`) with price tier, average spend, menu with prices, description, photo and fixture reviews; tested by `MapPage.test.tsx` › `US-9 S1 …` to `US-9 S4 …`.
- [x] T013 [US33] Show the same restaurants as a list next to the map, sorted by distance, with distance, occupancy, «Ver en el mapa» and «Ver detalle»; tested by `MapPage.test.tsx` › `US-33 S1 …` to `US-33 S4 …`.
- [x] T014 Add the restaurant fixture with `averageSpendPerPerson`, menus, reviews and photos (`frontend/src/data/restaurants.fixture.ts`, `frontend/public/restaurants/`), and render `RestaurantExplorer` on `/mapa` and on the signed-in diner's home.

## Validation results

### Numeric average spend update (2026-10-19)

- All 42 frontend tests across 14 files passed, including 12 conversion cases covering exact thresholds and adjacent cents.
- `npm run lint`, `npm run typecheck`, `npm run format:check` and `git diff --check` passed.
- No backend checks or visual browser checks were rerun for this frontend-only change.

### Previous frontend validation

- The user corrected `frontend/node_modules` permissions and ran `npm ci`. All 30 frontend tests across 14 files passed directly in WSL, including the run after catalog integration.
- During catalog integration, ESLint and TypeScript passed directly in the project. Prettier checked the modified DesignSystemPage.tsx successfully; git diff --check also passed.
- The user visually verified single and multiple selection, deselection, clearing, zero matches and responsive layout at 360 px in `/diseno#filtro-precio`.
- Catalog registration is complete. At the time, map integration (T006) and selection preservation across detail navigation (T007) were pending; both were done later.
- No checks were rerun for this documentation-only update; this section records previously performed checks.

### Historical validation

- Before permissions were corrected, frontend checks used `/tmp/servido-us7-check` with the existing lockfile because npm ci in the repository failed with EACCES. ESLint, TypeScript and all 30 tests passed there. Prettier checks on the changed frontend component files and git diff --check passed.
- Backend Ruff checks and formatting, and the pytest health test against PostgreSQL, passed during the earlier implementation verification. They were not rerun for catalog integration or this documentation update.
- The earlier root make format lint test attempt did not complete because frontend tools were unavailable in the repository and the uv cache required elevated access. This historical limitation does not describe the current frontend permissions; no successful full root run is claimed.
