# Documentation

| Folder | Language | What it holds |
| --- | --- | --- |
| [catedra/](catedra/) | Spanish | Course rules: grading, what the TP must deliver each sprint, AI usage policy, sprint review format, management theory |
| [product/](product/) | Spanish | Product context from the team's artifacts workbook: vision, personas, user story map, full backlog with acceptance criteria, sprint plan, risks, costs |
| [decisions/](decisions/) | English | Architecture decision records |
| [design/](design/) | Spanish | First style mock-up and visual identity notes |

Requirements live in [specs/](../specs/). Agent instructions live in [AGENTS.md](../AGENTS.md).

The team's artifacts workbook (backlog, schedule, risks, costs, sprint metrics) is the source of truth for project management. `docs/product/backlog.md` is generated from it with `scripts/export_backlog.py`; the rest of `docs/product/` is a manual snapshot.
