# Implementation Plan: Diner Terms Acceptance

**Branch**: `013-us29-terminos-comensal` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

## Summary

Require explicit terms acceptance in diner email and Google registration, persist the server-owned
version and UTC timestamp atomically with the account, and expose the diner legal page through the
existing React Router shell. Reuse existing registration endpoints, API validation, design-system
components, and footer navigation.

## Technical Context

**Language/Version**: Python 3.12; TypeScript/React  
**Primary Dependencies**: FastAPI, Pydantic, SQLAlchemy 2, Alembic, React Router, Vitest, Testing Library  
**Storage**: PostgreSQL  
**Testing**: pytest against PostgreSQL; Vitest and Testing Library  
**Target Platform**: Docker-hosted FastAPI and Vite SPA  
**Project Type**: Web application  
**Performance Goals**: Preserve existing registration response behavior  
**Constraints**: 400 for invalid input, UTC timestamps, mobile-first accessible UI, no new dependencies  
**Scale/Scope**: Course MVP; two diner registration endpoints and one legal page

## Constitution Check

- Backlog-bound scope: PASS; changes implement US-29 and requested enablers only.
- Spec before code: PASS; the normalized spec is paired with these design artifacts.
- Every acceptance scenario tested: PASS; scenarios map to backend/frontend tests below.
- Humans own AI output: PASS; PR documentation will disclose AI-drafted legal text for review.
- Simple, cheap, conventional: PASS; existing endpoints and architecture are reused.

## Project Structure

```text
backend/app/models/diner.py
backend/app/schemas/auth.py
backend/app/services/terms.py
backend/app/api/auth.py
backend/app/main.py
backend/migrations/versions/2026_11_05_1716-add_terms_acceptance.py
backend/tests/test_terms_acceptance.py
frontend/src/components/ui/Checkbox.tsx
frontend/src/components/access/GoogleSignUpButton.tsx
frontend/src/pages/RegisterPage.tsx
frontend/src/pages/TermsPage.tsx
frontend/src/router.tsx
frontend/src/components/layout/SiteFooter.tsx
```

**Structure Decision**: Keep the existing backend/frontend web application structure. Terms remain
an account API concern and use the existing legal page area.

## Scenario-to-test mapping

| Spec scenario | Automated test |
| --- | --- |
| US-29 S1 | `test_us29_s1_terms_are_required_before_diner_registration` and legal-page frontend coverage |
| US-29 S2 | `TermsAcceptance.test.tsx` — `US-29 S2 starts unchecked and blocks diner registration` |
| US-29 S3 | `test_us29_s3_diner_registration_stores_terms_acceptance` |
| US-29 S4 | `test_us29_s4_google_registration_requires_terms` and `US-29 S4 blocks Google sign-up until terms are accepted` |
| US-29 S5 | Existing form state tests plus the unchecked checkbox test |

## Complexity Tracking

No constitution violations.
