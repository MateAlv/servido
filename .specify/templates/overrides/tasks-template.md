---

description: "Task list template for feature implementation (Servido! project override)"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: REQUIRED. The constitution (principle III) requires at least one automated test per acceptance scenario, named after its US and scenario. Always generate test tasks.

**Organization**: One phase per user story, in the order of spec.md, so each story can be implemented, tested and demoed on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: The backlog US number, e.g. `[US5]` for US-5
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/api/`, `backend/app/models/`, `backend/app/schemas/`, `backend/app/services/`, `backend/migrations/versions/`, `backend/tests/test_<feature>.py`
- **Frontend**: `frontend/src/pages/`, `frontend/src/components/`, `frontend/src/router.tsx`, tests next to the component as `*.test.tsx`
- **Contract**: `frontend/src/api/openapi.json` and `schema.d.ts`, regenerated with `make api-types`, never edited by hand
- **Commands**: `make migration m="..."`, `make api-types`, `make lint`, `make test`

<!--
  ============================================================================
  The tasks below are SAMPLES. /speckit-tasks MUST replace them with real tasks
  from spec.md, plan.md, data-model.md and contracts/. Do not keep sample tasks.
  ============================================================================
-->

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Shared pieces that every story of this feature needs. Skip the phase if there are none; the repository is already set up.

- [ ] T001 Create [Entity] model in backend/app/models/[entity].py and import it in backend/app/models/__init__.py
- [ ] T002 Generate and review the migration with `make migration m="add [entity]"` in backend/migrations/versions/

**Checkpoint**: Foundation ready; user stories can start.

---

## Phase 2: US-[N] — [Title] 🎯

**Goal**: [What this story delivers]

**Independent Test**: [How to verify this story on its own]

### Tests for US-[N] (write first; they must fail before the implementation)

- [ ] T003 [P] [US[N]] Test scenario 1 (`test_us[N]_s1_[behavior]`) in backend/tests/test_[feature].py
- [ ] T004 [P] [US[N]] Test scenario 2 (`test_us[N]_s2_[behavior]`) in backend/tests/test_[feature].py
- [ ] T005 [P] [US[N]] Test scenario 3 (`US-[N] S3 [behavior]`) in frontend/src/pages/[Page].test.tsx

### Implementation for US-[N]

- [ ] T006 [US[N]] Add request and response schemas in backend/app/schemas/[resource].py
- [ ] T007 [US[N]] Implement [endpoint] in backend/app/api/[resource].py and mount it in backend/app/api/__init__.py
- [ ] T008 [US[N]] Regenerate the API contract and types with `make api-types` (frontend/src/api/)
- [ ] T009 [US[N]] Build [Page] in frontend/src/pages/[Page].tsx with [Page].module.css, Spanish UI text and phone-width layout
- [ ] T010 [US[N]] Add the route in frontend/src/router.tsx

**Checkpoint**: US-[N] works end to end and its scenario tests pass.

---

[One more phase per user story in the spec, following the same pattern]

---

## Phase N: Wrap-up

- [ ] TXXX Run `make format lint test` and fix any failure
- [ ] TXXX Update spec.md, plan.md and this file if the implementation diverged
- [ ] TXXX Follow quickstart.md to try the feature in the running app

---

## Dependencies & Execution Order

- **Foundational**: blocks the user story phases.
- **User stories**: depend on the foundational phase. Different stories can go to different teammates in parallel.
- **Within a story**: tests first (failing) → schemas and models → endpoint → `make api-types` → UI.
- **Wrap-up**: after the stories in scope are done.

## Notes

- [P] tasks touch different files and have no dependencies on each other.
- Commit after each task or logical group, with the US in the message: `feat(US-[N]): …`.
- Avoid vague tasks, two tasks on the same file in parallel, and dependencies between stories that break their independence.
