# Quickstart Validation: US-34

This guide describes validation after implementation. The planning phase does not add the endpoints, migrations or tests described here.

## Prerequisites and setup

Use Docker Compose, Python 3.12 with uv and the frontend Node/npm setup documented in the repository. From the repository root:

```sh
make up-local
```

This runs the local demo stack with restaurant/diner accounts and email auto-verification. Use the accounts printed/documented by the seed workflow; do not put credentials or tokens in committed files. Web: `http://localhost:5173`; API: `http://localhost:8000`. Inspect existing UI primitives at `/diseno`.

For native test execution, install the existing dependencies with `uv sync` in `backend` and `npm ci` in `frontend`, then run from root:

```sh
make db
make migrate
```

Use two restaurant accounts to test isolation and one verified diner with a confirmed reservation more than 45 minutes ahead. Create two dishes in different categories through US-12. Confirm an order with at least two units of one dish and record its name, price, quantity, preparation time, total and preparation start. Keep another reservation's draft open for menu-change checks.

## Runnable automated validation

After implementation, run focused suites from the root:

```sh
(cd backend && uv run pytest tests/test_dish_management.py tests/test_menu.py tests/test_order.py tests/test_restaurant_orders.py tests/test_public_restaurants.py)
(cd frontend && npx vitest run src/pages/MenuPage.test.tsx src/pages/EditDishPage.test.tsx src/pages/OrderPage.test.tsx)
make api-types
make format lint test
```

Expected: every scenario in `plan.md` passes; formatting, linting and type checks succeed; generated contract/types match the backend. Inspect the generated diff and rerun generation only to check reproducibility if needed. Test files named above are planned implementation outputs, not present merely because this guide exists.

Apply the new migration on a local database with existing dishes/orders/carts and verify data remains. Exercise downgrade/upgrade on compatible disposable test data. With a reused removed name, downgrade must refuse before schema changes instead of deleting/renaming historical rows. See `data-model.md`.

## Browser validation

1. **S1/S2 — Edit and validate**: Open `/restaurante/menu`, choose “Editar”, change every editable field and save. Reload owner and public menus: values match. Empty name/category or nonpositive price must show correction messages without persisting changes. Test invalid precision/range, optional fields and an empty restrictions list. Replace, keep and remove a photo; invalid type or more than 5 MiB must preserve previous data.
2. **S3/S4 — Availability**: Mark a dish unavailable. It stays in the owner list with a text state, disappears publicly and cannot be selected for an order. Re-enable it: current data returns. If its category has no other available dishes, that public category disappears and returns with the dish.
3. **S5/S7 — Confirmation and cancellation**: Choose “Quitar plato”. Before confirmation inspect network activity: no DELETE. Cancel, Escape or dismiss: no mutation and dish remains.
4. **S6 — Remove and recreate**: Confirm removal. Both menus omit the dish after reload. Create a new dish through US-12 using its old name: creation succeeds with a new ID. Deleted detail/edit/availability must return 404; repeated DELETE by its owner returns 204.
5. **S8 — Historical integrity**: After each edit/disable/removal, read the original confirmed order as diner and through the existing restaurant order view. All recorded snapshot values, quantity, totals and preparation start remain unchanged.
6. **FR-008 — Draft reconciliation**: Keep a draft open, change its dish name/price/time as restaurant, then confirm the stale draft. It must fail, explain the changes and require another confirmation after review. Disable/remove a selected dish: it is removed from the draft with an explanation. Repeat with the last available dish: show the menu-change explanation and empty-menu state, retain the confirmed order and do not silently confirm an empty replacement.
7. **Isolation**: With the other restaurant's session, attempt detail/edit/availability/removal of the first restaurant's ID. Each returns 403 and changes nothing. Diner role returns 403; missing/expired authentication returns 401.
8. **Stale forms and no-op**: Open a dish in two sessions. Save a change in one and then save the other. Last saved editable values win and the latter displays the changed-since-open notice. Unchanged normalized saves succeed without incrementing revision. A stale form cannot restore a deleted dish.
9. **Interaction quality**: At 360 px and with keyboard only, verify labelled controls, visible focus, Modal focus return, loading/error states and reduced motion. Time representative operators editing a known dish; record whether at least 90% finish within one minute (SC-001). Automated tests alone do not prove that usability target.

Use the request fields/status codes in `contracts/dish-management.md` and order behavior in `contracts/ui-and-order-integration.md` when checking network requests. Do not run production mutations for this validation.
