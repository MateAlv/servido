---

description: "Tasks for spec 027: search filters"
---

# Tasks: Search filters (rating, dietary restrictions, time and party size)

**Input**: [spec.md](spec.md) and [plan.md](plan.md)

**Tests**: REQUIRED. Each acceptance scenario maps to a test in the plan.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Foundational

- [x] T001 Add `max_party_size` and `dish_restriction_sets` to `PublicRestaurant` in backend/app/schemas/public_restaurant.py and backend/app/api/public_restaurant.py
- [x] T002 Regenerate the contract with `make api-types` (frontend/src/api/openapi.json, schema.d.ts)
- [x] T003 [P] Add the `Drawer` component and `IconFilter` in frontend/src/components/ui/, with Drawer.test.tsx, to the `/diseno` page and docs/design/README.md
- [x] T004 [P] Restriction codes and labels in frontend/src/lib/dietary.ts; `addDays` in frontend/src/lib/date.ts
- [x] T005 Map the new fields in frontend/src/api/restaurants.ts; give the test dishes restrictions consistent with their restaurant in frontend/src/data/restaurants.fixture.ts (F10)
- [x] T006 Pure filter logic in frontend/src/components/restaurant/searchFilters.ts: URL read/write (F8), matching (F1–F6, F10), tag labels (F7), prefill (F9), day and time draft
- [x] T007 `FilterPanel`, `ActiveFilters` and the drawer, tags, empty state and time query in `RestaurantExplorer`; update the MapPage and DinerHome texts and the existing US-7 tests to open the panel

## Phase 2: US-35 — Rating

- [x] T008 [P] [US35] Unit tests `US-35 S1`, `S4`, `edge` in frontend/src/components/restaurant/searchFilters.test.ts
- [x] T009 [P] [US35] UI tests `US-35 S1`–`S4` in frontend/src/components/restaurant/RestaurantExplorer.test.tsx

## Phase 3: US-53 — Dietary restrictions

- [x] T010 [P] [US53] `test_us53_s2_…` and `test_us53_edge_profile_tags_do_not_count` in backend/tests/test_search_filters.py
- [x] T011 [P] [US53] Unit tests `US-53 S1`–`S4` and UI tests `US-53 S1`–`S4`

## Phase 4: US-59 — Day and time

- [x] T012 [US59] `can_start_between` in backend/app/services/availability.py and `GET /api/restaurants/open` in backend/app/api/public_restaurant.py
- [x] T013 [P] [US59] `test_us59_s1`–`s3` and `test_us59_edge_*` in backend/tests/test_search_filters.py
- [x] T014 [US59] `fetchOpenRestaurantIds` and the TanStack Query in `RestaurantExplorer`, with loading and retry states
- [x] T015 [P] [US59] Unit and UI tests `US-59 S1`–`S4` and edges

## Phase 5: US-61 — Party size

- [x] T016 [P] [US61] `test_us61_s1_lists_the_largest_available_table`
- [x] T017 [P] [US61] Unit and UI tests `US-61 S1`–`S3`

## Phase 6: Common behavior

- [x] T018 [US35] Tests for common S1–S4 (combination, tags, no results, URL persistence)
- [x] T019 [US59] Prefill (F9): detail links from the list and the map popup carry `dia`/`hora`/`personas`; `RestaurantDetailPage` builds `/reservar/:id?fecha=…&hora=…&personas=…`; tests `US-59 common S5 …` and `US-61 common S5 …`

## Phase 7: Wrap-up

- [x] T020 Run `make format lint test`
- [x] T021 Update the 027 row in specs/README.md and «Where things stand» in AGENTS.md
- [x] T022 QA findings: focus after removing tags, pending day kept and flagged, range mode kept in the URL, 60-day links and URL cleanup, accessible rating group and stepper, no results in the drawer, today's past hours, day in words, prefill summary on the detail; `ChoiceChips` and the large `QuantityStepper` in the design system
