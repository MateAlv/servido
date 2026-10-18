# 0004 — Language policy

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

The team, the course and the Product Owner work in Spanish, and the specs are written in Spanish. Code mixes poorly across languages, and agents produce more consistent code in English.

## Decision

- **English**: code, identifiers, comments, commit messages, pull requests, `AGENTS.md`, `README.md`, `CONTRIBUTING.md` and the ADRs in `docs/decisions/`.
- **Spanish (Argentina)**: everything users see (UI text, messages, emails), the specs in `specs/`, and the product and course context in `docs/product/` and `docs/catedra/`.
- Spanish domain terms map to fixed English names, listed in the glossary in `AGENTS.md`.

## Consequences

- The glossary is the bridge between specs and code and must be updated when a new domain concept appears.
- Technical Spec Kit artifacts (`plan.md`, `tasks.md`, `data-model.md`, `contracts/`) are written in English; `spec.md` stays in Spanish because the Product Owner validates it.
