# 0005 — Spec Kit for SDD and AGENTS.md as the shared agent context

- **Status**: Accepted
- **Date**: 2026-10-18

## Context

The course requires Spec-Driven Development and suggests GitHub Spec Kit. Team members use different AI agents (Claude Code, Codex, Copilot, Antigravity, Gemini and others).

## Decision

- Use Spec Kit 1.2.1 with integrations for Claude Code (`.claude/skills`), Codex and Antigravity (`.agents/skills`), GitHub Copilot (`.github/skills`) and Gemini CLI (`.gemini/commands`). Others can be added with `specify integration install <key>`.
- `AGENTS.md` is the single source of instructions for every agent. `CLAUDE.md` imports it and `.gemini/settings.json` points Gemini CLI to it. No other agent-specific instruction files.
- The project constitution (`.specify/memory/constitution.md`) holds the non-negotiable principles that Spec Kit checks during planning.

## Consequences

- One place to update conventions; agents behave the same regardless of the tool.
- Spec Kit's generated skill folders are committed so every teammate gets the same commands.
- Spec Kit tracks the active feature in `.specify/feature.json` (local, not committed), so branch names are free-form.
