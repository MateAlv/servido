# Feature Specification: [NOMBRE DE LA FUNCIONALIDAD]

<!--
  Plantilla del equipo (reemplaza la de Spec Kit). Reglas:
  - Escribir en español (Argentina). La PO valida este archivo.
  - Describe QUÉ y POR QUÉ, nunca CÓMO: sin frameworks, endpoints, códigos HTTP ni
    nombres de tablas o columnas. Eso va en plan.md y data-model.md.
  - Cada historia sale del backlog (docs/product/backlog.md) y conserva su número,
    título y estimación. Agrupar 1 a 3 US relacionadas.
  - Todo criterio de aceptación del backlog queda cubierto por al menos un escenario.
  - Los escenarios se numeran dentro de cada US; los tests se llaman test_us<N>_s<M>_…
  - Máximo 3 [NEEDS CLARIFICATION], cada uno con una propuesta concreta para la PO.
-->

**Created**: [FECHA]

**Input**: Backlog Servido! — US-[N], US-[M]

**Rol**: [Comensal | Restaurante]

**Sprint**: [N]

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

## User Scenarios & Testing *(mandatory)*

### US-[N] — [Título del backlog] (Prioridad: -, Estimación: [SP])

Como **[rol]**, quiero [acción], para [beneficio].

**Valor**: [Por qué importa esta historia para el usuario o el negocio.]

**Independent Test**: [Cómo se prueba esta US por sí sola, de punta a punta.]

**Acceptance Scenarios**:

1. **Dado** [estado inicial], **Cuando** [acción], **Entonces** [resultado esperado].
2. **Dado** [estado inicial], **Cuando** [acción], **Entonces** [resultado esperado].

---

### US-[M] — [Título del backlog] (Prioridad: -, Estimación: [SP])

Como **[rol]**, quiero [acción], para [beneficio].

**Valor**: [...]

**Independent Test**: [...]

**Acceptance Scenarios**:

1. **Dado** [...], **Cuando** [...], **Entonces** [...].

---

### Edge Cases

- **[Caso borde]**: [comportamiento esperado].
- **[Duda abierta]**: [NEEDS CLARIFICATION: pregunta concreta para la PO. Se propone: …]

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-[N])*: El sistema MUST [capacidad concreta y verificable].
- **FR-002** *(US-[N])*: El sistema MUST NOT [restricción].

### Key Entities *(si la funcionalidad maneja datos)*

- **[Entidad]**: [qué representa y sus atributos principales, sin tipos de base de datos].

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: [qué incluye esta spec].
- **Fuera**: [qué queda para otras US, con sus números].

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: [Resultado medible y verificable, sin detalles de implementación.]

## Assumptions

- [Supuesto tomado ante una definición faltante.]
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
