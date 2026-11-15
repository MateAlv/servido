# Implementation Plan: Search filters (rating, dietary restrictions, time and party size)

**Feature**: `specs/027-filtros-busqueda` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md) | **US**: US-35, US-53, US-59, US-61 | **Sprint**: 5

**Input**: Feature specification from `/specs/027-filtros-busqueda/spec.md`

**Note**: Project template (overrides Spec Kit's default). Written in English; `spec.md` stays in Spanish. Decisions F1–F10 are the team's (15/11) and still wait for PO validation.

## Summary

Four filters join the price filter of spec 002-elegir-restaurante (US-7) on the diner's map and list: minimum rating, dietary restrictions, a day with a point hour or a range, and party size. Rating, restrictions, party size and price are checked in the browser with data the restaurant list already brings; the API adds two fields to each restaurant (`max_party_size`, `dish_restriction_sets`). The time filter needs shifts and closures, so a new public endpoint returns the restaurants where a reservation can start in the chosen time. All filters live in the URL, open in a new `Drawer` from a «Filtros» button, and show as removable tags above the map and the list. The detail carries the filtered day, point hour and party size to the reservation (F9).

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Pydantic · React, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/`

**Storage**: PostgreSQL 17. No schema change and no migration: everything comes from existing tables (reviews, dishes, shifts, closures, table groups).

**Testing**: pytest against a real Postgres · Vitest + Testing Library

**Target Platform**: Mobile-first web app

**Project Type**: Web application (backend + frontend)

**Performance Goals**: None beyond the spec. The open-restaurants endpoint checks every bookable restaurant one by one, which is fine for the handful the MVP has.

**Constraints**: Single AWS free-tier account; no new services or dependencies

**Scale/Scope**: 1 new endpoint, 2 new fields on `PublicRestaurant`, 1 new design-system component (`Drawer`), 2 domain components (`FilterPanel`, `ActiveFilters`), pure filter logic in `searchFilters.ts`

**New dependencies**: None

**Open clarifications**: None open. F1–F10 are applied as written in the spec; if the PO changes one, only `searchFilters.ts` (F1–F3, F5–F8, F10) or `can_start_between` (F4) needs to change.

## Design

### API

- `PublicRestaurant` (list and detail) gains:
  - `max_party_size: int`: the largest available table, `max_party_size(available_groups(...))` (F5).
  - `dish_restriction_sets: list[list[str]]`: the distinct, sorted restriction sets of the available, not deleted dishes that have any restriction. The browser asks for one set that contains every chosen restriction (F2, F3). Profile tags (`dietary_restrictions`) are not used (F2).
- `GET /api/restaurants/open?date=YYYY-MM-DD&start_from=HH:MM&start_to=HH:MM` → `{"restaurant_ids": [...]}`. Public. A bookable restaurant is listed when, that day, some start of the 30-minute grid whose 90-minute block fits inside an active shift (`starts_in`) is in `[start_from, start_to]`, has not started yet (today) and is not `blocked` by a closure (F4). Booked tables are not checked (spec, «Mesa ocupada»). A point hour sends the same time twice. 400 with the existing Spanish messages for a past day or more than 60 days ahead (`check_date`), and «El «hasta» no puede ser anterior al «desde».» for an inverted range. Declared before `/restaurants/{restaurant_id}` so `open` is not read as an id.

### Frontend

- `components/restaurant/searchFilters.ts`: the pure logic, unit tested. Reads and writes the URL (`precio`, `rating=3|4|4.5`, `restriccion=sin_tacc|vegetariano|vegano` repeated, `dia=YYYY-MM-DD` with `hora=HH:MM` on the half hour or `desde`/`hasta`, `personas=1..20`), ignoring invalid values and flagging a past day (F8). `matchesSearchFilters` combines every filter with «y» (F6): unrounded average via `averageRating` (F1), restriction sets (F2, F3), `maxPartySize` (F5), the open ids (F4), and leaves the test restaurants out while the time or party filter is active (F10). It also builds the tag labels («4 o más ★», «Sin TACC», «Dom 22/11 · 21:00», «Dom 22/11 · 20:00–22:00», «6 personas», «$$») and the prefill query strings (F9).
- `RestaurantExplorer`: a «Filtros» button with a count badge opens a `Drawer` with `FilterPanel`; changes apply at once and the footer offers «Limpiar» and «Ver N restaurantes», which closes it. `ActiveFilters` shows the tags and «Quitar todos». With a time filter, TanStack Query asks `/api/restaurants/open`; while it loads the page says «Buscando restaurantes con ese horario…», and on error it shows a notice with «Reintentar». No results: «Ningún restaurante cumple los filtros elegidos.» with «Quitar filtros» (FR-008). A shared link with a past day drops it and says so.
- `FilterPanel`: the existing `PriceFilter`, the minimum rating as `ChoiceChips` (a radio group: «Todas», «3 o más ★»…, read as «estrellas»), restriction chips, day («Hoy», «Mañana» or a date between today and +60 days, shown in words under the field) with a `SegmentedControl` for «Todo el día», «Una hora» or «Entre horas» (the hour, or the two ends of the range as two pressable boxes, chosen on a `TimeWheel` of half hours or in a `ClockDialog`, without today's hours that already started), and party size (a large `QuantityStepper` from 1 to 20 that starts at 2 when the diner asks for it).
- A day alone filters by itself (F4, changed on 15/11 at the team's request): it is the whole day, sent as `start_from=00:00&start_to=23:59`, written in the URL as `dia` alone, shown as «Lun 16/11» and prefilling only the date and the people; an hour or a range narrows it. The day and time controls are kept by `RestaurantExplorer`, not by the panel, so they survive closing and opening it. Switching modes keeps the chosen hour (an hour becomes the start of the range and the start becomes the hour); with nothing chosen, both start at 20:00, or at the first half hour left today. Only a complete, valid day and time is applied: without a day, or with a day out of the window, the last valid time stays applied and the panel says which one. «Quitar día y horario» and the tag are the ways to remove it.
- The time selector (F4 and F7, changed on 15/11 at the team's request; design in the «Selector de hora» canvas): `TimeWheel` (`components/ui/`) is a scroll-snap list of the 48 half hours, 44 px per row, that commits the hour under the band 140 ms after it stops moving, so the filter isn't applied on every hour it passes; the hours that can't be chosen are crossed out and the wheel settles on the next one that can. It is one Tab stop (roving `tabIndex`): ↑ ↓ move, Inicio/Fin jump, and Enter or a tap on the chosen hour opens the clock. `ClockDialog` (`components/ui/`, on `Modal`) shows the hours 12–23 on the outer ring and 00–11 on the inner one, then :00 or :30, and confirms with «Listo». In a range the draft's `to` is empty while it follows `from`: the range ends at `rangeEnd(from)`, from + 90 minutes (the last half hour of the day at most), and a `from` after the chosen `to` empties it again (`fitTimeDraft`). A link whose `hasta` is exactly `desde` + 90 minutes reads back as following, and a range off the 30-minute grid is read as the day alone. The inverted-range error is gone from the panel because the wheel of «hasta» only offers hours from «desde» on; the API keeps its 400.
- Stored filters (F8, changed on 15/11): `RestaurantExplorer` writes the active filters to `localStorage` (`servido.filtros`, the same query string the URL holds) on every change and removes the key when none is active. Mounted with no filter parameter in the URL, it applies the stored filters at once and writes them to the URL with `replace`, so the detail and a reload keep them; any filter parameter in the URL wins. `storedSearchFilters` reads them through `readSearchFilters`, so a day that already passed is dropped without a notice. Storage that throws (a private window) is ignored: the URL still holds the filters. `TimeFilter` carries its mode, so a range with equal ends stays `desde`/`hasta` and never prefills an hour.
- Links (F8): a day out of the booking window (past or beyond 60 days) is dropped with a notice, and every invalid value is taken out of the URL (`needsCleanup`).
- Focus: removing a tag focuses the tag now in its place, or «Filtros» when none remain; buttons of the panel that disappear hand the focus to what replaces them.
- The detail's «Reservá tu mesa» card shows what the reservation starts with («Lun 16/11 · 21:00 · 3 personas», `prefillLabel`).
- Test restaurants: their fixture dishes get restrictions consistent with the restaurant's tags (F10); `dishRestrictionSets` is derived from them.
- Prefill (F9): «Ver detalle» in the list and in the map popup adds `?dia=…&hora=…&personas=…` (or `desde`/`hasta` for a range). The detail turns them into `/reservar/:id?fecha=…&personas=…`, plus `hora=` only for a point hour, also through «Ingresá para reservar». `ReservationPage` already drops an hour that is no longer available and keeps the day and party (US-11 S5). The back link still uses the router state, so it returns to the filtered map.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Only US-35, US-53, US-59, US-61; no sorting, text search or saved filters | [x] |
| II. Spec before code | Spec 027 with F1–F10 recorded; PO validation pending, as the spec says | [x] |
| III. Every scenario tested | See the map below | [x] |
| IV. Humans own AI output | One endpoint, two fields, pure functions with unit tests | [x] |
| V. Simple, cheap, conventional | No new dependency; the drawer reuses the native dialog like `Modal` | [x] |

## Acceptance Scenario → Test Map

Frontend files: `RestaurantExplorer.test.tsx` (UI) and `searchFilters.test.ts` (pure logic), both in `frontend/src/components/restaurant/`. Backend file: `backend/tests/test_search_filters.py`.

| Scenario | Test | Layer |
| --- | --- | --- |
| US-35 S1 — minimum rating on map and list | `US-35 S1 keeps only the restaurants with that average or more, on the map and in the list`; `US-35 S1 keeps averages equal to or above the minimum` | Frontend |
| US-35 S2 — change the minimum | `US-35 S2 updates the result to the new minimum` | Frontend |
| US-35 S3 — remove the minimum | `US-35 S3 shows every restaurant again when the minimum is removed` | Frontend |
| US-35 S4 — no reviews (F1) | `US-35 S4 hides a restaurant without reviews only while the filter is active` (UI and unit) | Frontend |
| US-35 edge — unrounded average | `US-35 edge compares the unrounded average`; UI S1 uses 3,96 | Frontend |
| US-53 S1 — one restriction | `US-53 S1 keeps the restaurants with an available dish marked with it`; `US-53 S1 needs one dish with the restriction` | Frontend |
| US-53 S2 — one dish with all (F3) | `US-53 S2 asks for one dish that meets every chosen restriction`; `US-53 S2 needs one dish with every chosen restriction (F3)`; `test_us53_s2_lists_the_restriction_sets_of_the_available_dishes` | Both |
| US-53 S3 — add or take out | `US-53 S3 updates the result when a restriction is taken out`; `US-53 S3 removes one tag and keeps the rest` | Frontend |
| US-53 S4 — remove all | `US-53 S4 shows every restaurant again without restrictions` (UI and unit) | Frontend |
| US-53 edge — profile tags and unavailable dishes don't count | `test_us53_edge_profile_tags_do_not_count`; the S2 backend test includes unavailable and deleted dishes | Backend |
| US-59 S1 — point hour | `test_us59_s1_point_hour_lists_restaurants_where_a_reservation_can_start`; `US-59 S1 keeps the restaurants where a reservation can start at that hour` | Both |
| US-59 S2 — range, ends included | `test_us59_s2_range_lists_restaurants_with_a_start_inside_it`; `test_us59_s2_range_includes_both_ends`; `US-59 S2 keeps the restaurants with a start inside the range` | Both |
| US-59 S3 — change day or time | `test_us59_s3_changing_the_day_or_time_changes_the_result`; `US-59 S3 asks again when the hour changes` | Both |
| US-59 S4 — remove | `US-59 S4 shows every restaurant again when the day and time are removed` | Frontend |
| US-59 S5 — a day alone | `test_us59_s5_a_day_alone_lists_restaurants_with_any_start_that_day`; `US-59 S5 keeps the restaurants where a reservation can start some time that day`; `US-59 S5 opens a shared link with a day alone and prefills only the date and people`; the `US-59 S5 …` unit tests in `searchFilters.test.ts` | Both |
| US-59 S6 — «hasta» follows «desde» + 1 h 30 | `searchFilters.test.ts` and `RestaurantExplorer.test.tsx` › `US-59 S6 …` | Frontend |
| Common S6 — the browser keeps the last filters | `RestaurantExplorer.test.tsx` › `US-59 common S6 …` (the common scenarios carry US-59 as the last filter added) | Frontend |
| Time selector — wheel and clock | `ui/TimeWheel.test.tsx`, `ui/ClockDialog.test.tsx` | Frontend |
| US-59 edges — 90 minutes, closures, today, empty range, booked tables, window, inverted range, half hours, past day in a link | `test_us59_edge_*` (backend); `US-59 edge …` in both frontend files | Both |
| US-61 S1 — party size | `test_us61_s1_lists_the_largest_available_table`; `US-61 S1 keeps the restaurants with a table for the whole party`; `US-61 S1 needs a table for the whole party` | Both |
| US-61 S2 — change it | `US-61 S2 updates the result when the party size changes` | Frontend |
| US-61 S3 — remove it | `US-61 S3 shows every restaurant again when the party size is removed` | Frontend |
| Common S1 — every filter at once (F6) | `US-35 common S1 shows only the restaurants that meet every filter, price included`; `US-35 common S1 asks for every filter at once, price included` | Frontend |
| Common S2 — tags and «Quitar todos» (F7) | `US-35 common S2 shows each active filter as a removable tag, and removes them all`; `US-35 common S2 describes each active filter`; `US-59 common S2 …` | Frontend |
| Common S3 — no results (FR-008) | `US-61 common S3 says there are no results and offers to remove the filters` | Frontend |
| Common S4 — detail and back, reload, shared link (F8) | `US-53 common S4 keeps the filters after opening a detail and going back`; reload and link: every UI test that starts from `/mapa?…`, and `US-35 edge writes the filters and keeps other parameters` | Frontend |
| Common S5 — prefilled reservation (F9) | `US-59 common S5 starts the reservation with the filtered day, hour and party size`; `US-59 common S5 starts the reservation without an hour for a range, from the map`; `US-61 common S5 carries only the party size` | Frontend |
| Edge F10 — test restaurants | `US-61 edge leaves the test restaurants out of the time and party filters (F10)`; `US-53 edge uses the test dishes for the test restaurants (F10)` | Frontend |
| Edges from QA — focus after removing tags, pending day, mode switch, equal-ends range, 60-day links and URL cleanup, inverted range marked invalid, today's past hours, party maximum, no results in the drawer | `RestaurantExplorer.test.tsx` › `Filters, focus and pending choices (spec 027, QA)` and `US-59 common S5 keeps a range with equal ends as a range, without an hour`; `searchFilters.test.ts` › the `US-59 edge`/`S3` tests on links, modes and pending drafts; `ui/ChoiceChips.test.tsx` | Frontend |
| Edge F9 — prefilled hour no longer available | `frontend/src/pages/ReservationPage.test.tsx` › `US-11 S5 clears a time that is no longer available and keeps the date` (existing) | Frontend |

## Project Structure

```text
backend/
├── app/api/public_restaurant.py        # ~ new fields, + GET /restaurants/open
├── app/schemas/public_restaurant.py    # ~ PublicRestaurant fields, + OpenRestaurants
├── app/services/availability.py        # + can_start_between
└── tests/test_search_filters.py        # + acceptance tests
frontend/src/
├── api/openapi.json, schema.d.ts       # ~ make api-types
├── api/restaurants.ts                  # ~ new fields, + fetchOpenRestaurantIds
├── components/ui/Drawer.tsx            # + with Drawer.module.css and Drawer.test.tsx; ~ icons.tsx (IconFilter)
├── components/restaurant/searchFilters.ts       # + pure filter logic, with tests
├── components/restaurant/FilterPanel.tsx        # + panel content
├── components/restaurant/ActiveFilters.tsx      # + removable tags
├── components/restaurant/RestaurantExplorer.tsx # ~ drawer, tags, empty state, time query, prefill links
├── components/restaurant/RestaurantMap.tsx      # ~ detail link query string
├── data/restaurants.fixture.ts         # ~ test dish restrictions, new fields
├── lib/dietary.ts                      # + restriction codes and labels
├── lib/date.ts                         # + addDays
├── pages/RestaurantDetailPage.tsx      # ~ prefilled reservation link
└── pages/MapPage.tsx, home/DinerHome.tsx, DesignSystemPage.tsx  # ~ texts and catalog
```

**Structure Decision**: Follows the existing layout. The filter logic lives next to `priceFilterUtils.ts`, which it extends.
