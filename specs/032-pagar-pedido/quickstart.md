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

## US-56 — pay electronically (Mercado Pago test environment)

1. Put the test credentials of the Mercado Pago application in `.env` at the repository root (git-ignored), then `make up-local`:

   ```text
   MERCADOPAGO_PUBLIC_KEY=TEST-…
   MERCADOPAGO_ACCESS_TOKEN=TEST-…
   ```

2. Sign in as the demo diner, open a confirmed reservation whose order uses «Pago electrónico» and press «Pagar $X». The modal shows the total with «Incluye la seña de tu reserva» and Mercado Pago's form.
3. Open «Tarjetas de prueba» in the dialog (only with test credentials) and pay with one of them: Visa `4509 9535 6623 3704`, expiry `11/30`, code `123`, DNI `12345678`, any valid email that is not the Mercado Pago account's (for example `comprador@example.com`).
   - Holder `OTHE`: «Mercado Pago rechazó el pago…»; the order stays «Pendiente de pago» and «Pagar» works again.
   - Holder `APRO`: the order shows «Pagado» with the operation number, the card and the date; dishes and method can no longer change, and the receipt is printed in the API log (console mail).
   - Holder `CONT`: «Tu pago está en revisión»; reopening the order asks Mercado Pago again.
4. Cancel the reservation from «Mis reservas»: the payment shows as refunded in Mercado Pago and the cancelled reservation reads «Te devolvimos el pago».
