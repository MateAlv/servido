# El trabajo práctico

## Enfoque de la cátedra

- **Problemas reales**: clases teórico-prácticas orientadas a escenarios de la industria.
- **Articulación de marcos**: marcos predictivos (WBS, costos) combinados con marcos ágiles (Scrum, MVP).
- **IA generativa**: uso intensivo pero supervisado de herramientas y agentes de software.
- **TP**: desarrollo grupal iterativo de un MVP tecnológico.
- **Seguimiento**: presentaciones periódicas y revisiones de arquitectura y de prompts.
- **Defensa final**: demo funcional e integración del equipo técnico.

## Flujo completo del TP

| Fase | Contenido |
| --- | --- |
| 01 | Idea |
| 02 | Artefactos de Lean Inception + WBS |
| 03 | Product Backlog + User Story Map |
| 04 | Comunicaciones, costos y riesgos |
| 05 | Specs (SDD) |
| 06 | Sprint Planning |
| 07 | Desarrollo |
| 08 | Review |
| 09 | Entrega final y defensa |

## Entregables iniciales

Definidos con el Product Owner (un ayudante de la cátedra):

- Planilla de Lean Inception (visión, es/no es, personas, features).
- Plan de comunicaciones.
- Cronograma.
- Planilla de costos.
- Planilla de riesgos.
- WBS.
- User stories y User Story Mapping.
- Specs (SDD).

## Entregables de cada sprint de desarrollo

- **Demo y retrospectiva del sprint, documentadas.**
- **Tab de métricas del sprint** (en la planilla de artefactos).
- **Revisión y actualización** de riesgos, costos y tiempos.
- **Alcance de la iteración siguiente** con criterios de aceptación.

La estructura esperada de la presentación está en [sprint-review.md](sprint-review.md).

## Modalidad de presentación

Cada entrega se presenta en **25 minutos** y debe mostrar:

- Uso de herramientas de IA y de desarrollo agéntico.
- Versiones generadas y prompts usados.
- Evolución de los artefactos hasta el resultado final, con su justificación.

## Cierre y defensa

Entrega del producto desarrollado junto con su documentación. La clase final incluye la entrega, una demo del producto y una exposición ante los ayudantes y los otros grupos. Los detalles están en el documento "Defensa TP" de la cátedra (pendiente de incorporar, ver [README](README.md)).

## Prácticas de los equipos que llegan bien a la defensa

| Práctica | Qué espera la cátedra |
| --- | --- |
| Commits frecuentes | Historial atómico y descriptivo, atado al backlog de cada sprint |
| Backlog y specs actualizados | Product Backlog al día, US estimadas, specs claras y robustas antes de cada sprint |
| Code review cruzado | Pull requests validados y revisados por el equipo |
| Documentar decisiones | Registro claro de decisiones de arquitectura y de prompts |
| Validar la IA | Auditoría estricta de todo el código generado |
| WBS vivo | Mantenimiento constante del alcance y de la WBS |

## Cómo se refleja en este repositorio

| Expectativa de la cátedra | Dónde vive |
| --- | --- |
| Specs (SDD) | `specs/` con Spec Kit ([AGENTS.md](../../AGENTS.md)) |
| Commits atados al backlog | Convención `feat(US-N): …` ([CONTRIBUTING.md](../../CONTRIBUTING.md)) |
| Code review cruzado | Pull requests revisados por otro integrante |
| Decisiones de arquitectura | [docs/decisions/](../decisions/) |
| Prompts y uso de IA | Sección obligatoria "AI usage" en cada PR |
| Backlog, cronograma, riesgos, costos, métricas | Planilla de artefactos del equipo (fuente de verdad); resumen en [docs/product/](../product/) |
