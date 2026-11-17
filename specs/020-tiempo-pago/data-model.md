# Data Model: Arrival and payment preference

**Feature**: 020-tiempo-pago | **Date**: 2026-11-14

This extends spec 009's reconciled `pedidos`/`pedido_items` model, not its superseded `orders` design. Existing primary keys, item snapshots, quantities, foreign keys and one-order/one-cart uniqueness remain intact. No reservation schedule or table fields change.

## Cart (`carts`) — private draft

| Added column | Type | Constraint / meaning |
| --- | --- | --- |
| `arrival_delay` | PostgreSQL interval / Python timedelta | NOT NULL, default interval zero; CHECK `arrival_delay >= INTERVAL '0 minutes' AND arrival_delay <= INTERVAL '30 minutes'` |
| `payment_method` | varchar(6) | NULL or CHECK `payment_method IN ('cash', 'online')`; no non-null default |

Selected arrival = reservation.starts_at + arrival_delay. The interval represents the exact difference between two aware instants, not a wall-clock timezone or calendar duration. Normalize API instants to UTC before subtraction. Do not accept interval input directly. PostgreSQL is the persistence boundary and checks the inclusive 0–30-minute range even outside the API. Also CHECK `EXTRACT(YEAR FROM arrival_delay) = 0 AND EXTRACT(MONTH FROM arrival_delay) = 0 AND EXTRACT(DAY FROM arrival_delay) = 0` on both tables: only the time component is allowed. This prevents mixed calendar intervals (for example one month minus 30 days) from passing interval comparison while producing a different arrival when added to a date.

Saving retains current P1 visibility, updated_at, one-cart uniqueness and P9 item snapshot semantics. Arrival-only or payment-only differences keep a cart even when items equal the confirmed order. Saving an empty first cart does not create a confirmed order. Discard removes all private metadata with its cart. Closed/cancelled carts remain hidden as before.

## Order (`pedidos`) — confirmed snapshot

| Added column | Type | Constraint / meaning |
| --- | --- | --- |
| `arrival_delay` | interval / timedelta | NOT NULL, default interval zero; same inclusive 0–30-minute CHECK |
| `payment_method` | varchar(6) | NULL or cash/online; no chosen default |
| `payment_status` | varchar(7) | NOT NULL, default pending; CHECK `payment_status IN ('pending', 'paid')` |

payment_method remains nullable at rest solely for private incomplete carts and pre-existing confirmed rows without a choice; it has no chosen default. Every NEW non-empty confirmation or reconfirmation must supply cash/online. Do not invent a cash/online backfill. P11 removal is not a new confirmed order and needs no new choice.

The existing `status` (confirmed/pending) is retained for compatibility and MUST NOT be used as payment_status. All diner-confirmed writes still use status=confirmed. Cancellation remains derived from Reservation. No draft status is added to Order.

`arrival_at` is the public derived aware datetime, not an extra column. `prep_start_time` already exists: keep it in sync at successful confirmation using arrival_at minus max known item time; if no item has time, use arrival_at. Reader helpers derive the same value from confirmed item snapshots. The selected arrival never updates Reservation.starts_at, ends_at, table identity or its request_id.

`payment_status` is the stored read projection for integration with future payment writers, not a payment transaction or collection mechanism. US-45 writes payment_method only. New orders start pending; reconfirmation never resets existing payment_status. Tests seed paid directly. A joint confirmation changing a paid method must be rejected atomically; same method does not itself cause a preference conflict. Dish/refund policies outside this spec remain owned by their stories. Enforce the paid preference freeze in the database as well: one BEFORE INSERT OR UPDATE payment guard on pedidos enforces a method on newly confirmed/reconfirmed non-empty orders (see Migration and deployment) and on UPDATE rejects `OLD.payment_status = 'paid' AND NEW.payment_method IS DISTINCT FROM OLD.payment_method`. Keep the service check for a Spanish 409; map the trigger violation to the same conflict if another writer races or bypasses the service. The trigger does not mark payments, prevent unrelated item updates or add a new deletion policy.

## Accepted confirmation (`order_confirmations`) — operation receipts

| Column | Type | Constraint / meaning |
| --- | --- | --- |
| `reservation_id` | UUID | FK reservations.id ON DELETE RESTRICT; first component of composite PK |
| `operation_id` | UUID | Second component of composite PK; supplied by client per deliberate confirmation |
| `request_digest` | varchar(64) | NOT NULL, CHECK length=64; SHA-256 hex of canonical semantic request |
| `accepted_at` | timestamptz | NOT NULL; server acceptance time in UTC |

A receipt is not a cached response and contains no JWT, contact details or copy of the order. No FK to Order: receipts survive empty-order removal and later recreation. Keep all accepted receipts for this MVP, without cleanup jobs or speculative TTL. Reservation ownership scopes every lookup; UUID knowledge never grants access. Register the new SQLAlchemy model in `app/models/__init__.py`.

