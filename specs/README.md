# Specs

Especificaciones de Servido! siguiendo Spec-Driven Development con [Spec Kit](https://github.com/github/spec-kit). Cada carpeta `NNN-nombre/` agrupa 1 a 3 US relacionadas:

- `spec.md` — qué y por qué, en español; la valida la PO antes de la planning.
- `plan.md`, `research.md`, `data-model.md`, `contracts/` — cómo, en inglés (`/speckit-plan`).
- `tasks.md` — tareas de implementación (`/speckit-tasks`).

El flujo completo está en [AGENTS.md](../AGENTS.md#spec-driven-workflow).

## Índice

| Spec | Rol | US | SP | Sprint | spec | plan | tasks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [001-acceso-comensal](001-acceso-comensal/spec.md) | Comensal | 1, 3 | 4 | 1 | ✅ | — | — |
| [002-elegir-restaurante](002-elegir-restaurante/spec.md) | Comensal | 5, 7, 9 | 8 | 1 | ✅ | — | — |
| [003-cuenta-restaurante](003-cuenta-restaurante/spec.md) | Restaurante | 2, 4 | 4 | 1 | ✅ | — | — |
| [004-local-horarios-mesas](004-local-horarios-mesas/spec.md) | Restaurante | 6, 8, 10 | 6 | 2 | ✅ | — | — |
| [005-reservar-mesa](005-reservar-mesa/spec.md) | Comensal | 11, 13 | 5 | 2 (US-11) y 3 (US-13) | ✅ | — | — |
| [006-menu-platos](006-menu-platos/spec.md) | Restaurante | 12 | 3 | 2 | ✅ | — | — |

Faltan las specs de las US de los Sprints 3 a 6 (ver [backlog](../docs/product/backlog.md)). Según el riesgo 8, conviene tenerlas listas antes para poder adelantar US.

### Numeración

Al migrar las specs al repo se renumeraron dos para que no haya números repetidos: la spec de cuenta de restaurante pasó de `002` a `003`, y la de reservar mesa de `003` a `005`.

## Pendientes de aclarar con la PO

Las specs marcan estas dudas como `[NEEDS CLARIFICATION]`. Las del Sprint 1 bloquean la demo del 21/10.

| Spec | Duda | Propuesta actual |
| --- | --- | --- |
| 001 | Requisitos de la contraseña | Mínimo 8 caracteres, con al menos una letra y un número |
| 001 | US-3 pide "email y nombre de usuario", pero el registro solo pide email | El usuario es el email |
| 001 | Email ya registrado (no lo define el backlog para el comensal) | Informar que ya existe una cuenta y no crear otra |
| 002 | Criterio del filtro de precio: el backlog ahora calcula $–$$$$ con el gasto promedio de al menos 5 reseñas, pero las reseñas llegan en los Sprints 4–6 | Sin reseñas, usar un criterio provisorio (la spec propone un monto máximo; otra opción es el rango de precios que declara el restaurante en US-6) |
| 002 | Fuente y umbrales de la concurrencia (bajo/medio/alto) y frecuencia de actualización | Valor por restaurante provisto por los datos de prueba |
| 002 | Ubicación denegada | Mapa centrado en una zona por defecto, sin distancias |
| 003 | Contraseña: US-2 pide mail, CUIT y teléfono, pero la spec guarda `password_hash` sin decir dónde se elige | Pedir contraseña en el registro, con las mismas reglas que el comensal |
| 005 | Cantidad de comensales, elección de una mesa concreta, criterio de horario ocupado, duración y granularidad de la reserva, catálogo de tipos de mesa, aprobación del restaurante | Ver Edge Cases de la spec |

## Notas de formato

Las specs de comensal siguen la plantilla de Spec Kit sin detalles técnicos. Las de restaurante incluyen códigos HTTP y nombres de columnas; al planificar, esos detalles se mueven a `plan.md` y `data-model.md`, y los nombres se traducen según el glosario de [AGENTS.md](../AGENTS.md#domain-glossary).
