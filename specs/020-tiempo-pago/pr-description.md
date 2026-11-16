## What

Diners confirm an arrival between the original reservation start and 30 minutes later, together with dishes and an explicitly selected cash/online preference. Private draft metadata stays private; accepted-operation retries return current state, and unpaid confirmed payment preferences can change independently until reservation end. Online selection never collects money.

**Spec**: `specs/020-tiempo-pago` · **US**: US-43, US-45

## Acceptance scenarios covered

- [x] US-43 S1 — `US-43 S1 previews arrival and dishes before confirmation` (OrderPage.test.tsx)
- [x] US-43 S2 — `test_us43_s2_confirms_arrival_and_items_atomically`
- [x] US-43 S3 — `test_us43_s3_uses_confirmed_arrival_and_slowest_known_dish`
- [x] US-43 S4 — `test_us43_s4_reconfirms_arrival_without_changing_dishes`
- [x] US-43 S5 — `test_us43_s5_rejects_first_empty_confirmation` and `test_us43_s5_removes_existing_order_without_changing_reservation`
- [x] US-43 S6 — `test_us43_s6_rejects_arrival_outside_window_or_not_future`
- [x] US-43 S7 — `US-43 S7 shows confirmed state on a return visit` (OrderPage.test.tsx)
- [x] US-45 S1 — `US-45 S1 offers cash and online without preselection` (OrderPage.test.tsx)
- [x] US-45 S2 — `test_us45_s2_saves_private_preference_then_confirms_it` and `test_us45_s2_rejects_confirmation_without_method`
- [x] US-45 S3 — `test_us45_s3_reads_confirmed_method_and_private_cart_separately`
- [x] US-45 S4 — `test_us45_s4_changes_only_method_during_visit_before_end`
- [x] US-45 S5 — `test_us45_s5_paid_order_rejects_method_change`

Backend scenario tests are in `backend/tests/test_order_timing_payment.py`. Additional tests cover two-session serialization, migration round trips, lost responses, expired sessions, account switching, restaurant privacy and database constraints. Full validation: 429 backend and 365 frontend tests passed; format/lint/type checks, API regeneration, Alembic check and production build passed. Vite retains a non-blocking bundle-size warning. See quickstart.md for execution evidence.

Migration `459c8cb1f9cf` adds bounded arrival delays, nullable draft/legacy preference, separate authoritative payment status, accepted-operation receipts and payment guards. Untouched historical orders retain null preference. Apply the migration before deploying the matching API/frontend, and reload stale tabs. Future payment writers must lock Reservation before changing authoritative payment status; no collection writer is included.

## AI usage

- **Tools and models**: Codex coding agent; exact runtime model identifier is not exposed in this session.
- **Key prompts**: Implement spec 020 using its 11 agreements, preserve spec 009, require payment selection and a 0–30-minute arrival window; resume interrupted work using Docker PostgreSQL 17 and only `servido_test`; no commit/push.
- **What the AI generated**: Models/migration, service and API extensions, generated contract/types, cart recovery and payment/arrival UI, automated tests, test-database safety and implementation documentation.
- **What a human reviewed or changed, and why**: The team supplied the functional agreements and revised arrival/payment rules. Independent review of this implementation, actual browser validation and formal approval of the recorded agreements remain pending. No generated output is claimed as human-reviewed.

## Checklist

- [x] `make lint test` passes locally (final run evidence in quickstart.md)
- [x] Spec, plan and tasks reflect what was built
- [x] `make api-types` was run if the API changed
- [ ] UI text is in Spanish and the screens work at phone width (Spanish text implemented; real browser pass pending)
- [x] No secrets or `.env` files committed (no commit was made)

This is a local handoff draft; no PR was opened, no commit/push/deployment was performed. T001/T044 remain pending for formal validation and browser checks. Independent teammate review remains mandatory in the normal PR process; PR review and approval have not occurred. The redundant standalone T045 implementation task was removed without waiving this requirement.