Canonical digest: version-prefixed UTF-8 JSON with stable field ordering; include reservation_id, items sorted by dish_id, each item quantity/name/exact two-decimal unit price/nullable prep_time_minutes, arrival_at normalized to UTC with fixed microsecond precision, and payment_method (cash/online for non-empty confirmations; nullable only for P11 removal). Names remain exactly as shown; do not trim or case-fold snapshots. Exclude operation_id from semantic digest (it is the key), and exclude server response/state. Equivalent timezone representations and item ordering hash equally. SHA-256 uses Python standard library. Missing mandatory fields fail request validation before receipt lookup.

## Transaction protocols

### New confirmation, reconfirmation or P11 removal

1. Validate payload shape and aware datetime; authenticate/require diner and locate its reservation. Acquire existing reservation row FOR UPDATE, refreshing any identity-map state before deciding eligibility.
2. Look up `(reservation_id, operation_id)`. Matching digest: return current OrderPage with replay metadata and no writes, including no cart deletion. Different digest: 409 without mutation. No receipt: continue.
3. For a new non-empty confirmation/reconfirmation, reject missing/null payment_method with 400 and a Spanish selection error; leave confirmed state/cart/receipts untouched. P11 removal keeps its explicit-action semantics without requiring a choice. Sample current server time after lock. Validate confirmed reservation, now < starts_at minus 45 minutes, verified email, future arrival within inclusive bounds and current menu/snapshots as in P9. Keep existing has-menu behavior and limits. Failed checks leave no receipt.
4. Read current Order after the lock. Check paid method lock for any change of method. An empty first confirmation is 400; explicit confirmed-order removal keeps P11. Non-empty confirmation replaces items/arrival/method atomically, preserves existing paid state, updates confirmed_at and prep_start_time. Creation starts pending. Removal deletes Order, not Reservation or receipts.
5. Delete private cart as the existing confirmation does. Insert operation receipt in the SAME transaction and commit once. Return fresh page with `{operation_id, replayed: false}`. Transaction failure rolls back both state and receipt. Duplicate simultaneous attempts serialize on Reservation; database PK remains the final uniqueness defense.

An accepted replay after cutoff, cancellation, menu changes or deletion is read-only and returns the current page; it is not a new confirmation. Auth/ownership still apply. No P1 last-wins rule is changed for distinct operations.

### Payment-only update

Authenticate and lock Reservation first; refresh/read current Order, sample server time, require existing confirmed order, reservation not cancelled, now < ends_at, payment_status != paid. Update only payment_method and commit. Do not touch Cart, items, confirmed_at, arrival_delay or prep_start_time. Exact equality to ends_at is closed. No verified-email requirement is added to this method-only action; the existing verified-email check still gates confirmation.

If payment accrual races with a preference writer, the accrual must lock the same Reservation before reading/writing status. US-56/60 integration must adopt that protocol. No payment writer is delivered here.

### Concurrent edits

Keep P1 last accepted cart save / new confirmation wins. Cart and confirmed method are separate snapshots: a payment-only change does not silently rewrite another private draft. A later deliberate joint confirmation incorporates that draft's selection subject to paid lock. Replays never overwrite any later state, including a newer Cart. No merge/version-conflict feature is introduced.

## Migration and deployment

Generate a NEW Alembic revision from the actual head (`5061ebdc5acd` when inspected). Add arrival_delay with zero default to both tables: existing rows retain the reservation start as arrival, including historical rows. Add nullable methods, pending payment_status, CHECKs, the order-payment guard trigger/function and receipt table. The guard also rejects inserts of confirmed orders with null method, and updates that change confirmed_at to a new confirmation while keeping a null method. Untouched legacy rows may remain null; do not apply a global NOT NULL or assign fictitious choices. Keep the existing paid-method freeze in the same guard. Existing stored prep_start_time remains valid because old arrival remains unchanged. Do not backfill fictitious paid records or payment choices. Never edit the merged e0e674653e2f migration.

Review generated interval defaults/CHECKs explicitly; autogeneration may not capture every constraint. Verify upgrade on populated legacy tables, constraints on direct SQL writes, model/migration consistency and downgrade in disposable Postgres. Downgrade removes the new payment guard trigger/function and drops only new fields/receipt table and therefore loses selected metadata/history: it is a development rollback, not an automatic production recovery plan.

Migrate before deploying the matching API/frontend build. New confirmation contract requires operation_id and explicit metadata, so old browser tabs need a reload; malformed legacy requests return 400 rather than unprotected confirmation. No permanent legacy path that bypasses FR-007. Existing test factories must supply the new payload. No infrastructure or external dependency changes.
