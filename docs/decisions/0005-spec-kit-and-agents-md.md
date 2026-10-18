# 0005 — Spec Kit for SDD and AGENTS.md as the shared agent context

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

The course requires Spec-Driven Development and suggests GitHub Spec Kit. Team members use different AI agents (Claude Code, Codex, Copilot, Antigravity, Gemini and others).

## Decision

- Use Spec Kit 1.2.1 with integrations for Claude Code (`.claude/skills`), Codex and Antigravity (`.agents/skills`), GitHub Copilot (`.github/skills`) and Gemini CLI (`.gemini/commands`). Others can be added with `specify integration install <key>`.
- `AGENTS.md` is the single source of instructions for every agent. `CLAUDE.md` imports it, `.gemini/settings.json` points Gemini CLI to it, and an always-on rule in `.agents/rules/` points Antigravity to it (its native `AGENTS.md` support varies between versions). Those pointers hold no instructions of their own.
- The project constitution (`.specify/memory/constitution.md`) holds the non-negotiable principles that Spec Kit checks during planning.
- Spec Kit's generic templates are replaced by project templates in `.specify/templates/overrides/`: the team's Spanish spec format, and plan and task templates with this stack, these paths and mandatory tests.

## Consequences

- One place to update conventions; agents behave the same regardless of the tool.
- Spec Kit's generated skill folders are committed so every teammate gets the same commands.
- Spec Kit tracks the active feature in `.specify/feature.json` (local, not committed), so branch names are free-form.
