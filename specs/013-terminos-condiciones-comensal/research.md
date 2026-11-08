# Research: Diner Terms Acceptance

## Decision: Reuse the existing registration and authentication surfaces

The existing FastAPI registration endpoints remain the source of truth. The request schemas add
`terms_accepted: Literal[True]`, while the existing validation handler translates missing or false
values to the Spanish 400 message required by the user flow.

**Rationale:** This preserves the current API shape and the repository-wide 400 validation policy
without adding a separate terms endpoint or client-side-only enforcement.

**Alternatives considered:** A dedicated acceptance endpoint would allow accounts to be created
before acceptance and would not satisfy the atomic registration requirement. Sending the terms
version from the browser would duplicate server policy and was explicitly rejected.

## Decision: Store acceptance on the account

`comensales.terms_version` and `comensales.terms_accepted_at` are nullable for legacy accounts and
are populated in the same transaction as new registrations. A database check constraint prevents a
partial pair.

**Rationale:** The MVP needs only one current version per role and no re-acceptance workflow.

**Alternatives considered:** A separate acceptance table would add unnecessary relationships and
does not improve the required behavior for this single-user MVP.

## Decision: Keep the current terms version in a backend service constant

`app/services/terms.py` exposes the diner version (`"1.0"`) and returns a UTC timestamp for account
creation.

**Rationale:** The server controls the version and the client cannot forge it.

**Alternatives considered:** Database configuration and a client-supplied version add moving parts
without a requirement in the spec.

## Decision: Use a new-tab legal link and a lazy legal route

The registration checkbox label links to `/terminos` with `target="_blank"` and `rel="noopener"`.
The legal page is loaded through React Router's existing lazy route pattern.

**Rationale:** The registration state remains mounted while the user reads the long text, and the
route follows the existing frontend architecture.

**Alternatives considered:** An in-form modal would make long legal text harder to navigate on a
phone and would not be the requested page behavior.
