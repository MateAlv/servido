# US-7 independent frontend implementation

Scope: spec 002, US-7 S1–S3 and price-related edge cases. US-5 and US-9 remain owned by their respective implementers. This plan does not cover the rest of feature 002.

## Design

- Controlled `PriceFilter` receives `selectedTiers`, `onChange`, and an optional successful-query `resultCount`. Reuse Chip and Button. Emit changes immediately and clear only price selection.
- Use four literal UI categories ($ through $$$$). These are not API response types or monetary thresholds.
- `matchesPriceFilter(tier, hasMenu, selectedTiers)` is a pure predicate. The map owner can use Array.filter after adapting the eventual generated API types. Empty selection permits every input; active selection excludes missing menus and unknown categories.
- No restaurant response model exists. Do not invent one. No endpoint, database changes, API generation, new runtime dependencies, alternative map, routes, or temporary page.
- Use CSS Modules, tokens, wrapping layout, native buttons and fieldset, aria-pressed and a live empty-state message.

## Constitution check

Scope is backlog-bound, uses the existing stack, and adds no infrastructure or dependencies. Tests trace S1–S3; actual marker integration is pending. No unresolved map geolocation or occupancy behavior is implemented.

## Acceptance coverage

- S1: PriceFilter interaction test and predicate test for all four tiers and multiple selection.
- S2: interaction and predicate tests for changed selections.
- S3: controlled harness and predicate tests restoring the original set.
- Edges: missing menu/category, immutable input, no matches, empty source, keyboard operation.

## Integration agreement still required

Lourdes owns the map page, valid-location/account filtering and restaurant query. Agree on generated restaurant fields and conversion to UI PriceTier; derive menu presence from the actual contract. Filter the complete eligible source rather than previously filtered results. Keep selection in the containing page and preserve it when visiting details (URL state is a recommendation, not implemented). Pass resultCount only after successful loading. The predicate preserves order and has no side effects.

PriceFilter is registered in `frontend/src/pages/DesignSystemPage.tsx`. Its interactive demonstration at `/diseno#filtro-precio` uses local fictional restaurants, including one without a menu and a selection with zero matches. The design guide and restaurant barrel document/export the component. Integration with the real map, API and detail navigation remains pending.

## Validation

Current frontend validation runs directly in WSL after the user corrected `frontend/node_modules` permissions and ran `npm ci`: all 30 tests across 14 files passed. ESLint, TypeScript and the Prettier check for the modified catalog page passed during catalog integration; `git diff --check` also passed.

The user visually verified single and multiple selection, deselection, clearing, zero matches and responsive layout at 360 px in the catalog demonstration. These checks use fictional data and do not prove real map marker integration, detail navigation or live API/database behavior.

Earlier temporary-copy frontend checks and backend results are historical; see tasks.md. The earlier root `make format lint test` attempt did not complete, and a successful full root run is not claimed. No checks were rerun for this documentation-only update.
