# /// script
# requires-python = ">=3.12"
# dependencies = ["openpyxl>=3.1"]
# ///
"""Export the product backlog from the team's artifacts workbook to docs/product/backlog.md.

The workbook (Grupo 3 Artefactos GDSI) is the source of truth. Run after every backlog change:

    uv run scripts/export_backlog.py "path/to/Grupo 3 Artefactos GDSI v2026.xlsx"
"""

import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import openpyxl

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT = REPO_ROOT / "docs" / "product" / "backlog.md"


@dataclass
class Story:
    number: int
    title: str
    estimate: str
    proposed: bool = False
    role: str = ""
    story: list[str] = field(default_factory=list)
    criteria: list[str] = field(default_factory=list)
    note: str = ""
    sprint: str = ""
    owners: str = ""
    spec: str = ""


def cell_text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def after_label(text: str) -> str:
    return text.split(":", 1)[1].strip() if ":" in text else text.strip()


def read_stories(workbook: openpyxl.Workbook) -> list[Story]:
    stories: list[Story] = []
    for row in workbook["Backlog-US"].iter_rows(values_only=True):
        a, b, _, d, e = (cell_text(v) for v in (row + (None,) * 5)[:5])
        if a.startswith("Nro:"):
            stories.append(Story(int(after_label(a)), after_label(b), after_label(d)))
        elif not stories:
            continue
        elif a.startswith("Descripción:"):
            stories[-1].story = [line.strip() for line in a.splitlines()[1:] if line.strip()]
        elif a.startswith("Criterios de Aceptación:"):
            lines = [line.strip() for line in a.splitlines()[1:] if line.strip()]
            stories[-1].criteria = [line.lstrip("-• ").strip() for line in lines]
            stories[-1].note = e.strip("() ")
        elif a.startswith("#") and "Rol:" in a:
            stories[-1].role = after_label(a.split("·", 1)[1])
    return stories


def read_sprints(workbook: openpyxl.Workbook) -> dict[int, tuple[str, str, str]]:
    """Map US number -> (sprint, owners, story points shown in the schedule)."""
    plan: dict[int, tuple[str, str, str]] = {}
    for row in workbook["Cronograma"].iter_rows(values_only=True):
        phase, _, detail, owners = (cell_text(v) for v in row[:4])
        match = re.match(r"Desarrollo · Sprint (\d+)", phase)
        if not match:
            continue
        for us, points in re.findall(r"\((\d+) · (\d+) SP(?: propuesto)?\)", detail):
            plan[int(us)] = (match.group(1), owners, points)
    return plan


def read_specs() -> dict[int, str]:
    specs: dict[int, str] = {}
    for spec in sorted((REPO_ROOT / "specs").glob("*/spec.md")):
        header = "\n".join(spec.read_text(encoding="utf-8").splitlines()[:15])
        for us in re.findall(r"US-(\d+)", header):
            specs.setdefault(int(us), spec.parent.name)
    return specs


def points(story: Story) -> str:
    if not story.estimate:
        return "—"
    return f"{story.estimate} SP" + (" (propuesto)" if story.proposed else "")


def render(stories: list[Story]) -> str:
    total = sum(int(s.estimate) for s in stories if s.estimate)
    out = [
        "# Product Backlog",
        "",
        (
            f"> Exportado de la planilla de artefactos del equipo el {date.today().isoformat()}. "
            "No editar a mano: la planilla es la fuente de verdad. Para actualizar, correr "
            '`uv run scripts/export_backlog.py "<ruta a la planilla .xlsx>"`.'
        ),
        "",
        (
            f"{len(stories)} historias · {total} SP estimados en la planilla "
            "(las marcadas como propuestas todavía no fueron estimadas por el equipo)."
        ),
        "",
        "## Resumen",
        "",
        "| US | Título | Rol | SP | Sprint | Spec |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for s in stories:
        spec = f"[{s.spec}](../../specs/{s.spec}/spec.md)" if s.spec else "—"
        out.append(
            f"| {s.number} | {s.title} | {s.role} | {points(s)} | {s.sprint or '—'} | {spec} |"
        )
    out += ["", "## Historias", ""]
    for s in stories:
        out += [f"### US-{s.number} — {s.title}", ""]
        meta = [f"**Rol**: {s.role}", f"**Estimación**: {points(s)}"]
        meta.append(f"**Sprint**: {s.sprint or '—'}")
        if s.owners:
            meta.append(f"**Asignada a**: {s.owners}")
        if s.spec:
            meta.append(f"**Spec**: [{s.spec}](../../specs/{s.spec}/spec.md)")
        out += [" · ".join(meta), ""]
        out += [f"> {line}  " for line in s.story] + [""]
        out += ["**Criterios de aceptación**", ""]
        out += [f"- {criterion}" for criterion in s.criteria] + [""]
        if s.note:
            out += [f"**Nota**: {s.note}", ""]
    return "\n".join(out).rstrip() + "\n"


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    workbook = openpyxl.load_workbook(sys.argv[1], data_only=True)
    stories = read_stories(workbook)
    sprints = read_sprints(workbook)
    specs = read_specs()
    for s in stories:
        if s.number in sprints:
            s.sprint, s.owners, planned = sprints[s.number]
            if not s.estimate:
                s.estimate, s.proposed = planned, True
        s.spec = specs.get(s.number, "")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render(stories), encoding="utf-8")
    print(f"{len(stories)} stories -> {OUTPUT.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
