# Feature Specification: Subir Fotos de los Platos en Valoraciones

**Created**: 2026-11-18

**Input**: Backlog Servido\! — US-57 (Sprint 6, 2 SP)

**Rol**: Comensal

**Sprint**: 6

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

Esta spec amplía el flujo de valoración de experiencias pasadas construido para US-27 (dar rating de la experiencia) y US-50 (dejar comentarios en texto y gasto por persona), permitiendo que el comensal adjunte fotos de los platos consumidos al crear su valoración sobre una reserva pasada, las previsualice antes de publicar y las comparta públicamente junto con su reseña en el detalle del restaurante (US-9). Los puntos marcados como *propuesta para la PO* resuelven detalles no especificados en el backlog y quedan sujetos a validación.

## Clarifications

### Session 2026-11-21

- Q: ¿Debe aparecer en Opiniones la reseña con fotos de la visita más reciente de un comensal aunque no tenga comentario escrito? → A: Sí. Opiniones sigue mostrando únicamente la reseña de la visita más reciente de cada comensal en ese restaurante y la incluye si tiene fotos o comentario.
- Q: ¿Qué debe pasar si el servidor rechaza una foto cuando el comensal confirma la publicación de la reseña? → A: Si el servidor rechaza una o más fotos, la reseña no se publica en ese intento. El formulario indica qué fotos se rechazaron y por qué, y conserva la calificación, el comentario, el gasto ingresado y las fotos válidas para que el comensal pueda revisar y confirmar nuevamente.
- Q: ¿Qué límite de fotos querés aprobar por reseña? → A: Máximo cuatro fotos por reseña. Adjuntarlas es opcional.
- Q: ¿Aprobás que se acepten fotos JPG, PNG y WebP de hasta 5 MB por archivo? → A: Sí. Se aceptan fotos JPG, PNG y WebP de hasta 5 MB por archivo.
- Q: ¿Debe el restaurante poder ver en su panel las fotos de todas sus reseñas, incluso las de visitas anteriores que ya no aparecen en Opiniones? → A: Sí. En su panel privado, el restaurante puede ver las fotos de todas sus reseñas que las tengan, incluidas las de visitas anteriores.

- Decisión posterior del 21/11/2026 (US-50 y US-42): la reseña de la visita más reciente se muestra aunque tenga solo estrellas y admite una primera respuesta sin comentario escrito. Esto reemplaza el filtro «fotos o comentario» de la primera respuesta registrada arriba y el requisito de comentario escrito para responder.

## User Scenarios & Testing *(mandatory)*

### US-57 — Subir fotos del plato (Prioridad: \-, Estimación: 2\)

Como **Comensal**, quiero subir fotos de los platos que consumí, para compartir mi experiencia visual con otros usuarios.

**Valor**: Otros comensales pueden ver fotos reales tomadas por clientes en las reseñas del restaurante, lo que enriquece la sección de opiniones y ayuda a decidir qué pedir o dónde reservar.

**Independent Test**: Con una cuenta de Comensal que tiene una reserva pasada elegible para valorar, abrir el formulario de valoración, seleccionar dos imágenes válidas (JPG/PNG/WebP), verificar que ambas se muestran en la vista previa antes de enviar (permitiendo quitar una o agregar otra) y publicar la valoración; luego ingresar al detalle público del restaurante (incluso desde otro usuario o sin sesión) y comprobar que las fotos aparecen asociadas a esa reseña. Intentar adjuntar un archivo inválido o superar el límite y verificar el mensaje de rechazo sin perder el resto de la valoración.

**Acceptance Scenarios**:

