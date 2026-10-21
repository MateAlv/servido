# Specs

Especificaciones de Servido! siguiendo Spec-Driven Development con [Spec Kit](https://github.com/github/spec-kit). Cada carpeta `NNN-nombre/` agrupa 1 a 3 US relacionadas:

- `spec.md` — qué y por qué, en español; la valida la PO antes de la planning.
- `plan.md`, `research.md`, `data-model.md`, `contracts/` — cómo, en inglés (`/speckit-plan`).
- `tasks.md` — tareas de implementación (`/speckit-tasks`).

El flujo completo está en [AGENTS.md](../AGENTS.md#spec-driven-workflow).

## Índice

| Spec | Rol | US | SP | Sprint | spec | plan | tasks | Implementado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [001-acceso-comensal](001-acceso-comensal/spec.md) | Comensal | 1, 3 | 4 | 1 | ✅ | ✅ | ✅ | ✅ US-1, US-3 |
| [002-elegir-restaurante](002-elegir-restaurante/spec.md) | Comensal | 5, 7, 9, 33 | 13 | 1 (US-33 adelantada del 4) | ✅ | ✅ | ✅ | ✅ US-5, US-7, US-9, US-33 (con datos de prueba) |
| [003-cuenta-restaurante](003-cuenta-restaurante/spec.md) | Restaurante | 2, 4 | 4 | 1 | ✅ | — | — | ✅ US-2, US-4 (con arrastres) |
| [004-local-horarios-mesas](004-local-horarios-mesas/spec.md) | Restaurante | 6, 8, 10 | 6 | 2 | ✅ | — | — | — |
| [005-reservar-mesa](005-reservar-mesa/spec.md) | Comensal | 11, 13 | 5 | 2 (US-11) y 3 (US-13) | ✅ | — | — | — |
| [006-menu-platos](006-menu-platos/spec.md) | Restaurante | 12 | 3 | 2 | ✅ | — | — | — |

Pendiente de la spec 003: el registro con Google pasa a US-28 (Sprint 4). El escenario 3 de US-4 (403 con el rol equivocado) tiene prueba cuando exista el primer endpoint exclusivo de un rol (Sprint 2); hoy la cuenta del restaurante solo accede a su panel. La spec 002 todavía lee los restaurantes de `frontend/src/data/restaurants.fixture.ts`, hasta que la spec 004 agregue el endpoint.

Faltan las specs del resto de las US de los Sprints 3 a 6; del Sprint 3 solo está US-13, en la 005 (ver [backlog](../docs/product/backlog.md)). Según el riesgo 8, conviene tenerlas listas antes para poder adelantar US.

### Pendientes del equipo

- La spec 003 está implementada pero no tiene `plan.md` ni `tasks.md`, así que no cumple la [Definition of Done](../AGENTS.md#definition-of-done): spec, plan y tasks tienen que reflejar lo construido. Hay que generarlos a partir de lo que ya está hecho.
- Spec 001: falta el test de frontend de US-3 S1 (ver `tasks.md`, T022).

### Numeración

Al migrar las specs al repo se renumeraron dos para que no haya números repetidos: la spec de cuenta de restaurante pasó de `002` a `003`, y la de reservar mesa de `003` a `005`.

## Pendientes de aclarar con la PO

Las specs marcan estas dudas como `[NEEDS CLARIFICATION]`. Las de la spec 002 se implementaron con la propuesta actual para la demo del 21/10 y siguen esperando la confirmación de la PO.

| Spec | Duda | Propuesta actual |
| --- | --- | --- |
| 002 | Fuente y umbrales de la concurrencia (bajo/medio/alto) y frecuencia de actualización | Valor por restaurante provisto por los datos de prueba; la demo refresca cada 30 s. Implementado así; falta que la PO lo confirme |
| 002 | Ubicación denegada | Mapa centrado en Buenos Aires, sin distancias, con aviso y botón para reintentar. Implementado así; falta que la PO lo confirme |
| 005 | Cantidad de comensales, elección de una mesa concreta, criterio de horario ocupado, duración y granularidad de la reserva, catálogo de tipos de mesa, aprobación del restaurante | Ver Edge Cases de la spec |

## Decisiones del equipo

Dudas que no hacía falta llevar a la PO. Ya están incorporadas en cada spec.

| Fecha | Spec | Decisión |
| --- | --- | --- |
| 18/10 | 001, 003 | *(Reemplazada el 19/10.)* Contraseñas según OWASP ASVS 5.0: de 8 a 128 caracteres, cualquier carácter, sin combinaciones obligatorias, rechazando las más comunes y la igual al email. Aplica a comensales y restaurantes; el registro del restaurante también pide contraseña |
| 18/10 | 001 | El usuario para ingresar es el email |
| 18/10 | 001 | Un email ya registrado no crea otra cuenta; se informa sin revelar más datos |
| 18/10 | 002 | *(Reemplazada el 21/10.)* Filtro de precio provisorio: nivel $–$$$$ cargado en los datos de prueba de cada restaurante, hasta que existan reseñas con gasto (US-50) |
| 19/10 | 001, 003 | Reemplaza la del 18/10 sobre contraseñas: de 8 a 128 caracteres, con al menos una letra y un número, cualquier otro carácter permitido y distinta del email |
| 21/10 | 001 | El registro del comensal también pide su nombre (para saludarlo y para que el restaurante sepa quién reservó) |
| 21/10 | 001, 003 | La API de acceso conserva los nombres en español (`/api/comensales`, `/api/restaurantes`, `nombre`, `id_comensal`…), como excepción al glosario de `AGENTS.md`. Lo nuevo sigue el glosario en inglés |
| 21/10 | 002 | Restaurantes de prueba con menú y precios cargados en el frontend (`frontend/src/data/restaurants.fixture.ts`) para la demo del Sprint 1, hasta que exista el endpoint de restaurantes (spec 004) |
| 21/10 | 002 | Reemplaza la del 18/10 sobre el filtro de precio: el precio de cada restaurante de prueba es un gasto promedio por persona simulado (como si viniera de la base); la categoría $–$$$$ se calcula con los límites de la spec. Cuando existan reseñas con gasto (US-50), el promedio saldrá de ellas |
| 21/10 | 002 | US-9 suma el criterio del backlog que faltaba en la spec: el detalle muestra fotos y opiniones (de prueba hasta US-24) |
| 21/10 | 003 | Registro con Google pasa a US-28 (Sprint 4). El 403 por rol de US-4 se prueba cuando haya endpoints exclusivos de cada rol (Sprint 2) |
| 21/10 | 001, 003 | Los registros de comensal y de restaurante piden confirmar la contraseña; si no coincide no se envía. Es solo del formulario: la API no cambia. Falta que la PO lo valide |
| 21/10 | 002 | US-33 (listado de restaurantes, 5 SP) se adelanta del Sprint 4 al 1: el listado acompaña al mapa y cumple sus criterios |

## Notas de formato

Las specs de comensal siguen la plantilla de Spec Kit sin detalles técnicos. Las de restaurante incluyen códigos HTTP y nombres de columnas; al planificar, esos detalles se mueven a `plan.md` y `data-model.md`, y los nombres se traducen según el glosario de [AGENTS.md](../AGENTS.md#domain-glossary).
