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
| [002-elegir-restaurante](002-elegir-restaurante/spec.md) | Comensal | 5, 7, 9, 33 | 13 | 1 (US-33 adelantada del 4) | ✅ | ✅ | ✅ | ✅ US-5, US-7, US-9, US-33 (restaurantes de prueba y, desde el 28/10, los reales que se pueden reservar) |
| [003-cuenta-restaurante](003-cuenta-restaurante/spec.md) | Restaurante | 2, 4, 28 | 5 | 1 (US-28 adelantada del 4 al 2) | ✅ | ✅ (solo Google) | ✅ (solo Google) | ✅ US-2, US-4 (S3 probado desde el 28/10), US-28 |
| [004-local-horarios-mesas](004-local-horarios-mesas/spec.md) | Restaurante | 6, 8, 10 | 6 | 2 | ✅ | ✅ | ✅ | ✅ US-6, US-8, US-10 (el tipo de mesa de los grupos, decidido el 28/10, entra con la US-13) |
| [005-reservar-mesa](005-reservar-mesa/spec.md) | Comensal | 11, 13 | 5 | 2 (US-11) y 3 (US-13) | ✅ | ✅ | ✅ | ✅ US-11 y US-13, con backend real (decisiones D1–D11 del 28/10, falta que la PO las valide) |
| [006-menu-platos](006-menu-platos/spec.md) | Restaurante | 12 | 3 | 2 | ✅ | — | — | — |
| [007-cuenta-comensal-google-verificacion](007-cuenta-comensal-google-verificacion/spec.md) | Comensal | 52, 51, 58 | 3 | 2 (adelantadas del 6) | ✅ | ✅ | ✅ | ✅ US-52, US-51, US-58 (falta validar con la PO; US-51 S5 se prueba con US-17) |
| [009-pedido-anticipado](009-pedido-anticipado/spec.md) | Comensal | 17, 19, 21 | 5 | 3 | ✅ | ✅ | ✅ | — (decisiones P1–P14 del 30/10, falta que la PO las valide) |

Arrastre de la spec 003: el HTTP 403 por rol de US-4 (escenario 3) se prueba desde el 28/10 en `backend/tests/test_auth.py::test_us4_s3_restaurant_gets_403_on_diner_endpoints`. La spec 002 muestra los restaurantes de prueba de `frontend/src/data/restaurants.fixture.ts` y, desde el 28/10, los reales que se pueden reservar (D4).

