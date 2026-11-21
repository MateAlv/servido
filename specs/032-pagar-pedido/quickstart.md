# Quickstart: try US-60 locally

**Feature**: `specs/032-pagar-pedido` | **Date**: 2026-11-21

## Prerequisites

```bash
make up-local      # Postgres + API + web, with demo data and diners verified
```

Demo diner: `demo@servido.local` / `Demo12345`. Web on <http://localhost:5173>, API docs on
<http://localhost:8000/api/docs>.

## Scenario 1 — the diner pays in cash

1. Sign in as the demo diner and open a confirmed reservation with a pre-order
   (`/reservas/<id>/pedido`).
2. Modify the dishes, continue to «2. Revisar y confirmar».
3. Choose «Efectivo». The review step reads «Abonás $X en efectivo en el local.» with the total.
4. Confirm the order. The confirmed step shows «Pendiente de pago» and the same cash note with the
   frozen total.

## Scenario 2 — the restaurant sees the pending cash order

1. Sign in as the demo restaurant and open `/restaurante/pedidos`.
2. Open «Ver detalle» of that order.
3. The detail shows «Pendiente de pago» and «Abona en efectivo en el local: $X». The order is not
   marked as paid.

## Scenario 3 — switching to electronic

1. As the diner, open the confirmed order and choose «Modificar medio de pago».
2. Pick «Pago electrónico» and save. The order is still «Pendiente de pago»; only the method
   changed. (Processing the electronic charge is US-56, not built yet.)

## Automated checks

```bash
cd backend && uv run pytest tests/test_us60_cash_payment.py
cd frontend && npm run test -- OrderPage RestaurantOrdersPage
make lint test
```

Expected: every US-60 scenario is green and the existing US-45 / US-22 tests still pass.
