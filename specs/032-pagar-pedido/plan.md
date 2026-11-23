# Implementation Plan: Pay a pre-ordered meal in cash

**Feature**: `specs/032-pagar-pedido` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md) | **US**: US-60 | **Sprint**: 6

**Input**: Feature specification from `/specs/032-pagar-pedido/spec.md`. The sections below plan US-60 (21/11); [US-56](#us-56--electronic-payment-added-2026-11-23) is planned at the end (23/11).

**Note**: Project template (overrides Spec Kit's default). Written in English; `spec.md` stays in Spanish. The first part covers US-60 («Pagar con efectivo»). US-56 («Pagar electrónicamente») was added on 23/11 with Mercado Pago's test environment instead of the simulated checkout (spec, E1 changed); see its own section at the end.

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

---

## US-56 — Electronic payment (added 2026-11-23)

**US**: US-56 (3 SP) · **Decisions**: E1 (changed 23/11), E2–E4, E6–E8 of the spec · **ADR**: [0010](../../docs/decisions/0010-mercado-pago-test-payments.md)

### Summary

The diner pays a confirmed, unpaid order from its page with «Pagar $X». A modal shows the bill (order, promotions, total with the reservation's deposit included, E2) and Mercado Pago's Card Payment Brick. The brick tokenizes the card in Mercado Pago's iframes; the page sends the token to `POST /api/reservations/{id}/order/payments`, and the API charges `order.total` through Mercado Pago's `POST /v1/payments` with the test credentials. An approved payment marks the order `paid` (method `online`, `paid_amount`, `paid_at`), stores Mercado Pago's operation number, card brand and last four digits, and mails the receipt (E3). A rejected one keeps the order pending and the form unlocks for a retry. A payment in review blocks another one and is asked about again whenever the diner opens the order (E8, no webhooks). Once paid, the order is frozen (E6). Every cancellation of a paid order (the diner's, US-25; the restaurant's, US-38; a closure) returns the payment through Mercado Pago before it completes (E7), replacing the simulated refund of spec 023 for real payments.

### Technical context

- **Storage**: new table `payments` (migration `payments_20261123`), see [data-model.md](data-model.md#us-56-payments).
- **New dependencies**: none in `pyproject.toml` or `package.json`. The backend calls Mercado Pago's REST API with `urllib` (`app/services/mercadopago.py`); the frontend loads Mercado Pago's JS SDK from `https://sdk.mercadopago.com/js/v2`, as Mercado Pago requires for the card fields (`src/lib/mercadopago.ts`).
- **Configuration**: `MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_PUBLIC_KEY` (test credentials of the team's Mercado Pago Developers application). Locally they come from the git-ignored `.env` at the repository root through `docker-compose.yml`; in production from the optional SSM parameters `/servido-prod/mercadopago-access-token` and `/servido-prod/mercadopago-public-key` (`infra/ec2/deploy.sh`). Without them `GET /api/payments/config` returns `public_key: null` and the modal says electronic payment is not available.
- **Tests never reach Mercado Pago**: `tests/conftest.py` blanks the credentials and `tests/mercadopago_fake.py` stands in for the API, with the card token choosing the answer.

### Constitution check

| Principle | Gate | Pass |
| --- | --- | --- |
| I. Backlog-bound scope | US-56 only: pay, receipt, no double charge, refunds that real payments need. No wallet, installments, webhooks or production credentials | [x] |
| II. Spec before code | E1 changed with the team on 23/11 and recorded in the spec and `specs/README.md`; E6–E8 added. All pending PO validation | [x] |
| III. Every scenario tested | S1–S5 and the edge cases map to the tests below; the partial unique index `payments_one_live_per_order` enforces E4 in the database | [x] |
| IV. Humans own AI output | One service per concern (`mercadopago.py` talks HTTP, `payments.py` holds the rules); tried end to end against Mercado Pago's test environment | [x] |
| V. Simple, cheap, conventional | Free test environment, no SDK dependency, no background work: the in-review check runs on page load | [x] |

### Acceptance scenario → test map

| Scenario | Tests |
| --- | --- |
| US-56 S1 — start the card payment | `backend/tests/test_us56_electronic_payment.py::test_us56_s1_pending_online_order_can_start_the_card_payment` · `OrderPage.test.tsx` › `US-56 S1 opens Mercado Pago's card form for a pending electronic order` |
| US-56 S2 — total with the deposit before paying | `test_us56_s2_charges_the_order_total_with_the_deposit_included` · `US-56 S2 shows the total with the promotions and the deposit before paying` |
| US-56 S3 — approved, receipt | `test_us56_s3_approved_payment_marks_the_order_paid_with_a_receipt` · `US-56 S3 tells the payment was approved and shows its receipt` |
| US-56 S4 — rejected, retry | `test_us56_s4_rejected_payment_keeps_the_order_pending_and_allows_a_retry` · `US-56 S4 tells a rejected payment and keeps the form to retry` |
| US-56 S5 — no second charge, frozen order | `test_us56_s5_paid_order_is_not_charged_again_nor_changed` · `test_us56_s5_paid_order_has_one_approved_payment_in_the_database` · `US-56 S5 offers no new payment nor changes for a paid order` |
| Edges — cash order paid electronically (FR-009), in review (E8), Mercado Pago down or not configured, refused card data, card number never accepted (FR-014), cancelled and foreign reservations | `test_us56_edge_*` in the same module · `US-56 edge shows a payment in review…`, `US-56 edge says when electronic payment is not available` |
| Edges — refunds through Mercado Pago (E7): diner, restaurant, closure, failure keeps the reservation | `test_us56_edge_diner_cancellation_returns_the_payment`, `…_failed_refund_keeps_the_diner_reservation`, `…_restaurant_cancellation_returns_the_payment`, `…_closure_returns_the_payment_or_is_not_saved` · `CancelledReservationPage.test.tsx` › `US-56 edge says the payment was returned once the refund completed` |

### Project structure

```text
backend/
├── app/config.py                         # + mercadopago_* settings
├── app/models/payment.py                 # new: Payment
├── app/services/mercadopago.py           # new: charge, fetch, refund over HTTP
├── app/services/payments.py              # new: pay_order, settle (E8), receipt mail
├── app/services/refunds.py               # refunds an approved payment through Mercado Pago
├── app/services/{reservations,closures}.py  # refund before cancelling a paid order
├── app/services/orders.py                # a paid order is frozen (E6)
├── app/services/mail.py                  # + payment_receipt_mail
├── app/api/order.py                      # + GET /payments/config, POST …/order/payments
├── app/api/reservation.py                # 502 when the diner's refund fails; refund_status
├── migrations/versions/2026_11_23_1700-add_payments.py
└── tests/{test_us56_electronic_payment.py, mercadopago_fake.py, conftest.py}
frontend/src/
├── lib/mercadopago.ts                    # new: loads the SDK, mounts the brick
├── components/order/CardPaymentForm.tsx  # new: the brick with loading and error states
├── api/orders.ts                         # + fetchPaymentConfig, payOrder
├── pages/OrderPage.tsx                   # payment block: method, «Pagar $X», paid card row
├── pages/order/PaymentDialog.tsx         # bill ticket, card form, processing, rejected,
│                                         # approved (stamp + receipt), in review
├── components/order/Receipt.tsx          # + payment: the bill becomes the receipt
├── components/reservation/ConfirmationStamp.tsx  # + warn tone and clock for «En revisión»
└── pages/CancelledReservationPage.tsx    # «Te devolvimos el pago»
```

### Design notes

- **Checkout API with the Card Payment Brick, not Checkout Pro**: Checkout Pro redirects to Mercado Pago and needs public return URLs and a test buyer account; the brick stays inside the order page and works on localhost ([research.md](research.md#us-56-decisions)).
- **The payer email is typed in the brick**: Mercado Pago refuses addresses such as the demo diner's `cliente@servido.local`, so the brick asks for it instead of prefilling the account's.
- **The brick waits on a promise**: the page rejects it when the payment did not go through, which is what unlocks the brick for another try.
- **One brick per container**: React mounts effects twice in development, so a new mount waits for the previous one to finish.
- **Look (design canvas «Pago del pedido», 23/11)**: the bill is printed on the same cream paper as the order's receipt, with the deposit note; the outcome is stamped with `ConfirmationStamp` («Pagado» with sparkles, «En revisión» in amber with a clock); the approved payment prints `Receipt` as the receipt; a rejection shakes the bill, shows why and says nothing was charged, with a way to switch to cash. Mercado Pago's form takes the theme's colors, radii and dark mode through its `customVariables`, and its own title is hidden for ours. Every animation uses the motion tokens and stops with reduced motion.
- **The dialog mounts only while open**, so each payment starts fresh and a closed dialog leaves no text on the page.
