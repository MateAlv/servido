# Feature Specification: Responder Reseñas

**Created**: 2026-11-11 (versión del Drive) · actualizada el 2026-11-15 con las decisiones C1–C5

**Input**: Backlog Servido! — US-42

**Rol**: Responsable del restaurante

**Sprint**: 5

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

Extiende las reseñas de la spec 014-resenas: el comensal califica y comenta (US-27, US-50), el restaurante ve todas sus reseñas (US-24) y el público ve en Opiniones la reseña de la visita más reciente de cada persona, aunque tenga solo estrellas (R14). Las decisiones C1–C5 son del equipo (15/11) y falta que la PO las valide.

## User Scenarios & Testing *(mandatory)*

### US-42 — Responder Reseñas (Prioridad: -, Estimación: 1)

Como **Responsable del restaurante**, quiero escribir un comentario a las reviews que dejan los comensales, para agradecer las opiniones, dar mi versión ante una crítica y cuidar la reputación del restaurante.

**Valor**: El restaurante puede agradecer una buena opinión o dar su versión ante una crítica, y quien lee la reseña ve también la voz del restaurante, sin depender de canales externos.

**Independent Test**: Con la cuenta del restaurante, abrir sus reseñas, elegir una que se ve en Opiniones y no tiene respuesta, escribir un texto y publicarlo; verificar en el detalle público que la respuesta aparece debajo de la reseña, identificada como del restaurante. Verificar que no se puede agregar una segunda respuesta, editar la existente y ver en público el texto nuevo con la marca «Editada». Verificar que se rechazan respuestas vacías o de más de 500 caracteres y que otro restaurante no puede responder. Una reseña pública sin comentario permite iniciar una respuesta. Una reseña anterior solo permite editar una respuesta existente.

**Acceptance Scenarios**:

1. **Dado** que ingresé como restaurante y una reseña de mi restaurante se ve en Opiniones y no tiene respuesta, **Cuando** escribo una respuesta y la publico, **Entonces** queda guardada como la respuesta de esa reseña y la veo debajo de ella en mi lista de reseñas.
2. **Dado** que publiqué una respuesta, **Cuando** cualquier persona, con o sin cuenta, abre el detalle del restaurante, **Entonces** ve la respuesta debajo de la reseña en Opiniones, identificada como respuesta del restaurante, con su nombre y la fecha.
3. **Dado** que una reseña ya tiene respuesta, **Cuando** quiero responderla, **Entonces** no puedo agregar una segunda respuesta y se me ofrece editar la existente.
4. **Dado** que una reseña tiene respuesta, **Cuando** la edito y guardo, **Entonces** en mi lista y en Opiniones se ve solo el texto nuevo, marcado como «Editada» *(C3)*.
5. **Dado** que estoy escribiendo o editando una respuesta, **Cuando** intento guardarla vacía, con solo espacios o con más de 500 caracteres, **Entonces** no se guarda y se me indica por qué; mientras escribo veo cuántos caracteres me quedan *(C2)*.
6. **Dado** que estoy escribiendo una respuesta, **Cuando** desisto antes de publicarla, **Entonces** la reseña sigue sin respuesta.
7. **Dado** que una reseña de mi restaurante no se ve en Opiniones (la misma persona dejó otra reseña de una visita más reciente), **Cuando** la veo en mi lista, **Entonces** no se me ofrece responderla *(C1)*.
8. **Dado** que ingresé como restaurante, **Cuando** intento responder o editar la respuesta de una reseña de otro restaurante, **Entonces** el sistema no lo permite.
9. **Dado** que la reseña de la visita más reciente solo tiene estrellas o tiene fotos sin comentario, **Cuando** el restaurante abre su panel, **Entonces** puede publicar una primera respuesta y esta se ve junto a la reseña cuando el detalle público está disponible. Si el restaurante no está aceptando reservas, puede iniciar la respuesta desde el panel de todos modos.

---

### Edge Cases

- **Respuesta que deja de verse** *(C1)*: si la persona publica después una reseña de una visita más reciente, su reseña anterior sale de Opiniones (spec 014-resenas, R14) y la respuesta sale con ella. La respuesta no se borra: el restaurante la sigue viendo en su lista y puede editarla. La reseña nueva se puede responder aparte.
- **Doble envío**: si la publicación llega dos veces (doble clic o reintento), se guarda una sola respuesta.
- **Respondida desde otra pestaña**: si al publicar la reseña ya tiene respuesta, se informa y se muestra la existente para editarla; no se pisa sin avisar.
- **Borrar**: no se puede borrar una respuesta, solo editarla, y al editarla no puede quedar vacía *(C4)*.
- **Sesión vencida**: si la sesión venció al publicar o editar, no se guarda nada; el restaurante vuelve a ingresar y la reseña queda como estaba.
- **Comentarios ofensivos**: como en las reseñas (spec 014-resenas, R19), no hay moderación ni denuncia. Si la PO pide retirar una respuesta, lo hace el equipo a mano.
- **Restaurantes de prueba**: sus opiniones son datos de prueba y no tienen respuestas.
- **El comensal no recibe aviso**: el autor de la reseña ve la respuesta en el detalle del restaurante, como cualquier persona; no se le manda un mail ni una notificación *(C5)*.

