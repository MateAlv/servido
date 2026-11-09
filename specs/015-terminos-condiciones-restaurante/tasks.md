---
description: "Task list for restaurant terms acceptance"
---

# Tasks: Restaurant Terms Acceptance (US-26)

**Input**: Design documents from `/specs/015-terminos-condiciones-restaurante/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Phase 1: Shared foundation from PR 1

- [ ] T001 Confirm `terms_version` and `terms_accepted_at` plus the paired-value check constraint are present for `restaurantes` in `backend/app/models/restaurant.py` and the Alembic migration
- [ ] T002 Confirm `app/services/terms.py` exposes the restaurant version `1.0` and UTC acceptance helper
- [ ] T003 Confirm the shared accessible `Checkbox` is exported from `frontend/src/components/ui/index.ts`

**Checkpoint**: US-26 can use the shared acceptance infrastructure from the diner delivery.

---

## Phase 2: US-26 — Confirmación de términos y condiciones 🎯

**Goal**: Restaurant registration visibly requires explicit acceptance, stores the current server version and timestamp, and provides readable adhesion terms without losing form state.

**Independent Test**: From `/suma-tu-local`, verify the unchecked checkbox, open `/terminos/restaurantes` in a new tab, submit once without acceptance, then accept and complete email and Google registration; existing restaurant sign-in remains unchanged.

### Tests for US-26

- [ ] T004 [P] [US26] Add backend tests named `test_us26_s1` through `test_us26_s4` for required acceptance, persisted acceptance, and Google registration in `backend/tests/test_terms_acceptance.py`
- [ ] T005 [P] [US26] Add `test_us26_edge_failed_registration_saves_no_acceptance` in `backend/tests/test_terms_acceptance.py`
- [ ] T006 [P] [US26] Add frontend tests named `US-26 S1` through `US-26 S5` for the legal route, unchecked checkbox, blocked email/Google registration, and preserved form state in `frontend/src/pages/TermsAcceptance.test.tsx`

### Implementation for US-26

- [ ] T007 [US26] Add `terms_accepted: Literal[True]` to restaurant email and Google schemas in `backend/app/schemas/restaurant.py` and persist version `1.0` plus UTC acceptance in `backend/app/api/restaurant.py`
- [ ] T008 [US26] Add the restaurant acceptance checkbox, `/terminos/restaurantes` new-tab link, blocked email submit, and Google guard in `frontend/src/pages/RestaurantRegisterPage.tsx`
- [x] T009 [US26] Create Spanish restaurant version 1.0 legal copy in `frontend/src/pages/RestaurantTermsPage.tsx`
- [ ] T010 [US26] Register `/terminos/restaurantes` as a lazy route in `frontend/src/router.tsx` and retain both legal links in `frontend/src/components/layout/SiteFooter.tsx`
- [ ] T011 [US26] Regenerate `frontend/src/api/openapi.json` and `frontend/src/api/schema.d.ts` with `make api-types`

**Checkpoint**: All US-26 scenarios and the failed-registration edge case pass.

---

## Phase 3: Wrap-up

- [ ] T012 Run `make format lint test` and fix only feature-related failures
- [ ] T013 Run `specs/015-terminos-condiciones-restaurante/quickstart.md` and update design artifacts if implementation diverged
- [ ] T014 Complete the PR template with scenario-to-test mapping, AI usage, legal-text review note, and checklist

## Dependencies & Execution Order

- T001–T003 must be complete on the post-PR1 base before US-26 implementation.
- T004–T006 are parallel test-writing tasks and should fail before implementation.
- T007 precedes T011; T008–T010 can proceed in parallel after the shared foundation.
- T012–T014 wait for all US-26 work.

## Parallel Opportunities

```text
T004 + T005 + T006
T007 + T008 + T009
```

## Implementation Strategy

1. Verify the shared PR1 foundation on `main`.
2. Add restaurant API enforcement and persistence.
3. Add restaurant UI, legal route and tests.
4. Regenerate API types and run focused then full validation.
