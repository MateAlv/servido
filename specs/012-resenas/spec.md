# Feature Specification: Reseñas de Reservas (Calificar, Comentar y Ver Reseñas)

**Created**: 2026-11-05

**Input**: Backlog Servido! — US-27, US-50 (adelantada del Sprint 6 el 05/11), US-24, y el criterio pendiente de US-7 sobre la categoría de precio (decisiones R1–R19 del 05/11 incorporadas)

**Rol**: Comensal y Restaurante

**Sprint**: 4

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

## User Scenarios & Testing *(mandatory)*

### US-27 — Dar un rating de la experiencia (Prioridad: -, Estimación: 2)

Como **Comensal**, quiero calificar mi experiencia después de una experiencia, para compartir mi valoración con otros usuarios.

**Valor**: Las calificaciones de quienes reservaron ayudan a los demás a elegir restaurante, y son el dato que hoy les falta a los restaurantes reales en el mapa, el listado y el detalle.

**Independent Test**: Con un comensal verificado y una reserva terminada, entrar al inicio, abrir «¿Cómo estuvo?», elegir las estrellas y publicar. Comprobar que el promedio y la cantidad del restaurante cambian y que esa reserva ya no pide reseña. Comprobar también que una reserva próxima, una en curso, una cancelada y una que terminó hace más de 30 días no se pueden calificar.

**Acceptance Scenarios**:

1. **Dado** que tengo una reserva terminada, sin reseña y de hace 30 días o menos, **Cuando** entro al inicio, **Entonces** veo el bloque «¿Cómo estuvo?» con esa reserva, su restaurante y su fecha, junto a mis próximas reservas.
2. **Dado** que abrí la reseña de una reserva terminada, **Cuando** elijo de 1 a 5 estrellas, reviso y publico, **Entonces** la reseña queda publicada y asociada a esa reserva y a su restaurante, se me confirma y la reserva sale del bloque.
3. **Dado** que abrí la reseña de una reserva, **Cuando** intento avanzar sin elegir estrellas, **Entonces** no puedo y se me indica que elija una calificación.
4. **Dado** que tengo una reserva confirmada que todavía no terminó (próxima o en curso), **Cuando** quiero calificarla, **Entonces** no aparece en el bloque y el sistema no acepta la reseña.
5. **Dado** que tengo una reserva cancelada, **Cuando** quiero calificarla, **Entonces** no aparece en el bloque y el sistema no acepta la reseña.
6. **Dado** que una reserva terminó hace más de 30 días, **Cuando** quiero calificarla, **Entonces** no aparece en el bloque y el sistema no acepta la reseña, ni siquiera si el formulario ya estaba abierto al vencer el plazo; en ese caso se me informa que el plazo venció.
7. **Dado** que quiero calificar una reserva de otra persona o una que no existe, **Cuando** lo intento, **Entonces** el sistema no lo acepta y no revela si esa reserva existe.
8. **Dado** que ya publiqué la reseña de una reserva, **Cuando** intento publicar otra para la misma reserva (por ejemplo, desde otra pestaña), **Entonces** el sistema no la acepta, conserva la primera y me informa que ya la había publicado.
9. **Dado** que publiqué una reseña, **Cuando** vuelvo a la aplicación, **Entonces** no tengo ninguna forma de editarla ni de borrarla, y el sistema no acepta esos cambios.
10. **Dado** que no verifiqué mi email y tengo una reserva terminada, **Cuando** la veo en el bloque, **Entonces** se me indica que verifique mi email para dejar la reseña, con la opción de reenviar el mail, no se me ofrece el formulario y el sistema no acepta la reseña.
11. **Dado** que un restaurante tiene reseñas, **Cuando** alguien lo ve en el mapa, el listado o el detalle, **Entonces** ve su promedio de estrellas con un decimal y la cantidad de reseñas al lado (por ejemplo, «4,0 · 1 reseña»), contando solo la última reseña de cada persona; ambos cambian en cuanto se publica una reseña que cuenta.
12. **Dado** que tengo reseñas de dos visitas al mismo restaurante, **Cuando** se calcula el promedio, **Entonces** cuenta solo la de la visita más reciente, aunque haya publicado primero esa y después la de la visita anterior.
13. **Dado** que un restaurante real no tiene reseñas, **Cuando** alguien lo ve, **Entonces** no se muestra ningún promedio ni aviso de que faltan reseñas.