1. **Dado** que estoy valorando una experiencia correspondiente a una reserva pasada elegible como Comensal, **Cuando** selecciono una o más fotos válidas desde mi dispositivo, **Entonces** el sistema las carga en el formulario de valoración *(F1, F2)*.
2. **Dado** que seleccioné una o más fotos en el formulario de valoración antes de enviarlo, **Cuando** reviso mi valoración, **Entonces** puedo visualizar la vista previa de todas las fotos seleccionadas (y quitar alguna si lo deseo) antes de publicar *(F3)*.
3. **Dado** que adjunté fotos válidas a mi valoración y confirmo su publicación, **Cuando** la valoración se guarda, **Entonces** las fotos quedan asociadas permanentemente a esa valoración de la experiencia *(F1)*.
4. **Dado** que existe una valoración publicada con fotos asociadas, **Cuando** otros usuarios (comensales o el restaurante en su panel de reseñas) consultan las opiniones del restaurante, **Entonces** pueden visualizar las fotos junto a la valoración correspondiente *(F3)*.
5. **Dado** que estoy adjuntando fotos al valorar una experiencia, **Cuando** selecciono un archivo cuyo formato no es imagen soportada (JPG, PNG o WebP), supera el tamaño máximo permitido (5 MB) o excede la cantidad máxima de fotos por valoración, **Entonces** el sistema rechaza el archivo inválido, informa el motivo en español y conserva tanto los datos de la valoración como las demás fotos válidas *(F1, F2)*.
6. **Dado** que la reseña de mi visita más reciente a un restaurante tiene fotos y ningún comentario escrito, y que publiqué una reseña de una visita anterior al mismo restaurante, **Cuando** alguien consulta Opiniones en el detalle público del restaurante, **Entonces** ve la reseña más reciente con sus fotos y la reseña anterior queda fuera de Opiniones.
7. **Dado** que completé la reseña y adjunté fotos válidas y fotos que el servidor va a rechazar, **Cuando** confirmo la publicación, **Entonces** la reseña no se publica, el formulario identifica cada foto rechazada y explica el motivo, y conserva la calificación, el comentario, el gasto ingresado y las fotos válidas para que pueda revisar y confirmar nuevamente.
8. **Dado** que una reseña de mi restaurante tiene fotos y quedó fuera de Opiniones porque el comensal publicó una reseña de una visita más reciente, **Cuando** consulto mi panel de reseñas, **Entonces** veo las fotos junto a la reseña de la visita anterior.

---

### Edge Cases

- **Formatos y peso máximo** *(F1)*: se aceptan fotos JPG, PNG y WebP de hasta **5 MB por archivo**, con validación del formato real y del tamaño en el servidor.
- **Mecanismo de subida y almacenamiento** *(propuesta técnica para el plan)*: carga mediante `multipart/form-data` y almacenamiento en el volumen persistente del backend FastAPI, de acuerdo con el principio V de la constitución.
- **Cantidad máxima de fotos por valoración** *(F2)*: se admiten hasta **4 fotos por valoración**. Si se intenta superar ese límite, el sistema informa el tope permitido.
- **Vista previa y descarte antes de publicar** *(F3 — propuesta para la PO)*: antes de enviar la valoración, el comensal ve miniaturas de las fotos seleccionadas y puede quitar cualquiera de ellas o sumar nuevas (hasta el límite de 4\) sin perder el puntaje ni el texto ya escritos.
- **Inmutabilidad posterior a la publicación**: las fotos se adjuntan durante la creación de la valoración (no se habilita editar ni agregar fotos a una reseña ya publicada, consistente con el comportamiento de US-27 y US-50).
- **Valoración sin fotos**: adjuntar fotos sigue siendo opcional; si el comensal no selecciona imágenes, la valoración se publica normalmente tal como en US-27 y US-50.
- **Elegibilidad de reserva pasada**: solo el comensal titular de una reserva pasada elegible y aún no valorada puede crear la valoración y adjuntar fotos. El sistema devuelve `404` si la reserva es ajena o inexistente, `409` si es inelegible o ya fue reseñada, y `400` si los datos de la valoración o las fotografías son inválidos.
- **Aislamiento y limpieza ante error**: si la validación o persistencia de la valoración falla, no quedan archivos huérfanos visibles públicamente y el formulario conserva lo completado por el usuario.

## Decisiones propuestas para la PO

