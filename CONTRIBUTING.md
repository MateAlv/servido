# Contributing

How the team works on Servido!. The rules agents follow are in [AGENTS.md](AGENTS.md); this file covers the human side.

## Setup

1. Install Docker, [uv](https://docs.astral.sh/uv/), Node.js 22 and `make`. On Windows, work inside WSL.
2. Clone the repo and run `make up`. The first run builds the images and installs dependencies.
3. To run things natively instead:

   ```bash
   make db                                              # Postgres on localhost:55432
   cd backend && uv sync && uv run alembic upgrade head
   uv run uvicorn app.main:app --reload                 # API on :8000
   cd frontend && npm install && npm run dev            # web on :5173, proxies /api to :8000
   ```

4. Open the repo with your AI agent. Spec Kit commands are already installed for Claude Code, Codex, Copilot, Antigravity and Gemini CLI. To add another agent, install the CLI (`uv tool install specify-cli==1.2.1`) and run `specify integration install <key>`.

## Working on a user story

1. Make sure the US has a spec in `specs/` validated by the PO. If not, write it first (`/speckit-specify`) and get it validated.
2. Create a branch from `main`: `<spec-number>-us<N>-<short-name>`.
3. Follow the spec-driven workflow in [AGENTS.md](AGENTS.md#spec-driven-workflow): clarify → plan → tasks → implement → converge.
4. Commit often with conventional commits that name the US: `feat(US-5): show restaurants on the map`.
5. Run `make lint test`, push and open a pull request. Fill the template, including **AI usage**.

## Reviewing a pull request

- You must understand the change well enough to explain it in the defense. If you don't, ask.
- Check that every acceptance scenario of the US has a test with the `test_us<N>_s<M>_` name.
- Check that the spec, plan and tasks match what was built, and that the AI usage section is filled in.
- Prefer small follow-up PRs over blocking on style.

## Definition of Done

See [AGENTS.md](AGENTS.md#definition-of-done).

## Keeping agent context up to date

- After the backlog changes in the team workbook, regenerate the snapshot: `uv run scripts/export_backlog.py "<path to the .xlsx>"`.
- When a decision changes the architecture, add an ADR in [docs/decisions/](docs/decisions/).
- When a new domain concept appears, add it to the glossary in [AGENTS.md](AGENTS.md#domain-glossary).
- When the PO answers an open question, update the spec and the table in [specs/README.md](specs/README.md).