---

### US-50 — Dejar comentarios en texto (Prioridad: -, Estimación: 2)

Como **Comensal**, quiero dejar un comentario sobre mi experiencia, para compartir mi opinión con otros usuarios.

**Valor**: Las estrellas dicen cuánto gustó un lugar; el comentario dice por qué. El gasto informado además les da a los restaurantes una categoría de precio basada en datos reales.

**Independent Test**: Con una reserva terminada, escribir un comentario y un gasto, comprobar que la revisión los muestra como se van a publicar, volver a cambiarlos y publicar. Sin haber ingresado, abrir el detalle del restaurante y encontrar la opinión con el nombre y la inicial del autor, la fecha de la visita y el gasto.

**Acceptance Scenarios**:

1. **Dado** que estoy dejando la reseña de una reserva terminada, **Cuando** escribo un comentario de hasta 500 caracteres, **Entonces** el comentario queda como parte de esa reseña, asociado a la reserva y a su restaurante al publicarla.
2. **Dado** que estoy dejando una reseña, **Cuando** veo el formulario, **Entonces** se me pregunta cuánto gasté por persona, con una aclaración de que es opcional y de que el monto se publica en mi reseña.
3. **Dado** que completé el formulario, **Cuando** avanzo, **Entonces** veo «Así se va a ver», con mi nombre y mi inicial, la fecha de la visita, las estrellas y, si los completé, el comentario y el gasto; se me avisa que la reseña es definitiva y todavía no se publicó nada.
4. **Dado** que estoy en «Así se va a ver», **Cuando** vuelvo atrás, **Entonces** recupero lo que escribí, puedo cambiarlo y nada se publicó.
5. **Dado** que estoy en «Así se va a ver», **Cuando** elijo Publicar, **Entonces** la reseña se publica una sola vez, incluso si la acción se repite.
6. **Dado** que dejo vacíos el comentario o el gasto, o escribo solo espacios en el comentario, **Cuando** publico, **Entonces** la reseña se publica sin ese dato.
7. **Dado** que escribo un comentario de más de 500 caracteres, o un gasto que no es un monto entero mayor a 0 y de hasta $1.000.000, **Cuando** quiero avanzar o el dato llega al sistema, **Entonces** no se acepta y se me indica qué corregir.
8. **Dado** que se publicó una reseña con comentario que es la última de su autor en ese restaurante, **Cuando** cualquier persona, con o sin cuenta, abre el detalle del restaurante, **Entonces** ve en Opiniones el nombre y la inicial del autor, la fecha de la visita, las estrellas, el comentario y el gasto si lo informó, sin ningún otro dato personal.
9. **Dado** que publiqué antes una opinión con comentario, **Cuando** publico la reseña de una visita más reciente al mismo restaurante, con o sin comentario, **Entonces** la opinión anterior deja de verse en público, y solo se muestra la nueva si tiene comentario.
10. **Dado** que publico la reseña de una visita anterior a la de mi última reseña en ese restaurante, **Cuando** se publica, **Entonces** Opiniones sigue mostrando la de la visita más reciente.
11. **Dado** que una reseña no tiene comentario, **Cuando** alguien abre el detalle, **Entonces** no aparece en Opiniones, pero cuenta en el promedio y en la cantidad si es la última de su autor.

---

### US-24 — Ver Reseñas (Prioridad: -, Estimación: 1)

Como **Responsable del restaurante**, quiero ver las reseñas que dejan los comensales, para recibir feedback de la comida y servicio de mi restaurante.

**Valor**: El restaurante se entera de cómo fue la experiencia y cuánto gastan sus clientes, sin poder alterar lo que dijeron, lo que mantiene creíbles las reseñas.

