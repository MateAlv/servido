# Implementation Plan: Restaurant promotions (create, edit and pause discounts)

**Feature**: `specs/028-editar-promociones` | **Date**: 2026-11-19 | **Spec**: [spec.md](spec.md) | **US**: US-48 | **Sprint**: 6

**Input**: Feature specification from `/specs/028-editar-promociones/spec.md`

**Note**: Project template (overrides Spec Kit's default). Written in English; `spec.md` stays in Spanish. P5 (simultaneous promotions) is the team's decision of 19/11 and still waits for PO validation, like P1–P4.

## Summary

The Responsable defines promotions of its restaurant: a percentage (1–100) or a fixed amount with a mandatory minimum order, plus a validity window made of dates, ISO weekdays and/or a local time band. Promotions are listed with a derived state (active, programmed, expired, paused), edited, and paused/activated; nothing is deleted. Every restaurant chooses whether promotions stack (P5) and every promotion says whether it stacks.

In this stage, promotion management is restaurant-only. The diner-facing cart and confirmed order keep the normal subtotal and total and do not receive promotion rules or discount lines. Restaurant policy resolution remains available in the promotion service, and the database bill fields stay at zero until a later diner-facing discount phase is implemented.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Pydantic · React, React Router, TanStack Query, openapi-fetch, the design system in `frontend/src/components/`

**Storage**: PostgreSQL 17. One migration: table `promotions`, table `pedidos_descuentos`, columns `subtotal`/`discount_amount`/`total` on `pedidos` (backfilled for existing rows) and `stack_promotions` on `restaurantes`.

**Testing**: pytest against a real Postgres · Vitest + Testing Library

**Target Platform**: Mobile-first web app

**Performance Goals**: None beyond the spec. A restaurant has a handful of promotions; eligibility is checked in Python for one order at a time.

**Constraints**: Single AWS free-tier account; no new services or dependencies

**Scale/Scope**: 4 endpoints for the Responsable and 1 new restaurant-only management page; diner totals remain independent from promotions.

**New dependencies**: None

**Open clarifications**: None open. P1–P5 are applied as written in the spec. Diner-facing promotion application is explicitly deferred; if it is enabled later, it will require a separate change to order contracts and snapshots.

## Design

### Domain model

- `promotions` (glossary: `Promotion`): `restaurant_id`, `name` (≤ 120, not blank), `description` (optional), `discount_type` (`percentage` | `fixed`), `discount_value` `Numeric(10,2)`, `minimum_amount` `Numeric(10,2)` (required and `>= discount_value` for `fixed`, `NULL` for `percentage`), `starts_on`/`ends_on` (optional pair, inclusive), `weekdays` (`ARRAY(Integer)` of ISO 1–7, optional), `start_time`/`end_time` (optional pair, `end_time > start_time`), `active`, `stackable`, `request_id` (unique, like `closures`, for the double-submit edge case) and `created_at`. At least one validity criterion is required. All invariants are database constraints too.
- `restaurantes.stack_promotions` (`boolean`, default `false`): the restaurant policy (P5). `false` applies the promotion with the largest saving; `true` stacks.
- `pedidos.subtotal`, `pedidos.discount_amount`, `pedidos.total`: the frozen bill (P4).
- `pedidos_descuentos` (`OrderDiscount`): one row per applied promotion, with `promotion_id` (`RESTRICT`), a copy of `name` and `amount`. A paid/confirmed order therefore survives later edits of the promotion, and US-55 can read the names later.

### Backend

- `app/services/promotions.py` holds every rule: `is_within_window`, `discount_for`, `resolve` (policy), the CRUD helpers and the snapshot written at confirmation. Pure functions take a promotion and a local `datetime`, so they are easy to test.
- Validation lives in `app/schemas/promotion.py`; a `ValueError` in a validator is answered as 400 by the existing handler. Messages are Spanish and name the field to fix.
- Confirmation (`app/services/orders.py::confirm_order`) computes the normal subtotal and writes `discount_amount = 0` and `total = subtotal`; it does not expose or apply promotions to the diner.
- `GET /api/restaurant/promotions` returns the policy and the promotions with their derived `state` (`paused`, `expired`, `programmed`, `active`). `POST` creates (201; a repeated `request_id` returns the stored one with 200), `PUT /{id}` edits everything, `PUT /policies` changes the stacking policy, `PATCH /{id}` pauses or activates. Another restaurant's promotion is 404; a diner gets 403.
- The diner order response carries only the normal `subtotal` and `total`; it does not expose promotion rules or discount fields.
- `RestaurantOrderResponse` keeps the normal bill fields and has no promotion lines until diner-facing discounts are enabled.

### Frontend

- New page `PromotionsPage` at `/restaurante/promociones`, linked from the restaurant home: policy switch («Acumular promociones», with a one-line explanation), promotion list (name, discount, minimum, validity, state pill, «Editar», «Pausar»/«Activar») and an in-page create/edit view.
- `OrderPage`: the build/review and confirmed totals come only from the order's dish prices. It shows no promotion or discount information.

## Constitution Check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Only US-48 and P5; no public promotion list (US-55), no coupons, no deletion | [x] |
| II. Spec before code | Spec 028; P1–P5 recorded, PO validation pending, as the spec says | [x] |
| III. Every scenario tested | See the map below | [x] |
| IV. Humans own AI output | One service, one page, pure functions, no new dependency | [x] |
| V. Simple, cheap, conventional | One migration, 4 endpoints, no background work | [x] |

## Acceptance Scenario → Test Map

Backend file: `backend/tests/test_promotions.py`. Frontend files: `frontend/src/pages/PromotionsPage.test.tsx`, `frontend/src/pages/OrderPage.test.tsx` (existing), `frontend/src/pages/RestaurantOrdersPage.test.tsx` (existing).

| Scenario | Test | Layer |
| --- | --- | --- |
| US-48 S1 — percentage promotion with validity | `test_us48_s1_creates_a_percentage_promotion_with_its_validity`; `US-48 S1 saves a percentage promotion with dates, days and hours` | Both |
| US-48 S2 — fixed amount with minimum | `test_us48_s2_creates_a_fixed_amount_promotion_with_its_minimum`; `US-48 S2 saves a fixed amount with its minimum order` | Both |
| US-48 S3 — list with discount, minimum, validity and state | `test_us48_s3_lists_promotions_with_their_discount_validity_and_state`; `US-48 S3 lists each promotion with its value, minimum, validity and state` | Both |
| US-48 S4 — edit every attribute and activate/pause | `test_us48_s4_edits_a_promotion_and_changes_its_state`; `US-48 S4 edits a promotion and pauses it` | Both |
| US-48 S5 — invalid data is refused with a message | `test_us48_s5_rejects_invalid_promotions`, `test_us48_s5_refuses_invalid_edits_without_changing_the_promotion`; `US-48 S5 explains what to fix and saves nothing` | Both |
| US-48 S6 — diner does not see or receive the discount | `test_us48_s6_does_not_apply_the_discount_to_the_diner_cart`; diner order tests assert normal totals | Both |
| US-48 S7 — confirmed diner order does not add promotion discounts | `test_us48_s7_confirmed_order_does_not_apply_the_promotion`; diner order tests assert normal totals | Both |
| Edge — fixed discounts below the minimum | `test_us48_edge_fixed_discount_needs_the_minimum_order` | Backend |
| Edge — percentage discounts have no minimum | `test_us48_edge_percentage_has_no_minimum` | Backend |
| Edge — validity: dates, weekdays and time band (BA) | `test_us48_edge_validity_uses_buenos_aires`, `test_us48_edge_weekday_and_hours_are_and_conditions` | Backend |
| Edge — paused/expired promotions do not apply | `test_us48_edge_paused_or_expired_promotions_do_not_apply` | Backend |
| Edge P5 — largest saving, stacking and non-stackable | `test_us48_edge_p5_best_saving_is_applied_by_default`, `test_us48_edge_p5_stacks_and_compares_the_exclusive_promotion`, `US-48 edge P5 …` (unit) | Both |
| Edge — double submit | `test_us48_edge_repeated_request_creates_one_promotion` | Backend |
| Edge — isolation | `test_us48_edge_only_the_owner_reads_and_edits_promotions` | Backend |
| Edge — expired session saves nothing | `test_us48_edge_expired_session_saves_nothing` | Backend |
| Edge — diner totals never include promotion discounts | P5 backend cart cases assert the normal subtotal/total | Backend |

## Project Structure

```text
backend/
├── app/api/promotion.py                  # + 4 endpoints
├── app/api/__init__.py                   # ~ include the router
├── app/api/order.py                      # ~ normal diner subtotal/total only
├── app/api/restaurant.py                 # ~ restaurant order breakdown
├── app/models/promotion.py               # + Promotion, OrderDiscount
├── app/models/restaurant.py              # ~ stack_promotions
├── app/models/order.py                   # ~ subtotal, discount_amount, total, discounts
├── app/models/__init__.py                # ~ imports
├── app/schemas/promotion.py              # + requests/responses
├── app/schemas/diner_order.py            # ~ cart, order and page responses
├── app/schemas/order.py                  # ~ restaurant order response
├── app/services/promotions.py            # + every promotion rule
├── app/services/orders.py                # ~ freeze the bill on confirmation
├── app/services/restaurant_orders.py     # ~ read the frozen bill
├── migrations/versions/*_add_promotions.py
└── tests/test_promotions.py              # + acceptance tests
frontend/src/
├── api/openapi.json, api/schema.d.ts     # ~ make api-types
├── api/promotions.ts                     # + typed client
├── api/orders.ts                         # ~ new response types
├── api/restaurantOrders.ts               # ~ breakdown types
├── lib/orderSummary.ts                   # normal diner bill summary
├── components/order/Receipt.tsx          # normal receipt, no discount line
├── pages/PromotionsPage.tsx (+ .module.css, .test.tsx)
├── pages/OrderPage.tsx                   # normal diner totals
├── pages/RestaurantOrdersPage.tsx        # ~ breakdown
├── pages/home/RestaurantHome.tsx         # ~ card and link
└── router.tsx                            # ~ /restaurante/promociones
docs/
├── specs/README.md                       # ~ index, decision P5
└── AGENTS.md                             # ~ routes and endpoints (root file)
```
