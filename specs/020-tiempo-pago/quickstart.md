# Quickstart validation: US-43 and US-45

**Date**: 2026-11-14 | **Status**: implemented and automated verification performed; human/browser review remains pending.

## Prerequisites and setup

Use the repository toolchain (Python 3.12 + uv, Node/npm, Docker/Postgres). From repository root run `make up-local` for seeded local mode, or `make db`, `make migrate`, then start backend and frontend with the commands in AGENTS.md. A verified diner, a restaurant with a current/future shift, table inventory and available dishes are required. Local auto-verification is a local-mode convenience; production email rules remain unchanged.

For a native setup, use separate terminals:

```sh
make db
make migrate
```

```sh
cd backend
uv run uvicorn app.main:app --reload
```

```sh
cd frontend
npm run dev
```

No real charges are required or supported by US-45.

## Automated validation

After implementing schema/router changes, regenerate with `make api-types`. Run focused backend and frontend suites first:

```sh
cd backend
uv run pytest tests/test_order_timing_payment.py tests/test_order.py tests/test_restaurant_orders.py
```

```sh
cd frontend
npx vitest run src/pages/OrderPage.test.tsx src/lib/useOrderCart.test.ts src/pages/RestaurantOrdersPage.test.tsx
```

Run migration upgrade against populated legacy test data and direct DB checks described in data-model.md. Use disposable database for downgrade. Check `uv run alembic heads` (one head), `uv run alembic upgrade head` and `uv run alembic check` from backend, matching the existing CI migration checks. At completion run the repository-required checks:

```sh
make format lint test
```

`make format` can change tracked files, so inspect its diff before committing. These commands are future validation instructions, not test results of this planning pass.

## Arrival and confirmation journey

1. Book a real restaurant sufficiently ahead (for example tomorrow at 21:00), open the order page at «Armar pedido» and add dishes with 10 and 25 minute times and one without a time. Arrival/payment controls must be absent. Select «Continuar» to review the dish summary, then choose arrival and payment. Return with «Volver a editar platos» and verify every draft change survives. Before confirming, show original reservation 21:00–22:30 separately from selected arrival.
2. Select arrival 21:10. Restaurant still sees only the previous confirmed order, if one exists. Reload and sign back in to verify the private cart restores arrival/items/preference.
3. Attempt confirmation with no method: reject it with «Seleccioná un medio de pago para confirmar tu pedido.» and preserve the saved draft. Choose cash, then confirm. Arrival becomes 21:10, preparation starts 20:45, estimate remains 25 minutes regardless of quantity, and method is cash with payment still pending. Reservation times/table are unchanged.
4. Reopen in confirmed consultation, select «Modificar platos» (or «Continuar editando platos» for an existing draft), continue to review and change only arrival to 21:30, retaining the selected method, then reconfirm. New arrival/preparation become visible together to the restaurant. Existing P9 checks still apply if the menu changed before this reconfirmation.
5. With a selected method, confirm an all-no-time order: allow it, hide estimated time, use arrival as preparation start. Verify first-empty confirmation is rejected and explicit removal of an existing order preserves the reservation.
6. Exercise arrivals at start, start+15 and start+30 minutes (valid), before start and immediately after +30 minutes (invalid). For a 20:00–21:30 reservation, accepted arrivals run from 20:00 through 20:30 and the end remains 21:30. Also exercise the server cutoff at exactly 45 minutes before original start (closed). Tests control clock; do not wait in real time.
7. Navigate away/back: confirmed state comes from server data; no repeated success announcement is necessary to prove it remains confirmed.

## Payment preference journey

1. Initially neither cash nor online is selected; save/reload this incomplete draft, then verify it cannot be confirmed until a method is chosen. Choose online privately in cart: restaurant must not see it until confirmation.
2. After confirmation show online separately from «Pendiente de pago». Explain that selecting online does not perform a payment.
3. From read-only confirmed consultation, open «Modificar medio de pago», select cash and choose «Guardar cambio» without entering dish editing. Verify «Cancelar» leaves the confirmed method unchanged, a successful save is acknowledged, and an error preserves it and allows correction/retry. Platos, llegada, confirmed_at and any separate private draft remain unchanged. No reconfirmation is required.
4. With frozen test clock after dish cutoff and during visit, allow this change. At exact reservation end, cancel, no confirmed order, or seeded paid state, reject it. No production button/endpoint sets paid in this story.
5. Check restaurant list/detail read the same confirmed method/status and arrival/preparation. Private edits remain invisible.

## Retry, concurrency and session recovery

Use the documented contract and automated fixtures; no production payment or manual DB edits on live data.