**Independent Test**: Con un restaurante que tiene reseñas, entrar a «Reseñas» desde su inicio, comprobar lo que muestra cada una y el orden, y verificar que no hay forma de cambiarlas. Con otra cuenta de restaurante, comprobar que esas reseñas no aparecen.

**Acceptance Scenarios**:

1. **Dado** que mi restaurante tiene reseñas, **Cuando** abro Ver reseñas, **Entonces** veo todas, de la publicada más recientemente a la más antigua, cada una con el nombre y la inicial del autor, la fecha y el horario de la visita, las estrellas y, si los tiene, el comentario y el gasto por persona.
2. **Dado** que una persona publicó varias reseñas de mi restaurante, **Cuando** abro Ver reseñas, **Entonces** veo todas, incluidas las que ya no se muestran en público ni cuentan en el promedio.
3. **Dado** que abro Ver reseñas, **Cuando** miro el resumen, **Entonces** veo el promedio y la cantidad de personas que ven los comensales, y además la cantidad total de reseñas recibidas.
4. **Dado** que veo una reseña, **Cuando** busco cambiarla, **Entonces** no tengo ninguna opción para modificarla ni eliminarla, y el sistema rechaza cualquier intento.
5. **Dado** que hay reseñas de otro restaurante, **Cuando** abro Ver reseñas, **Entonces** no aparecen, y un comensal o un visitante no pueden abrir esta pantalla.
6. **Dado** que veo una reseña, **Cuando** la miro, **Entonces** no veo el email ni el teléfono del autor, ni un enlace a su reserva.
7. **Dado** que mi restaurante todavía no tiene reseñas, **Cuando** abro Ver reseñas, **Entonces** veo un estado vacío que explica que van a aparecer cuando los comensales las publiquen.
8. **Dado** que mi restaurante tiene más de 20 reseñas, **Cuando** abro Ver reseñas, **Entonces** veo las 20 más recientes y una acción «Ver más» que carga las siguientes.

---

### US-7 — Filtrar restaurantes por precios del menú (criterio pendiente de la spec 002)

La spec 002 cubre el filtro. Esta spec activa el criterio que dependía de US-50: «La categoría de un restaurante se calcula como la media de los montos gastados por comensales. Esto aparece únicamente al recibir 5 reseñas con precio por persona». Sus escenarios siguen la numeración de la spec 002.

**Independent Test**: Con un restaurante real que declaró `$$` y 4 personas que informaron un gasto de $30.000, comprobar que sigue en `$$`. Sumar una quinta persona y comprobar que pasa a `$$$` en el detalle y en el resultado del filtro.

**Acceptance Scenarios**:

4. **Dado** que hasta 4 personas informaron un gasto en un restaurante real, **Cuando** alguien lo ve o usa el filtro de precio, **Entonces** se usa la categoría que declaró el restaurante.
5. **Dado** que 5 o más personas informaron un gasto en un restaurante real, **Cuando** alguien lo ve o usa el filtro de precio, **Entonces** la categoría sale de la media de esos gastos, con los límites de la spec 002, y el detalle muestra esa media por persona.
6. **Dado** que una persona informó gastos en más de una visita, **Cuando** se calcula la media, **Entonces** cuenta una sola vez, con el gasto de su visita más reciente que tenga un monto, aunque su última reseña no lo tenga.
7. **Dado** que un restaurante ya tiene categoría calculada, **Cuando** cambia la categoría declarada en su perfil, **Entonces** los comensales siguen viendo la calculada.

---

### Edge Cases

Todas las decisiones de esta sección son del equipo (05/11) y falta que la PO las valide.

