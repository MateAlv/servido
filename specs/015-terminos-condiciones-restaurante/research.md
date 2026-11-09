# Research: Restaurant Terms Acceptance

## Decision: Extend the existing restaurant registration endpoints

`POST /api/restaurantes` and `POST /api/restaurantes/google` receive the same server-validated
`terms_accepted: Literal[True]` field used by the diner flow. Existing restaurant sign-in endpoints
remain unchanged.

**Rationale:** It preserves the established API and keeps acceptance atomic with account creation.

**Alternatives considered:** A separate acceptance endpoint would allow an account without a
required acceptance and would add an unnecessary workflow for the MVP.

## Decision: Reuse the shared terms service and checkbox

Restaurant registration stores the restaurant role's `1.0` version and UTC timestamp using
`app/services/terms.py`, while the frontend reuses the shared `Checkbox` component and footer.

**Rationale:** The two roles have the same acceptance invariant, with different legal copy and
routes only.

**Alternatives considered:** Role-specific checkbox implementations would duplicate accessibility
and focus behavior.

## Decision: Lazy restaurant legal page

`/terminos/restaurantes` is a lazy React Router route, and the registration link opens a new tab.

**Rationale:** This matches the requested navigation and preserves all form state while reading.