Faltan las specs del resto de las US de los Sprints 3 a 6; del Sprint 3 están US-13 (005) y US-17, US-19 y US-21 (009), y US-14, US-16 y US-18 vienen en la 008 (PR #30) (ver [backlog](../docs/product/backlog.md)). Según el riesgo 8, conviene tenerlas listas antes para poder adelantar US.

### Pendientes del equipo

- El `plan.md` y el `tasks.md` de la spec 003 cubren solo lo de Google (25/10). Falta documentar ahí lo construido en el Sprint 1 (US-2 y US-4) para cumplir la [Definition of Done](../AGENTS.md#definition-of-done).
- Spec 001: falta el test de frontend de US-3 S1 (ver `tasks.md`, T022).
- Spec 009 (US-17, US-19, US-21): antes de mergear la spec, que la revisen quienes tomaron US-20 y US-22 en la votación del Sprint 3 y Ezequiel por US-18 (spec 008), porque leen el modelo del pedido (`data-model.md`). Para la PO y el PM quedan abiertos:
  - US-22 no puede estar completa en el Sprint 3: el medio de pago llega con US-45 y el estado de pago con US-56 y US-60.
  - Con un plato de más de 45 minutos, la cocina podría empezar antes de que venza el plazo para cambiar el pedido.
  - US-25 permite cancelar hasta 30 minutos antes, con el pedido ya cerrado.
  - Hay que reestimar US-47, porque «Ver pedido» ya cubre casi todo.
  - US-15 quedó sin responsable. La página del pedido ya muestra el menú por categoría con nombre, descripción y precio; quien la tome debería extender ese menú en vez de armar otro.
  - US-23 (Sprint 4): «Tus próximas reservas» del inicio se parece a su «sección de reservas»; quien la tome debería extender esa lista.
  - El carrito guardado en el servidor (P1) le suma trabajo a US-17 (dos tablas y dos endpoints); el equipo estima que entra en sus 3 SP.

  Detalle en `specs/009-pedido-anticipado/research.md`. En la planilla, US-17 figura para el Integrante 4 y US-19 y US-21 para el 5; en la votación las tomó Mateo.
- Spec 005 (US-13): falta sumar el escenario 6 a la US-13 en la planilla y exportar `backlog.md` (T033a), cargar los datos de demo en producción (T055) y hacer el pase en navegador a 360 px y con teclado (T024/T032). Las decisiones D1–D11 esperan la validación de la PO.

### Numeración

Al migrar las specs al repo se renumeraron dos para que no haya números repetidos: la spec de cuenta de restaurante pasó de `002` a `003`, y la de reservar mesa de `003` a `005`.

## Pendientes de aclarar con la PO

Las specs marcan estas dudas como `[NEEDS CLARIFICATION]`. Las de la spec 002 se implementaron con la propuesta actual para la demo del 21/10 y siguen esperando la confirmación de la PO.

| Spec | Duda | Propuesta actual |
| --- | --- | --- |
| 002 | Fuente y umbrales de la concurrencia (bajo/medio/alto) y frecuencia de actualización | Valor por restaurante provisto por los datos de prueba; la demo refresca cada 30 s. Los restaurantes reales todavía no tienen concurrencia y no muestran el indicador (D4, 28/10). Implementado así; falta que la PO lo confirme |
| 002 | Ubicación denegada | Mapa centrado en Buenos Aires, sin distancias, con aviso y botón para reintentar. Implementado así; falta que la PO lo confirme |
| 005 | Cantidad de comensales, elección de una mesa concreta, criterio de horario ocupado, duración y granularidad de la reserva, catálogo de tipos de mesa, aprobación del restaurante | Decididos por el equipo el 23/10 y el 28/10 (ver las decisiones D1–D11 abajo y `specs/005-reservar-mesa/research.md`). Falta que la PO los valide |

## Decisiones del equipo

Decisiones que tomó el equipo y ya están incorporadas en cada spec. Las que dicen «falta que la PO lo valide» se llevan a la PO en la próxima revisión.

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
| 24/10 | 007 | El comensal sin verificar puede pedir "Reenviar mail de verificación"; cada reenvío invalida los enlaces anteriores. Falta que la PO lo valide |
| 24/10 | 007 | Ingresar con Google a una cuenta sin verificar la deja verificada, porque Google ya comprobó el email. Falta que la PO lo valide |
| 25/10 | 007 | Se adelanta US-58 (Crear cuenta con Google) del Sprint 6 al 2, junto con US-52. Si al ingresar con Google no hay cuenta, se ofrece crearla con la misma cuenta de Google |
| 25/10 | 003 | Se construye el registro con Google de US-2 (pendiente desde el 21/10) y se adelanta US-28 del Sprint 4 al 2. Con Google, el formulario del restaurante pide los mismos datos sin mail ni contraseña; si al ingresar con Google no hay restaurante, se ofrece registrarlo con esa cuenta. Falta que la PO lo valide |
| 21/10 | 002 | US-33 (listado de restaurantes, 5 SP) se adelanta del Sprint 4 al 1: el listado acompaña al mapa y cumple sus criterios |
| 23/10 | 005 | *(Reemplazada el 28/10: los datos de prueba se borraron cuando existió el backend.)* Lo que el flujo todavía no tiene (turnos y mesas de la 004, un horario ya ocupado) se muestra con datos de prueba en `frontend/src/data/reservationAvailability.fixture.ts`, servidos por `frontend/src/api/availability.ts` y rotulados «Datos de prueba» en la UI, como los restaurantes de prueba de la 002. No se mockea la creación de la reserva (US-13) ni se agregan datos falsos al backend; el mock se borra cuando existan los endpoints |
| 23/10 | 005 | El máximo de comensales por reserva lo define el restaurante: es la capacidad de su mesa habilitada más grande, no un límite fijo del sistema ni infinito. Se devuelve como `max_party_size`, el formulario lo usa como tope y un enlace editado a mano se ajusta a ese valor. No se agrega una columna en `restaurantes`: duplicaría lo que ya dicen las mesas de la 004 |
| 23/10 | 005 | La US-11 no elige una mesa concreta: sigue el prototipo `prototipo-us11.html`, la pantalla informa si hay mesa disponible para la preferencia elegida («Hay mesa disponible…» o el aviso de S7) y la mesa se asigna al confirmar la reserva (US-13). La URL lleva `?fecha=&hora=&personas=&tipo=` sin `mesa`, la respuesta de mesas es informativa y cambian la spec, `plan.md`, `tasks.md`, `data-model.md`, `contracts/` y `quickstart.md`. Falta que la PO lo confirme |
| 28/10 | 004, 005 | D1: una reserva identifica su mesa por el grupo (restaurante, capacidad, tipo) y un número interno dentro del grupo, que no se muestra. La base impide la doble reserva. Falta que la PO lo valide |
| 28/10 | 005 | D2: la «mesa asignada» de la revisión es el grupo más chico del tipo elegido en el que entra el grupo de comensales, mostrado como «Mesa para 4 · Terraza». Falta que la PO lo valide |
| 28/10 | 004 | D3 y D6: cada grupo de mesas tiene un tipo de un catálogo fijo (Adentro, Afuera, Terraza); los grupos existentes quedan «Adentro». Falta que la PO lo valide |
| 28/10 | 002, 005 | D4: el mapa, el listado y el detalle suman los restaurantes reales que se pueden reservar (con ubicación, turnos y mesas) a los de prueba; solo los reales se reservan. De los reales no se muestra nada que no tengan: sin indicador de concurrencia, calificaciones ni opiniones, y sin foto, menú, dirección o barrio si no los cargaron (nunca un «sin datos»). Falta que la PO lo valide |
| 28/10 | 005 | D5: las reservas duran 90 minutos y se ofrecen cada 30. D7: quedan confirmadas al crearse, sin aprobación del restaurante. Falta que la PO lo valide |
| 28/10 | 005 | D8: si el comensal ya tiene una reserva confirmada que se superpone, la revisión se lo avisa y puede confirmar igual (US-13, escenario 6). Un comensal puede tener dos mesas en el mismo restaurante y horario. Falta sumarlo a la US-13 en la planilla y que la PO lo valide |
| 28/10 | 004, 005 | D9: si el restaurante baja, deshabilita o cambia (capacidad o tipo) un grupo de mesas con reservas que no terminaron, el cambio se rechaza y se le listan esas reservas. Es la advertencia de US-10 S3 sin la opción de guardar igual. Falta que la PO lo valide |
| 28/10 | 005 | D10: se puede reservar hasta 60 días antes (valor provisorio). Sin un límite, una reserva a años de distancia bloquearía para siempre esas mesas (D9). Falta que la PO elija el plazo |
| 28/10 | 005 | Si el restaurante cambia sus horarios, las reservas ya confirmadas se mantienen. Queda para la PO si ese cambio debería advertir como el de mesas |
| 28/10 | 005 | D11: un comensal puede tener como máximo 20 reservas confirmadas para un mismo día y 5 en un mismo restaurante ese día; si las supera, la reserva no se crea y se le avisa. Evita que alguien acapare las mesas. Falta que la PO lo valide |
| 28/10 | 002 | Los marcadores del mapa muestran solo el nombre del restaurante, sin la forma ni el color de la concurrencia, y se quita la leyenda que tapaba parte del mapa. La concurrencia aparece en la tarjeta que se abre al tocar el marcador (US-5 S2), en el listado (US-33) y en el detalle, solo si hay datos; «Actualizado hh:mm» y el aviso de concurrencia desactualizada tampoco se muestran si ningún restaurante tiene datos. Falta que la PO lo valide |
| 28/10 | 001, 005 | Un visitante que abre un restaurante reservable ve «Ingresá para reservar»; después de ingresar, o de crear su cuenta (con email o con Google), vuelve a la reserva (`?volver=`, solo a direcciones del sitio). Falta que la PO lo valide |
| 28/10 | 004, 005 | Topes de los datos del restaurante y de la reserva: hasta 100 personas por mesa, 200 mesas por grupo, 50 grupos y 2000 caracteres de descripción; la cantidad de personas de una reserva va de 1 a 100. Son defensas contra abusos, no reglas de producto |
| 28/10 | 005 | `GET /api/reservations?date=` (las reservas del día del comensal) acepta fechas desde un año atrás hasta 60 días adelante |
| 28/10 | 004 | En la pantalla de mesas, `free_quantity` cuenta las mesas del grupo que no están ocupadas por una reserva en este momento |
| 30/10 | 009 | P1: mientras el comensal arma el pedido, cada cambio se guarda en su cuenta como un pedido en armado (carrito), aparte de los pedidos confirmados: sobrevive a recargar, cerrar sesión o cambiar de dispositivo. Solo «Confirmar pedido» lo convierte en el pedido de la reserva; mientras tanto la página avisa que el restaurante todavía no lo ve, y el restaurante solo ve pedidos confirmados. Un pedido confirmado se puede cambiar y confirmar de nuevo hasta 45 minutos antes de la reserva; queda el último cambio y la última confirmación. Primero se eligió un carrito en el navegador; Mateo lo cambió el mismo día por este. Falta que la PO lo valide |
| 30/10 | 009 | P2: el tiempo estimado del pedido es el del plato más lento, sin importar las cantidades. Los platos sin tiempo no cuentan (con datos parciales, es el más lento de los que tienen); si ninguno tiene, no se muestra ni se avisa. Falta que la PO lo valide |
| 30/10 | 009 | P3: los precios del menú son finales, con impuestos incluidos. La cuenta lista plato, cantidad, precio unitario y subtotal, y el total aclara «Impuestos incluidos». Falta que la PO lo valide |
| 30/10 | 009 | P4: el comensal llega al pedido desde la confirmación de la reserva y desde «Tus próximas reservas» en su inicio, una lista mínima que no reemplaza a la US-23. Falta que la PO lo valide |
| 30/10 | 009 | P5–P14: un pedido por reserva; el plazo de 45 minutos vale para crear, cambiar y quitar, y se muestra como hora («Podés cambiarlo hasta las 20:15»); la hora de llegada es la de la reserva hasta la US-43; nombre, precio y tiempo de cada plato quedan fijos al confirmar; si el menú cambió mientras se armaba (plato quitado o con otro nombre, precio o tiempo), la confirmación se frena y se muestra qué cambió; de 1 a 20 unidades por plato y hasta 50 platos distintos; confirmar sin platos deja la reserva sin pedido, previa confirmación; el pedido de una reserva cancelada queda cancelado, sin borrarse; un comensal sin email verificado puede armar el pedido pero no confirmarlo (lectura de US-51 S5); sin menú no se ofrece pedido. Falta que la PO lo valide |

## Notas de formato

Las specs de comensal siguen la plantilla de Spec Kit sin detalles técnicos. Las de restaurante incluyen códigos HTTP y nombres de columnas; al planificar, esos detalles se mueven a `plan.md` y `data-model.md`, y los nombres se traducen según el glosario de [AGENTS.md](../AGENTS.md#domain-glossary).