## Decisiones del equipo (15/11, falta que la PO las valide)

- **C1 — Qué reseñas se responden**: se puede iniciar una respuesta a la reseña de la visita más reciente de cada comensal del local (spec 014-resenas, R14), con o sin comentario o fotos. Se conserva una respuesta por reseña. La elegibilidad se mantiene aunque el restaurante temporalmente no acepte reservas.
- **Decisión del 21/11/2026 (US-42)**: reemplaza el requisito original de comentario escrito de C1, que US-57 había preservado para reseñas con fotos.
- **C2 — Largo y publicación**: hasta 500 caracteres, el mismo límite que el comentario del comensal (spec 014-resenas, R1), con un contador mientras se escribe. Se publica directo, sin vista previa, porque se puede editar después (a diferencia de la reseña, que es definitiva).
- **C3 — Marca de edición**: una respuesta editada muestra solo el texto vigente, con la fecha de la respuesta y la marca «Editada». No se guarda ni se muestra el historial. Así el restaurante no puede cambiar su versión sin que se note.
- **C4 — Sin borrar**: US-42 permite escribir y editar, no borrar. El restaurante no puede borrar reseñas (US-24), y tampoco su respuesta.
- **C5 — Sin aviso al comensal**: no se notifica al autor de la reseña. Queda para más adelante si la PO lo pide.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-42; C1)*: El sistema MUST permitir al restaurante iniciar una respuesta con texto a las reseñas de su local que corresponden a Opiniones, incluso si solo tienen estrellas o el restaurante no está aceptando reservas. Las reseñas de visitas anteriores solo permiten editar una respuesta existente.
- **FR-002** *(US-42)*: El sistema MUST mostrar la respuesta en Opiniones, debajo de su reseña, identificada como respuesta del restaurante, con el nombre del restaurante y la fecha de la respuesta, a cualquier persona, con o sin cuenta.
- **FR-003** *(US-42)*: El sistema MUST admitir como máximo una respuesta por reseña, también ante envíos repetidos, y MUST informar cuando la reseña ya tiene una.
- **FR-004** *(US-42; C3)*: El sistema MUST permitir al restaurante editar su respuesta sin límite de tiempo; la versión editada MUST reemplazar a la anterior y mostrarse con la marca «Editada».
- **FR-005** *(US-42; C2, C4)*: El sistema MUST NOT guardar una respuesta vacía, con solo espacios o de más de 500 caracteres, y MUST informar el motivo.
- **FR-006** *(US-42)*: El sistema MUST permitir responder y editar solo las reseñas del restaurante que inició sesión.
- **FR-007** *(US-24)*: La lista de reseñas del restaurante MUST mostrar la respuesta de cada reseña que la tenga, incluidas las que ya no se ven en Opiniones, y MUST ofrecer una primera respuesta solo en las reseñas elegibles según C1.
- **FR-008** *(C4)*: El sistema MUST NOT permitir borrar una respuesta.

### Key Entities

- **Reseña** (spec 014-resenas, sin cambios): reserva, estrellas, comentario opcional, gasto opcional y fecha de publicación.
- **Respuesta del restaurante**: la reseña a la que responde (una sola por reseña), el texto, la fecha en que se publicó y la fecha de la última edición, si la hubo.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: responder con texto las reseñas que se ven en Opiniones, mostrar la respuesta en Opiniones y en la lista del restaurante, una respuesta por reseña, editarla con la marca «Editada».
- **Fuera**: borrar la respuesta, avisar al comensal, que el comensal conteste (conversación), moderar o denunciar reseñas o respuestas, historial de ediciones, responder las reseñas de los restaurantes de prueba.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El restaurante encuentra una reseña y publica su respuesta en menos de 1 minuto, sin contar el tiempo de escribirla.
- **SC-002**: 100% de las respuestas visibles en Opiniones aparecen identificadas como del restaurante.
- **SC-003**: Ninguna reseña tiene más de una respuesta.
- **SC-004**: 100% de las ediciones se ven en Opiniones con la marca «Editada», sin rastro del texto anterior.

## Assumptions

- El restaurante ya ve sus reseñas en su pantalla de reseñas (US-24, spec 014-resenas, FR-012); responde desde ahí.
- La respuesta es solo texto, sin imágenes ni formato.
- Esta spec viene de la versión del Drive (`Specs/Sprint 5/Restaurante/025-Calificacion-y-reseña.md`, creada el 11/11). Conserva su número.
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