- **Qué es una reserva realizada** *(R2)*: una reserva confirmada, no cancelada, cuyo horario de fin ya pasó (inicio más 90 minutos). Exactamente a la hora de fin ya se puede calificar. Nadie registra si el comensal fue, así que quien no se presentó también puede calificar: el riesgo se acepta para el MVP.
- **Una reseña por reserva, definitiva** *(R4)*: cada reserva admite una sola reseña, y ni el comensal ni el restaurante pueden editarla o borrarla. El formulario lo avisa antes de publicar. Una reserva sin pedido se puede calificar igual: se califica la experiencia, no el pedido.
- **Plazo** *(R9)*: se puede publicar hasta 30 días después del horario de fin, inclusive. Vencido el plazo, la reserva sale del bloque sin avisar.
- **Bloque del inicio** *(R7)*: aparece solo si hay reservas para calificar, de la que terminó más recientemente a la más antigua, hasta 20 a la vez. No se puede descartar una reserva: sale al calificarla o al vencer el plazo. El bloque no depende de la sección de reservas de US-23.
- **Comensal sin email verificado** *(R8)*: ve la reserva en el bloque con el aviso de verificación, pero no puede completar la reseña. Es la misma regla que tiene el pedido (spec 009, P13). Cuando verifica, ya puede calificar.
- **Última reseña de cada persona** *(R13, R14)*: es la de la visita más reciente de esa persona en ese restaurante, según la fecha de la reserva y no la de publicación. Si dos reservas empiezan a la misma hora, gana la publicada después.
- **Lo que deja de verse en público** *(R14)*: una reseña nueva puede esconder una opinión anterior aunque la nueva no tenga comentario. Se acepta: en público, cada persona está representada por su última visita. La anterior no se borra y el restaurante la sigue viendo.
- **Cantidad y lista de Opiniones** *(R12, R14)*: la cantidad cuenta una reseña por persona; Opiniones lista solo a las que tienen comentario en su última reseña, de la visita más reciente a la más antigua. Por eso la lista puede ser más corta que la cantidad, pero nunca más larga. Cuando nadie tiene comentario, la sección no se muestra.
- **Promedio con pocas reseñas** *(R12)*: se muestra desde la primera, siempre con la cantidad al lado. Una sola reseña mala pesa mucho al principio y se acepta, porque US-27 pide que la calificación se refleje una vez enviada.
- **Nombre del autor** *(R10, R17)*: la primera palabra del nombre y la inicial de la última («Juan Pablo Pérez» se ve «Juan P.»). Con una sola palabra, solo esa. Sin nombre cargado, se ve «Comensal». El nombre se toma al mostrar la reseña: si la persona lo cambia, cambia en todas.
- **Gasto público** *(R11)*: el monto se publica en la reseña junto al nombre y la inicial del autor, y lo ve también el restaurante. El formulario y la revisión lo avisan.
- **Reserva terminada y cancelación**: una reserva que ya terminó no se puede cancelar, así que una reseña nunca queda sobre una reserva cancelada. Lo deben respetar US-25 y US-38.
- **Categoría calculada y filtro** *(R6, R15)*: la media se redondea al peso entero y usa los límites de la spec 002. Un restaurante sin menú sigue fuera del filtro de precio, como pide esa spec, aunque tenga categoría calculada. El restaurante sigue viendo y editando en su perfil la categoría que declaró.
- **Restaurante que dejó de tomar reservas**: las reseñas se conservan, sus reservas terminadas se pueden calificar y el restaurante las ve en US-24. Su detalle público sigue el criterio de la spec 005 (D4).
- **Restaurantes de prueba**: conservan sus opiniones y calificaciones de prueba, no se pueden calificar y nunca se mezclan con reseñas reales.
- **Comentarios ofensivos** *(R19)*: no hay moderación ni denuncia en el MVP, y el restaurante no puede borrar comentarios (US-24). Si la PO pide retirar uno, lo hace el equipo a mano. Queda planteado a la PO en la validación de esta spec.
- **Sesión vencida**: se le pide ingresar de nuevo y vuelve al inicio; lo que escribió y no publicó puede perderse, porque una reseña no se guarda hasta publicarla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-27; R2)*: El sistema MUST aceptar una reseña solo de una reserva propia, confirmada, cuyo horario de fin haya pasado y que haya terminado hace 30 días o menos (R9).
- **FR-002** *(US-27; R4)*: El sistema MUST admitir como máximo una reseña por reserva y MUST NOT permitir que el comensal ni el restaurante la modifiquen o eliminen.
- **FR-003** *(US-27)*: Cada reseña MUST tener una calificación entera de 1 a 5 y quedar asociada a su reserva, su restaurante y su autor.
- **FR-004** *(US-27; R7)*: El inicio del comensal MUST mostrar el bloque «¿Cómo estuvo?» con sus reservas por calificar, y MUST NOT mostrarlo si no hay ninguna.
- **FR-005** *(US-27; R8)*: El sistema MUST NOT aceptar reseñas de comensales sin email verificado, y MUST ofrecerles verificar el email desde el bloque.
- **FR-006** *(US-27; R12, R13)*: El sistema MUST calcular el promedio de un restaurante real y su cantidad de personas con la última reseña de cada persona, y MUST mostrarlos desde la primera reseña en el mapa, el listado y el detalle. Si no hay reseñas, MUST NOT mostrar un promedio ni un aviso.
- **FR-007** *(US-50; R1)*: El formulario MUST ofrecer un comentario opcional de hasta 500 caracteres.
- **FR-008** *(US-50; R5, R11)*: El formulario MUST preguntar el gasto por persona, opcional, en pesos enteros, mayor a 0 y de hasta $1.000.000, y MUST avisar que se publica en la reseña.
- **FR-009** *(US-50; R16)*: Antes de publicar, el sistema MUST mostrar siempre «Así se va a ver», con el aviso de que la reseña es definitiva, permitir volver sin perder lo escrito y MUST NOT publicar nada hasta la confirmación explícita.
- **FR-010** *(US-50; R3, R14)*: El detalle público MUST mostrar en Opiniones la última reseña de cada persona, solo si tiene comentario, y MUST NOT mostrar las anteriores de esa persona.
- **FR-011** *(US-50; R10)*: Las opiniones públicas MUST mostrar solo el nombre y la inicial del autor, la fecha de la visita, las estrellas, el comentario y el gasto si lo tienen, y MUST NOT exponer otros datos del autor.
- **FR-012** *(US-24; R17)*: El restaurante MUST poder ver todas las reseñas de su restaurante, de la publicada más recientemente a la más antigua, con el nombre y la inicial del autor, la fecha y el horario de la visita, las estrellas, y el comentario y el gasto si los tienen, 20 a la vez.
- **FR-013** *(US-24)*: La pantalla del restaurante MUST mostrar el promedio y la cantidad de personas que ven los comensales, y la cantidad total de reseñas.
- **FR-014** *(US-24)*: El sistema MUST mostrarle a cada restaurante solo sus propias reseñas, y MUST NOT ofrecer esa pantalla a comensales o visitantes.
- **FR-015** *(US-24; R17)*: La pantalla del restaurante MUST NOT mostrar datos de contacto del autor ni enlazar a su reserva.
- **FR-016** *(US-7; R6, R15)*: Con 5 o más personas distintas con un gasto informado, la categoría de precio pública de un restaurante real MUST salir de la media del gasto más reciente de cada una, y el detalle MUST mostrar esa media por persona. Por debajo de 5, MUST usarse la categoría declarada.
- **FR-017** *(US-7; R6)*: El filtro de precio MUST usar la categoría pública del restaurante, sea calculada o declarada.

