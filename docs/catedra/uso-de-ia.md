# Uso de IA en la cursada

## La ingeniería de software cambió

| Antes | Hoy (aumentada por IA) |
| --- | --- |
| Programar → Integrar → Probar | **Especificar → Orquestar IA → Validar → Gobernar** |

Una forma no reemplaza a la otra: la materia incorpora la IA como núcleo de la gestión y del desarrollo. La progresión que propone la cátedra es: programar → construir software → gestionar proyectos → coordinar personas → potenciar equipos con IA.

## Regla general

**Toda entrega debe poder ser explicada y defendida por el equipo.**

| Uso esperado | No permitido |
| --- | --- |
| Brainstorming y estructuración inicial | Entregar código no comprendido |
| Documentación y especificaciones | Copiar respuestas a ciegas |
| Generación de user stories y tests unitarios | Aceptar cambios sin revisión técnica |
| Refactoring y explicaciones de código | Reemplazar el criterio ingenieril |

## Qué hay que mostrar sobre IA

En cada presentación (25 minutos):

- Herramientas de IA y de desarrollo agéntico usadas.
- Versiones generadas y prompts usados.
- Evolución de los artefactos hasta el resultado final y la justificación de cada cambio.

En la Sprint Review hay una sección de **transparencia en el uso de IA** (ver [sprint-review.md](sprint-review.md)): herramientas utilizadas, prompts y casos de uso, e impacto medible (por ejemplo, tiempo ahorrado o consistencia lograda).

En este repositorio esa evidencia sale de la sección "AI usage" de cada pull request y del historial de `specs/` (spec → plan → tasks).

## Spec-Driven Development (SDD)

- Las specs son la **fase 05** del TP: se escriben después de backlog, comunicaciones, costos y riesgos, y antes del Sprint Planning.
- Herramienta sugerida por la cátedra: **[Spec Kit](https://github.com/github/spec-kit)** de GitHub, metodología de desarrollo guiado por especificaciones. Material sugerido: documentación oficial del repositorio y el video "Everything you need to know about Spec Kit" de uno de sus mantenedores.
- Cómo lo aplicamos: [AGENTS.md](../../AGENTS.md) y [specs/README.md](../../specs/README.md).

## Rutas de aprendizaje sugeridas

De la planilla "AI Learning Paths – Agentic Development 2026":

| Área | Recurso | Plataforma |
| --- | --- | --- |
| GitHub Copilot | Tutoriales oficiales y workflows | GitHub / YouTube |
| GitHub Copilot | Introduction to Microsoft GitHub Copilot | Coursera |
| Anthropic | Anthropic Academy: Claude Code, API, MCP, subagentes | Skilljar (gratis) |
| Google Antigravity | Getting Started with Google Antigravity; Building Agentic Applications with Gemini & Antigravity; MCPs en Antigravity | Google Codelabs / Skills Boost / docs |
| Gemini CLI | Accelerate App Development with Gemini CLI | Google Skills Boost |
| OpenAI Codex | Codex & API Code Generation Essentials; Agents SDK & Operator | OpenAI Cookbook / docs |
| SDD | Introduction to Spec Kit; Everything you need to know about Spec Kit | GitHub / YouTube |

**Google AI Plus para estudiantes**: da acceso gratis a Antigravity. Hay que registrarse con un mail personal indicando que se es alumno de FIUBA; con el mail de FIUBA no funciona.
