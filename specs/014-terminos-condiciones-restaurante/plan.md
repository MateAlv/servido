# Implementation Plan: Restaurant Terms Acceptance

**Branch**: `014-terminos-condiciones-restaurante` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

## Summary

Require explicit terms acceptance in restaurant email and Google registration, persist the
server-owned version and UTC timestamp atomically with the account, and add the restaurant legal
page at `/terminos/restaurantes`. The implementation reuses the shared account fields, terms
service, checkbox, footer and API validation introduced for the diner flow.

## Technical Context

**Language/Version**: Python 3.12; TypeScript/React  
**Primary Dependencies**: FastAPI, Pydantic, SQLAlchemy 2, Alembic, React Router, Vitest, Testing Library  
**Storage**: PostgreSQL  
**Testing**: pytest against PostgreSQL; Vitest and Testing Library  
**Target Platform**: Docker-hosted FastAPI and Vite SPA  
**Project Type**: Web application  
**Performance Goals**: Preserve existing registration response behavior  
**Constraints**: 400 for invalid input, UTC timestamps, accessible mobile-first UI, no new dependencies  
**Scale/Scope**: Course MVP; two restaurant registration endpoints and one legal page

## Constitution Check

- Backlog-bound scope: PASS; changes implement US-26 and its requested enablers.
- Spec before code: PASS; the normalized spec is paired with design artifacts.
- Every acceptance scenario tested: PASS; each scenario maps to backend/frontend tests below.
- Humans own AI output: PASS; PR documentation will disclose AI-drafted legal text for review.
- Simple, cheap, conventional: PASS; shared diner infrastructure is reused.

## Project Structure

```text
backend/app/models/restaurant.py
backend/app/schemas/restaurant.py
backend/app/api/restaurant.py
backend/tests/test_terms_acceptance.py
frontend/src/pages/RestaurantRegisterPage.tsx
frontend/src/pages/RestaurantTermsPage.tsx
frontend/src/router.tsx
```

**Structure Decision**: Keep the existing web application structure. Restaurant-specific behavior
is added beside the current restaurant registration and legal page code, with shared acceptance
infrastructure reused.

## Scenario-to-test mapping

| Spec scenario | Automated test |
| --- | --- |
| US-26 S1 | `US-26 S2 starts unchecked and blocks restaurant registration` plus the legal route |
| US-26 S2 | `test_us26_s1_terms_are_required_before_restaurant_registration` |
| US-26 S3 | `test_us26_s3_restaurant_registration_stores_terms_acceptance` |
| US-26 S4 | `test_us26_s4_google_registration_requires_terms` and `US-26 S4 blocks Google sign-up until terms are accepted` |
| US-26 S5 | Existing restaurant form state tests plus the acceptance checkbox |

## Complexity Tracking

No constitution violations.
