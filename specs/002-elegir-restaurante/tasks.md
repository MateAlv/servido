# US-7 tasks

These tasks cover only independent US-7 frontend work, not the whole feature 002.

- [x] T001 Create the controlled price selector and token-based responsive styles.
- [x] T002 Add a pure price/menu predicate without inventing restaurant API properties.
- [x] T003 Add automated S1/S2/S3 and edge-case tests using a controlled test harness.
- [x] T004 Export the selector and document its integration interface in the design guide.
- [x] T005 Run formatting, lint, type checks and tests; record results (see validation below).
- [ ] T006 Coordinate the real restaurant contract and integrate with Lourdes's US-5 map; test actual markers and empty states.
- [ ] T007 Preserve selection across US-9 detail navigation and test it.
- [x] T008 Register PriceFilter in the design catalog with an interactive fictional-data demonstration in DesignSystemPage.tsx.

- [x] T009 Derive provisional price tiers from numeric mock average spend in ARS; cover 15000, 25000 and 40000 boundaries and adjacent cents.
- [x] T010 Update the catalog fixtures and US-7 documentation without changing selector/predicate behavior or integrating the map/backend.

## Validation results

### Numeric average spend update (2026-10-19)

- All 42 frontend tests across 14 files passed, including 12 conversion cases covering exact thresholds and adjacent cents.
- `npm run lint`, `npm run typecheck`, `npm run format:check` and `git diff --check` passed.
- No backend checks or visual browser checks were rerun for this frontend-only change.

### Previous frontend validation

- The user corrected `frontend/node_modules` permissions and ran `npm ci`. All 30 frontend tests across 14 files passed directly in WSL, including the run after catalog integration.
- During catalog integration, ESLint and TypeScript passed directly in the project. Prettier checked the modified DesignSystemPage.tsx successfully; git diff --check also passed.
- The user visually verified single and multiple selection, deselection, clearing, zero matches and responsive layout at 360 px in `/diseno#filtro-precio`.
- Catalog registration is complete. Real map/API integration and marker tests (T006), and selection preservation across detail navigation (T007), remain pending.
- No checks were rerun for this documentation-only update; this section records previously performed checks.

### Historical validation

- Before permissions were corrected, frontend checks used `/tmp/servido-us7-check` with the existing lockfile because npm ci in the repository failed with EACCES. ESLint, TypeScript and all 30 tests passed there. Prettier checks on the changed frontend component files and git diff --check passed.
- Backend Ruff checks and formatting, and the pytest health test against PostgreSQL, passed during the earlier implementation verification. They were not rerun for catalog integration or this documentation update.
- The earlier root make format lint test attempt did not complete because frontend tools were unavailable in the repository and the uv cache required elevated access. This historical limitation does not describe the current frontend permissions; no successful full root run is claimed.
