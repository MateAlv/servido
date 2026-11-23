# 0010 — Electronic payments with Mercado Pago's test environment

- **Status**: Accepted
- **Date**: 2026-11-23

## Context

US-56 (spec 032) asks the diner to pay the pre-order electronically, with the reservation's deposit included, and to get the receipt. The first proposal in the spec (E1) was a checkout simulated inside Servido!. On 23/11 the team chose a real integration in its test environment, so the demo shows an actual payment provider without moving money. The constraints stay the same: no paid services, no background workers, nothing a teammate can't explain.

## Decision

- **Provider**: Mercado Pago, the usual choice in Argentina, through its **test environment** only. The team's application in Mercado Pago Developers (Checkout API, Payments API) belongs to a member's personal account; its test credentials are the only ones used.
- **Card form**: Mercado Pago's Card Payment Brick, loaded from `https://sdk.mercadopago.com/js/v2` inside the order page. The card fields live in Mercado Pago's iframes and hand back a one-time token, so Servido! never receives the card number or the security code.
- **Charge and refund**: the API calls Mercado Pago's REST API (`POST /v1/payments`, `GET /v1/payments/{id}`, `POST /v1/payments/{id}/refunds`) with the access token, using the standard library, with an idempotency key per attempt.
- **No webhooks**: a payment left in review is asked about again when the diner opens the order.
- **Secrets**: `MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_PUBLIC_KEY` come from the git-ignored `.env` locally and from optional SSM parameters in production (`infra/README.md`). Without them, electronic payment says it is not available.

## Consequences

- **No new package**: three HTTP calls and one script tag do not justify Mercado Pago's SDKs.
- **Payment depends on Mercado Pago being reachable**: when it is not, the order stays pending and the diner can retry or pay in cash.
- **Only test money**: production credentials, the wallet, installments and other payment methods are out of scope (spec 032, boundaries). Going live would need a production activation in Mercado Pago, webhooks and a public notification URL.
- **Refunds of real payments go through Mercado Pago** for every cancellation of a paid order; the simulated refund of spec 023 remains only for paid orders without a Mercado Pago payment (demo data).
- **Cost**: none; the test environment is free.