### Key Entities

- **Reseña**: la valoración de una reserva realizada. Tiene la reserva, el restaurante, el autor, la calificación de 1 a 5, el comentario y el gasto por persona (estos dos, opcionales) y la fecha de publicación. Es definitiva. Más adelante sumará la respuesta del restaurante (US-42) y las fotos (US-57).
- **Reserva** (spec 005): no cambia. Una reserva está realizada cuando sigue confirmada y su horario de fin ya pasó.
- **Calificación del restaurante**: el promedio y la cantidad de personas; se derivan de la última reseña de cada persona.
- **Categoría de precio pública**: la calculada desde 5 personas con un gasto informado; si no, la declarada por el restaurante.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: calificar y comentar una reserva realizada, con gasto opcional y revisión antes de publicar; bloque «¿Cómo estuvo?» en el inicio del comensal; promedio y cantidad en el mapa, el listado y el detalle; opiniones reales en el detalle; pantalla de reseñas del restaurante; categoría de precio calculada (US-7).
- **Cambios sobre otras specs**: al implementarla, se actualizan en la spec 002 FR-013 y el criterio del filtro de precio, que hoy dicen que las reseñas reales no existen, y en la spec 005 el supuesto de que los restaurantes reales no tienen calificaciones ni opiniones.
- **Superposiciones con otras US**:
  - **US-23** (Ver reserva activa, Sprint 4): el bloque de reseñas no entra en su sección de reservas. Si después el equipo unifica ambas pantallas, el bloque se puede mover sin cambiar estas reglas.
  - **US-25 y US-38** (cancelaciones): deben impedir cancelar una reserva que ya terminó.
  - **US-35** (Filtrar por ratings, Sprint 5): debe usar el promedio de esta spec.