- Submit operation A successfully, then B and a payment-only change. Replay A with the exact same UUID/body: return current B/payment state, replayed=true; do not change confirmed_at, items or cart. Reuse A UUID with altered semantic body: 409.
- Remove the order with operation C and replay A: return order=null, do not recreate it. Create a new order D and replay A: preserve D. Replay after deadline/cancellation/menu change remains read-only.
- Simulate network loss after commit. Retry retains the exact pending operation snapshot and bypasses cart-save/discard. A new deliberate confirmation uses another UUID. Recovery cancels pending autosaves/unstarted stale writes, drains in-flight requests and suppresses stale pagehide flush. A 401 on retry retains the same pending identity through login; verify lost commit response → retry 401 → login → same operation replay. Reload/authentication return fetches current state before handling an unresolved retry.
- Expire session before server acceptance: 401 and no receipt/order mutation; server-saved draft remains recoverable. Expire after an accepted response was lost: do not assume failure or restore old order contents.
- Use two real DB connections and barriers to test serialized duplicate/new confirmation and payment races; do not rely on sleeps or the single-transaction TestClient fixture to demonstrate concurrent commits.

## Browser and review pass

At 360px and desktop, use keyboard through build → review → back, arrival input, required payment choices, confirmation and explicit removal dialog. Verify that confirmed consultation never shows draft payment controls and editing never shows confirmed payment controls. Test an out-of-range time and its specific field error, with no invalid autosave request. Check focus/errors/announcements, reduced motion, no accidental default cash, no overlap with fixed order bar, and payment editor availability in closed-dish view. Review the 11 agreements (including revised answers 1 and 6) and pending formal approval with a teammate. Actual payment-accreditation end-to-end verification remains a later integration dependency.

Payload details and errors: [contracts/order-api.md](contracts/order-api.md). Persistence/transaction details: [data-model.md](data-model.md). Scenario-to-test traceability: [plan.md](plan.md).

## Execution evidence — 2026-11-14

Docker Desktop/WSL2 was available and the existing Docker PostgreSQL 17 service was healthy. All implementation migrations/tests used `servido_test`; the application database was not migrated or used for tests. No local PostgreSQL installation or system configuration change was made. `make test` starts Docker PostgreSQL and invokes the test suites; it does not create `servido_test`. That database must already exist locally before running backend tests. Backend test startup defaults to `servido_test` and refuses a different database name, including an explicitly supplied unsafe DATABASE_URL; the test session applies migrations to it. CI provisions and explicitly selects `servido_test`.

New revision `459c8cb1f9cf` upgrades from `5061ebdc5acd`. A real-Postgres automated test clones only the required legacy tables into its own disposable schema inside `servido_test`, verifies legacy zero-delay/null-method/pending preservation, upgrades, downgrades and upgrades again, then drops only that schema. `alembic check` reported no new upgrade operations. Two-connection tests prove duplicate-operation serialization, last accepted deliberate confirmation, and the future paid-writer locking protocol.

API contract/types were regenerated. Mandatory formatting, lint/type checks, full backend/frontend tests and the production build were run; final results: **429 backend tests passed**, **365 frontend tests passed**. `make format lint test`, regenerated API types, `alembic check` and `npm run build` passed. Vite reports a non-blocking chunk-size warning. The 12 acceptance scenarios have automated coverage, alongside spec 009 regressions. Test-only login clock stabilization follows an existing fixture pattern; production authentication is unchanged.

Pending: actual browser checks at 360px/desktop, keyboard, reduced motion and SC-001 elapsed journey; no browser runtime was available in this execution. JSDOM interaction tests and production build do not establish visual/mobile conformance. Independent teammate review and formal PO/team validations remain pending; no approval is inferred from passing tests.

Rollout: apply the new migration before deploying the matching API/frontend. Reload old tabs because confirmation now requires metadata and an operation UUID; do not introduce a non-idempotent fallback. Actual payment accreditation remains outside US-45: future authoritative writers must lock Reservation first and then update Order.payment_status transactionally. Until integrated, paid fixtures prove the restriction, not a real collection flow. No commit, push or deployment was performed.

## Frontend UX follow-up verification

The two-stage/confirmed-consultation follow-up passed all **368 frontend tests across 47 files** (`npx vitest run`), `npm run lint`, `npm run format:check`, `npm run typecheck` and `npm run build`. The three new tests cover round-trip navigation with draft metadata, local invalid-arrival handling/inclusive upper bound, and confirmed-only payment editing with an independent private draft. Existing page scenarios were adapted to explicitly navigate to review before confirming, and to enter dish editing from confirmed consultation. Page/component formatting was applied only to the affected frontend files. Vite reports the existing non-blocking large-chunk warning.

No backend suite was rerun for this frontend-only follow-up. No backend, migration, API, Makefile or infrastructure changes were made. Actual browser layout, keyboard/reduced-motion checks and the browser-specific native time picker still require manual verification; no visual pass is claimed from JSDOM. No commit or push was made.

Payment-editor follow-up: **377 frontend tests passed across 47 files**, plus lint, format check, type check and production build. Confirmed payment selection now uses a dedicated save/cancel modal; tests cover cancellation, server/network errors, successful save, preserved joint-confirmation preference, restrictions and conflict refresh without discarding private drafts. No backend tests were rerun. Visual alignment, long dish names/amounts, modal focus and responsive layout still require a real-browser pass at 360px and desktop. The existing non-blocking Vite bundle-size warning remains.
