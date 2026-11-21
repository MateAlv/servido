# Implementation Plan: Pay a pre-ordered meal in cash

**Feature**: `specs/032-pagar-pedido` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md) | **US**: US-60 | **Sprint**: 6

**Input**: Feature specification from `/specs/032-pagar-pedido/spec.md` (US-60 section; US-56 is out of scope, see below)

**Note**: Project template (overrides Spec Kit's default). Written in English; `spec.md` stays in Spanish. This plan covers **only US-60** («Pagar con efectivo»). US-56 (electronic checkout, simulated card/wallet, receipt by mail) stays in the spec and is not planned or built here.

## Summary

US-45 (spec 020-tiempo-pago) already stores the diner's payment preference (`cash` / `online`), the `pending` / `paid` status and the bill of every confirmed order, and lets the diner change only the method while the reservation is open and the order is unpaid. US-60 adds the two things that are missing: after choosing cash, the diner must clearly read the exact amount to pay at the restaurant, and the restaurant (spec 022, US-36) must see «Abona en efectivo en el local» with that amount, with the order staying `pending` until the cash payment is confirmed. Because no US implements confirming a cash payment yet, this plan only keeps and shows the pending state; it never marks a cash order as paid. The work is presentational plus acceptance tests: no migration, no new endpoint and no contract change.

## Technical Context

**Language/Version**: Python 3.12 (backend) · TypeScript (frontend)

**Primary Dependencies**: FastAPI, SQLAlchemy 2, Pydantic · React, React Router, TanStack Query, the design system in `frontend/src/components/`

**Storage**: PostgreSQL 17. No schema change and no migration: `pedidos.payment_method`, `payment_status`, `paid_amount` and `paid_at` already exist with their check constraints (spec 020-tiempo-pago).

**Testing**: pytest against a real Postgres · Vitest + Testing Library

**Target Platform**: Mobile-first web app

**Project Type**: Web application (backend + frontend)

**Performance Goals**: None beyond the spec. Only one user at a time.

**Constraints**: Single AWS free-tier account; no new services, dependencies or paid APIs. The cash payment is not processed electronically.

**Scale/Scope**: 0 new endpoints, 0 migrations, 0 new components. Two screens change copy (`OrderPage`, `RestaurantOrdersPage`) and two test modules gain US-60 scenarios.

**New dependencies**: None

**Open clarifications**: The spec has no `[NEEDS CLARIFICATION]` markers. E1–E5 are the team's proposals for the PO; only **E5** affects US-60 and is applied as written: choosing cash leaves the order `pending` and never marks it paid automatically. «Hasta que el pago en efectivo sea confirmado» is read as a future US: the spec's boundaries exclude a cash desk or turn closing, and no current US registers that confirmation, so this plan does not invent it (Constitution, principle II). The rest of E1–E4 belong to US-56.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | Only US-60; no new fields, endpoints, states, caching or abstractions. The amount is derived from data the API already returns | [x] |
| II. Spec before code | Spec exists in `specs/032-pagar-pedido/spec.md`; no open clarification. E5 applied as written; the missing cash confirmation is recorded as out of scope, not invented | [x] |
| III. Every scenario tested | S1–S4 and the edge cases map to named tests below; the existing `order_payment_*` database constraints keep the paid invariant | [x] |
| IV. Humans own AI output | Two small copy changes plus tests a teammate can review and explain | [x] |
| V. Simple, cheap, conventional | No dependency, service or schema change; the amount is already in the responses | [x] |

## Acceptance Scenario → Test Map

| Scenario | Test | Layer |
| --- | --- | --- |
| US-60 S1 — choosing cash and confirming leaves the order `pending` with no electronic charge | `backend/tests/test_us60_cash_payment.py::test_us60_s1_cash_confirmation_stays_pending` | Backend |
| US-60 S2 — the diner sees the total to pay at the restaurant | `backend/tests/test_us60_cash_payment.py::test_us60_s2_cash_order_exposes_total_to_pay` · `frontend/src/pages/OrderPage.test.tsx` › `US-60 S2 shows the amount to pay in cash` | Backend + Frontend |
| US-60 S3 — the order stays `pending` for diner and restaurant, never `paid` | `backend/tests/test_us60_cash_payment.py::test_us60_s3_cash_order_stays_pending_for_both_roles` · `frontend/src/pages/RestaurantOrdersPage.test.tsx` › `US-60 S3 shows «Abona en efectivo en el local» with the amount` | Backend + Frontend |
| US-60 S4 — a pending cash order can switch to electronic before the reservation | `backend/tests/test_us60_cash_payment.py::test_us60_s4_pending_cash_order_switches_to_online` · `frontend/src/pages/OrderPage.test.tsx` › `US-60 S4 switches a pending cash order to electronic` | Backend + Frontend |
| US-60 edge — empty order, cancelled reservation, past reservation and another diner's order are rejected | `backend/tests/test_us60_cash_payment.py::test_us60_edge_cash_payment_rejections` | Backend |
| US-60 edge — a paid order cannot change its method or be charged again | `backend/tests/test_us60_cash_payment.py::test_us60_edge_paid_order_rejects_cash_change` | Backend |
| US-60 edge — the restaurant never marks cash as paid by reading it | `frontend/src/pages/RestaurantOrdersPage.test.tsx` › `US-60 edge keeps a cash order pending in the restaurant view` | Frontend |

## Project Structure

### Documentation (this feature)

```text
specs/032-pagar-pedido/
├── spec.md              # Spanish, validated by the PO
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output (/speckit-plan)
├── data-model.md        # Phase 1 output: existing entities, no change (/speckit-plan)
├── quickstart.md        # Phase 1 output: how to try US-60 locally (/speckit-plan)
├── contracts/           # Phase 1 output: endpoints US-60 relies on (no change)
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
backend/
└── tests/test_us60_cash_payment.py     # + acceptance tests (no app change)
frontend/
├── src/pages/OrderPage.tsx             # ~ cash amount in the review and confirmed steps
├── src/pages/OrderPage.module.css      # ~ one style for the cash note, if needed
├── src/pages/OrderPage.test.tsx        # ~ US-60 S2 and S4
├── src/pages/RestaurantOrdersPage.tsx  # ~ «Abona en efectivo en el local» with the amount
└── src/pages/RestaurantOrdersPage.test.tsx  # ~ US-60 S3 and edge
specs/
└── README.md                           # ~ record spec 032 / US-60 in the index
```

**Structure Decision**: Only the two pages that already render the payment preference change. The backend keeps its models, routers and schemas: `OrderResponse.payment_method`, `payment_status` and `total` and `RestaurantOrderResponse.payment` already carry everything US-60 needs, so no `make api-types` run is required. No shared component is added because the two messages are page-specific copy.

## Design

### Backend

No change. The relevant existing pieces:

- `Order.payment_method` (`cash` | `online`, nullable), `payment_status` (`pending` | `paid`) and `total`, with the `order_payment_paid` and `order_payment_required` constraints (spec 020).
- `PUT /api/reservations/{id}/order` confirms the order with the chosen method and always writes `payment_status = 'pending'` (spec 020).
- `PUT /api/reservations/{id}/order/payment-method` changes only the method while `payment_editable` holds: confirmed reservation, confirmed order, before `reservation.ends_at`, not paid (spec 020). A cancelled reservation, a reservation that already ended, an empty/missing order and another diner's reservation are rejected (404 or 409).
- `GET /api/restaurant/orders/{id}` already returns `payment.status`, `payment.method` and `payment.total` (spec 022).

New tests in `backend/tests/test_us60_cash_payment.py` prove the US-60 scenarios on top of that behavior, so a future change that breaks the cash lifecycle fails under a US-60 name.

### Frontend

- `OrderPage`, review step (`draftControls`): when the selected method is `cash`, a line under the chips reads «Abonás $X en efectivo en el local.» with the cart total, so the diner sees the amount before confirming (FR-007). The existing «Elegir pago electrónico no inicia un cobro» stays.
- `OrderPage`, confirmed step (`confirmedPayment`): when the confirmed order is `cash` and `pending`, the same line reads «Abonás $X en efectivo en el local.» with `order.total`; the status stays «Pendiente de pago». When it is `paid`, the note disappears and «Pagado» is shown.
- `RestaurantOrdersPage`, order detail: when `payment.method === 'cash'` and `payment.status === 'pending'`, a line reads «Abona en efectivo en el local: $X» (FR-008, US-36); when it is `paid`, «Pagado electrónicamente». The `Pendiente de pago` pill stays.
- Amounts use the existing `formatPrice` / `money` formatters, never a new one, and all copy is Spanish (Argentina).

## Complexity Tracking

No violations.
