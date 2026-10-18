# Plan del proyecto

Resumen del cronograma, el plan de comunicación, el registro de riesgos y el plan de costos de la planilla del equipo (snapshot 2026-10-18). Ante cualquier diferencia, manda la planilla.

## Equipo

| Integrante | Nombre | PM del sprint |
| --- | --- | --- |
| 1 | Mateo | 1 |
| 2 | Santiago | 2 |
| 3 | Ezequiel | 3 |
| 4 | Lourdes | 4 |
| 5 | Ignacio | 5 |
| 6 | Matías | 6 |

**Product Owner**: Chiara, ayudante de la cátedra. Valida las specs y acepta las US en cada review.

El PM rota cada sprint: coordina la planning, el seguimiento (pestañas *Sprint n* y *Avance*, riesgos, métricas y uso de IA), la retro y la defensa.

## Hitos ya cumplidos

| Fecha | Defensa | Contenido |
| --- | --- | --- |
| 09/09 | Inicio | Visión, personas, features, USM, backlog, WBS y cronograma de alto nivel |
| 23/09 | Planificación | Plan de comunicaciones, planilla de costos y cierre de Lean Inception |
| 14/10 | Sprint 0 | Backlog iterado y estimado (61 US, 105 SP), cronograma con PM por sprint, specs de los Sprints 1 y 2, prototipos del Sprint 1 y gestión de riesgos |

## Sprints

Sprints de una semana, de jueves a miércoles. Cada sprint cierra el miércoles con su defensa (demo y retro).

| Sprint | Fechas | PM | SP | Objetivo (demo de la defensa) | US |
| --- | --- | --- | --- | --- | --- |
| 1 | 15/10 – 21/10 | Mateo | 16 | Registro e inicio de sesión de comensales y restaurantes. El comensal ve el mapa, filtra por precio y ve el detalle de un restaurante (con restaurantes de prueba cargados) | 1, 2, 3, 4, 5, 7, 9 |
| 2 | 22/10 – 28/10 | Santiago | 12 | El restaurante carga datos, horarios, mesas y platos; el comensal crea una reserva. **Primera versión en producción** | 6, 8, 10, 11, 12 |
| 3 | 29/10 – 04/11 | Ezequiel | 18 | El comensal confirma la reserva y crea su pedido; el restaurante ve calendario, cliente, cancelaciones, pedidos del turno y estado de pago | 13–22 |
| 4 | 05/11 – 11/11 | Lourdes | 19 | **MVP completo**: reserva activa, cancelación y calificación; además términos, capacidad, bloqueos, listado y editar platos | 23–34 |
| 5 | 12/11 – 18/11 | Ignacio | 20 | Reembolsos, horarios disponibles, cantidad de personas, detalle del plato, mails de validación y recuperar cuenta del restaurante | 35–47 |
| 6 | 19/11 – 25/11 | Matías | 20 | Promociones, pago electrónico y en efectivo, Google, filtros y fotos. **Entrega final el 25/11** (cierre de código el martes 24/11) | 48–61 |

- El MVP termina en el Sprint 4; los Sprints 5 y 6 funcionan como colchón.
- Semanas con menos capacidad (entregas de otras materias y la FIUBA Talk del 04/11): Sprints 2, 3 y 5. En cada planning cada uno avisa su disponibilidad y se le asignan menos puntos.
- Las US 40 y 43 todavía no tienen estimación del equipo (2 y 3 SP propuestos).
- El detalle de cada US, con su asignación, está en [backlog.md](backlog.md).

## Trabajo transversal

| Tarea | Cuándo | Responsables |
| --- | --- | --- |
| Repositorio con integración continua y entorno de prueba en AWS | Sprint 1 | Integrantes 3, 4 y 6 |
| Producción en AWS con dominio y HTTPS; después, un deploy por semana | Desde el cierre del Sprint 2 | Integrante 4 |
| Pruebas automáticas de cada US a partir de su spec, que corren en cada cambio | Todos los sprints | Integrante 6 |
| Specs y prototipos de las US del sprint siguiente | Todos los sprints | Todos |

## Ceremonias y comunicación