- **F1 — Formatos y peso máximo (aprobado)**: imágenes JPG, PNG o WebP de hasta **5 MB** cada una, validadas en el servidor.
- **F2 — Límite por valoración (aprobado)**: hasta **4 fotos** por valoración. Adjuntarlas es opcional.
- **F3 — Vista previa y visualización**: se propone una galería de miniaturas con ampliación y la opción de quitar fotos antes de publicar. Se aprobó mostrar las fotos en las reseñas visibles en Opiniones y en todas las reseñas con fotos del panel privado del restaurante.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-57; F1, F2)*: El sistema MUST permitir al Comensal adjuntar una o más fotos (hasta 4 imágenes JPG, PNG o WebP de máximo 5 MB cada una) al valorar una experiencia correspondiente a una reserva pasada.
- **FR-002** *(US-57; F3)*: El sistema MUST mostrar al Comensal una vista previa de las fotos seleccionadas antes de publicar la valoración, permitiéndole quitar fotos seleccionadas antes de confirmar el envío.
- **FR-003** *(US-57; F1)*: El sistema MUST validar en servidor el formato real y tamaño máximo de cada archivo. Si rechaza una o más fotos en la confirmación, el sistema MUST impedir la publicación en ese intento, identificar cada foto rechazada y explicar el motivo en español. El formulario MUST conservar la calificación, el comentario, el gasto ingresado y las fotos válidas para que el comensal pueda revisar y confirmar nuevamente.
- **FR-004** *(US-57)*: Al publicar la valoración, el sistema MUST persistir las fotos asociadas a esa valoración específica (`review_id`).
- **FR-005** *(US-57; F3)*: En Opiniones, el sistema MUST mostrar únicamente la reseña de la visita más reciente de cada comensal en ese restaurante, aunque solo tenga estrellas. Si tiene fotos, el sistema MUST mostrarlas junto a la reseña, incluso cuando esta no tenga comentario escrito.
- **FR-006** *(US-57)*: El sistema MUST verificar que el usuario autenticado sea el Comensal titular de una reserva pasada elegible antes de aceptar la valoración y sus fotos.
- **FR-007** *(US-57; F3)*: El panel privado de reseñas MUST mostrar al restaurante las fotos junto a cada reseña de su local que las tenga, incluidas las reseñas de visitas anteriores que hayan quedado fuera de Opiniones.

### Key Entities

- **Valoración / Reseña** (extensión sobre US-27 / US-50): mantiene su vínculo con `reserva_id`, `comensal_id`, `restaurante_id`, rating, comentario y gasto por persona, e incorpora una colección ordenada de fotos (`ValoracionFoto`).
- **ValoracionFoto**: id, `valoracion_id`, `url` / ruta estática del archivo almacenado, `orden` (entero positivo `1..4`), `created_at` (UTC).

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: adjuntar entre 1 y 4 fotos al valorar una reserva pasada; previsualizar y quitar fotos antes de publicar; validar formato y tamaño; asociar las fotos a la valoración publicada; mostrar las fotos en Opiniones y en el panel privado de reseñas del restaurante.
- **Fuera**: editar o agregar fotos después de publicar la valoración, etiquetar platos individuales del menú en cada foto, filtros o recortes de imagen dentro de la app, subida de videos.
- **Compatibilidad con US-42 (spec 025, C1)**: la reseña de la visita más reciente habilita una primera respuesta del restaurante, aunque solo tenga estrellas o el local temporalmente no acepte reservas. Las reseñas de visitas anteriores solo permiten editar una respuesta existente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las valoraciones publicadas con fotos válidas persisten todas sus imágenes asociadas y las muestran correctamente a otros usuarios en las opiniones del restaurante.
- **SC-002**: 0 archivos con formato no soportado, tamaño mayor a 5 MB o cantidad superior a 4 por valoración son persistidos.
- **SC-003**: Un Comensal puede seleccionar fotos, revisar su vista previa y publicar la valoración de una reserva pasada en menos de 1 minuto.

## Assumptions

- El flujo base de valoración de reservas pasadas (US-27 y US-50) y la visualización de opiniones en el detalle del restaurante (US-9 / US-24) ya existen en la aplicación.
- El almacenamiento de archivos utiliza el volumen persistente del backend FastAPI sin servicios externos pagos (constitución, principio V).
- Idioma de la interfaz y mensajes: español (Argentina).
