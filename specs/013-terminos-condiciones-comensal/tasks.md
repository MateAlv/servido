---
description: "Task list for diner terms acceptance"
---

# Tasks: Diner Terms Acceptance (US-29)

**Input**: Design documents from `/specs/013-terminos-condiciones-comensal/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Phase 1: Foundational

- [ ] T001 [P] Add nullable `terms_version` and `terms_accepted_at` plus the paired-value check constraint to `backend/app/models/diner.py` and generate/review the Alembic migration in `backend/migrations/versions/` with `make migration m="add terms acceptance"`
- [ ] T002 [P] Add the diner terms version constant and UTC acceptance helper in `backend/app/services/terms.py`
- [ ] T003 Add the shared Spanish validation mapping for missing or false `terms_accepted` in `backend/app/main.py`

**Checkpoint**: The database and request validation can represent an explicit diner acceptance without affecting legacy accounts.

---

## Phase 2: US-29 — Leer términos y condiciones 🎯

**Goal**: Diner registration visibly requires explicit acceptance, stores the current server version and timestamp, and provides readable terms without losing form state.

**Independent Test**: From `/registrarme`, verify the unchecked checkbox, open `/terminos` in a new tab, submit without acceptance, then accept and complete email and Google registration; sign-in for an existing account remains unchanged.

### Tests for US-29

- [ ] T004 [P] [US29] Add backend tests for `test_us29_s1_terms_are_required_before_diner_registration` and `test_us29_s2` invalid acceptance responses in `backend/tests/test_terms_acceptance.py`
- [ ] T005 [P] [US29] Add backend test `test_us29_s3_diner_registration_stores_terms_acceptance` in `backend/tests/test_terms_acceptance.py`
- [ ] T006 [P] [US29] Add backend test `test_us29_s4_google_registration_requires_terms` in `backend/tests/test_terms_acceptance.py`
- [ ] T007 [P] [US29] Add frontend tests named `US-29 S1` through `US-29 S5` for the legal link, unchecked checkbox, blocked submit, Google guard, and preserved form state in `frontend/src/pages/TermsAcceptance.test.tsx`
- [ ] T008 [P] [US29] Add edge tests `test_us29_edge_login_does_not_ask_terms` and `test_us29_edge_existing_accounts_can_sign_in` in `backend/tests/test_terms_acceptance.py`

### Implementation for US-29

- [ ] T009 [US29] Add `terms_accepted: Literal[True]` to diner email and Google registration schemas in `backend/app/schemas/auth.py` and persist version `1.0` plus UTC acceptance in `backend/app/api/auth.py`
- [ ] T010 [US29] Add the diner acceptance columns and paired-value database constraint through `backend/migrations/versions/2026_11_05_1716-add_terms_acceptance.py`
- [ ] T011 [US29] Add reusable accessible `Checkbox` and styles in `frontend/src/components/ui/Checkbox.tsx`, `Checkbox.module.css`, and `frontend/src/components/ui/index.ts`
- [ ] T012 [US29] Add the acceptance checkbox, new-tab `/terminos` link, blocked email submit, and Google guard to `frontend/src/pages/RegisterPage.tsx`, `frontend/src/components/access/GoogleSignUpButton.tsx`, and `frontend/src/components/access/GoogleSignUpFeedback.tsx`
- [x] T013 [US29] Replace the provisional diner legal copy in `frontend/src/pages/TermsPage.tsx` with Spanish version 1.0 text
- [ ] T014 [US29] Register `/terminos` as a lazy route in `frontend/src/router.tsx`, add both legal links in `frontend/src/components/layout/SiteFooter.tsx`, and document `Checkbox` in `docs/design/README.md` and `frontend/src/pages/DesignSystemPage.tsx`
- [ ] T015 [US29] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`

**Checkpoint**: All US-29 scenarios and edge cases pass without requiring terms acceptance at login.

---

## Phase 3: Wrap-up

- [ ] T016 Run `make format lint test` and fix only feature-related failures
- [ ] T017 Run the commands in `specs/013-terminos-condiciones-comensal/quickstart.md` and update the design artifacts if implementation details diverged
- [ ] T018 Update `specs/README.md`, `specs/001-acceso-comensal/spec.md`, and `AGENTS.md` with the new spec, route, endpoint, and PO-pending proposals

## Dependencies & Execution Order

- Foundational tasks T001–T003 block US-29 implementation.
- Tests T004–T008 can be written in parallel, then should fail before implementation.
- T009–T010 precede API contract generation T015; T011 can proceed in parallel with backend work.
- T012–T014 depend on the shared checkbox and API shape; T016–T018 wait for all feature work.

## Parallel Opportunities

```text
T001 + T002
T004 + T005 + T006 + T007 + T008
T009 + T011
T013 + T014
```

## Implementation Strategy

1. Establish the nullable, constrained account fields and server-owned terms version.
2. Verify failing registration and acceptance tests.
3. Implement diner API persistence and frontend registration/legal flow.
4. Regenerate the contract, run the focused quickstart checks, then the full required suite.