| Comunicación | Frecuencia | Objetivo | Owner | Audiencia |
| --- | --- | --- | --- | --- |
| Kick-off | Única vez | Plantear las ideas de producto | Desarrolladores | — |
| WhatsApp / Discord | Esporádica | Organizar los objetivos semanales | Desarrolladores | — |
| Reunión de avance | 2 veces por semana | Construir e iterar los entregables | Desarrolladores | — |
| Sprint Planning | Una vez por sprint (jueves) | Objetivos y alcance del sprint | Profesores | Desarrolladores |
| Sprint Review | Cada sprint (miércoles, con la PO) | Exposición y revisión de los entregables | PO | Desarrolladores |
| Retrospectiva | Antes de cada defensa | Mejorar el proceso | Equipo | Equipo |
| Demo al cliente | Única vez | Mostrar resultados | Desarrolladores | Estudiantes |

## Riesgos

Ordenados por exposición. La columna "En el código" indica qué tiene que respetar la implementación.

| # | Riesgo | Exp. | Respuesta | En el código |
| --- | --- | --- | --- | --- |
| 5 | Un comensal celíaco o con otra restricción recibe un plato que no la cumple | 0,48 | Transferir: en los términos y condiciones el restaurante es responsable de lo que declara | Mostrar las restricciones como "declaradas por el restaurante". Contingencia: poder ocultar la etiqueta de un plato reportado |
| 1 | El comensal no se presenta y el pedido ya se preparó | 0,36 | Mitigar: la preparación arranca en la hora sugerida (llegada menos tiempo de preparación); política de cancelación con hora límite visible antes de confirmar; seña opcional por restaurante | Calcular la hora sugerida de inicio. Contingencia: marcar la reserva como ausente 20 minutos después de la hora confirmada y liberar la mesa |
| 2 | Servido! confirma una reserva sin mesa real | 0,24 | Mitigar: capacidad para Servido! por turno, bloqueos y mesas no disponibles | La base de datos no admite dos reservas para la misma mesa y turno; prueba automática de dos reservas simultáneas |
| 4 | Servido! registra mal el estado de pago | 0,24 | Mitigar | "Pagado" solo cambia por la notificación de Mercado Pago o por el cobro en efectivo registrado por el restaurante; un pedido pagado no se puede volver a cobrar. Probar un pago de prueba un sprint antes de la US de pago electrónico |
| 8 | Oportunidad: con specs claras e IA se terminan US antes de lo planificado | 0,16 | Explotar | Tener lista la spec de todas las US para adelantar trabajo |
| 7 | Mapa, login con Google y mails demoran más de lo previsto | 0,12 | Mitigar: hacer los trámites (Google Cloud, dominio, salida del modo prueba de SES) en el Sprint 1 | Mapa con OpenStreetMap (ya elegido, ver [ADR 0003](../decisions/0003-maps-leaflet-openstreetmap.md)); para la demo, mails a direcciones verificadas y login con usuario y contraseña |
| 3 | El equipo completa menos puntos de los planificados | 0,08 | Mitigar: medir la velocidad desde el Sprint 1 y replanificar | — |
| 6 | El desarrollo con IA genera un producto distinto al diseñado | 0,08 | Mitigar: la PO valida las specs antes de la planning; cada spec tiene al menos un caso de error y la revisa otro integrante | Implementar solo lo que dice la spec; ante una duda, preguntar en lugar de inventar |

## Costos

Plan de costos presentado el 23/09 (precio fijo, 4 meses):

| Concepto | USD |
| --- | --- |
| Equipo de trabajo (PM, arquitecto, analista, devs Sr/Ssr/Jr) | 41.120 |
| Infraestructura y licencias | 535 |
| Contingencia (10 %) | 4.165,5 |
| **Costo total** | **45.820,5** |
| Markup (20 %) | 9.164,1 |
| **Precio al cliente** | **54.984,6** |

La infraestructura presupuestada eran dos entornos (EC2 t3.small, RDS db.t3.micro y S3 + CloudFront en cada uno), dominio y tres licencias de Claude Pro. El hosting real se define en [docs/decisions/](../decisions/) y la planilla se actualiza en la revisión de costos de cada sprint. Desde el [ADR 0008](../decisions/0008-aws-free-plan-hosting.md) hay un solo entorno: base, API y web en Docker en una EC2 t4g.small detrás de CloudFront, por ≈ USD 5,4 por mes pagados con los créditos del Free plan.