- **Fuera**:
  - Responder reseñas (US-42) y subir fotos (US-57), que se apoyan en esta reseña.
  - Filtrar por rating (US-35).
  - Registrar la asistencia al restaurante y distinguir a quien no se presentó.
  - Editar, borrar, moderar o denunciar reseñas.
  - Una página «Mis reseñas», donde el comensal repase lo que publicó.
  - Recordatorios por mail o notificaciones de reseñas nuevas.
  - Calificaciones separadas de comida y servicio, y medias estrellas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un comensal verificado publica una reseña de una reserva terminada, con estrellas y comentario, en menos de 1 minuto desde el inicio.
- **SC-002**: 0 reseñas publicadas sobre reservas ajenas, canceladas, no terminadas o terminadas hace más de 30 días, o por comensales sin email verificado.
- **SC-003**: Ninguna reserva tiene más de una reseña, y en el 100% de los casos una reseña publicada conserva su contenido original.
- **SC-004**: En el 100% de los restaurantes reales con reseñas, el promedio y la cantidad son iguales a los calculados a mano con la última reseña de cada persona, en el mapa, el listado, el detalle y la pantalla del restaurante.
- **SC-005**: En el 100% de los restaurantes reales, la categoría pública es la calculada solo con 5 o más personas con un gasto informado, y la declarada en los demás casos.
- **SC-006**: Ninguna pantalla pública ni la pantalla de reseñas del restaurante muestra el email, el teléfono ni el apellido completo del autor.

## Assumptions

- Es una sola calificación general, en estrellas enteras: US-27 pide «la experiencia» y no separa comida de servicio.
- El monto va en pesos enteros, y el máximo de $1.000.000 solo evita errores de tipeo. Comentario y gasto son valores que el comensal informa; nadie los verifica.
- Un responsable de restaurante no puede publicar reseñas, porque no tiene reservas como comensal.
- Todas las reservas ya terminadas pueden calificarse desde que se publique esto, si están dentro de los 30 días.
- **Datos de demo en producción** *(R18)*: para la defensa del 11/11 hacen falta reservas ya terminadas, y una reserva no se puede crear en el pasado. Un script carga reservas terminadas y reseñas directo en la base, con estos límites: toca solo el restaurante de demo que se le indica y nunca uno real; es repetible y puede borrar todo lo que creó; las cuentas de los reseñadores permiten ingresar, con una contraseña que se indica al correrlo y que no queda en el repositorio; solo se corre con la aprobación explícita de Mateo. Sobre un restaurante de demo, estas reseñas son datos de prueba, no opiniones reales. Los datos locales de `make up-local` también traen reservas terminadas.
- **Cambio de planificación** *(R1)*: US-50 pasa del Sprint 6 (Integrante 3) al Sprint 4 (Integrante 1). El Sprint 4 sube de 13 a 15 SP y el Sprint 6 baja de 17 a 15. Falta actualizarlo en la planilla, a cargo de quien tenga permiso de edición, y avisarle a Integrante 3.
- Idioma de la interfaz y de los mensajes: español (Argentina).
- Fechas y horarios en la zona horaria de Argentina (America/Argentina/Buenos_Aires).
