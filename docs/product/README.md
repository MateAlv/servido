# Servido! — Producto

> **Reservá. Pedí. Disfrutá.**

Resumen de la planilla de artefactos del equipo (Lean Inception), que es la fuente de verdad. Snapshot del 2026-10-18.

| Documento | Contenido |
| --- | --- |
| [backlog.md](backlog.md) | Las 61 historias con criterios de aceptación, estimación, sprint y spec (generado desde la planilla) |
| [user-story-map.md](user-story-map.md) | User Story Map de los dos roles |
| [plan.md](plan.md) | Equipo, sprints, ceremonias, riesgos y costos |

## Visión

**Para** personas que concurren a restaurantes y buscan aprovechar mejor su tiempo, **quienes** necesitan reducir los tiempos de espera asociados a la reserva, el pedido y la preparación de la comida, **Servido!** **es una** plataforma de reservas y pedidos anticipados para restaurantes **que** permite reservar una mesa y seleccionar la comida con anticipación, coordinando su preparación con el horario de llegada.

**A diferencia de** las plataformas tradicionales de reserva, enfocadas principalmente en la disponibilidad y reserva de mesas (como Sitme), **nuestro producto** integra la reserva con el pedido anticipado y la estimación de tiempos de preparación. Así reduce la espera del comensal y facilita la planificación del restaurante, dejando que el cliente decida según disponibilidad, precios y reviews.

## Es / No es / Hace / No hace

| Es | No es |
| --- | --- |
| Una plataforma de reservas para restaurantes | Una aplicación de delivery |
| Una plataforma de pedidos anticipados | Un sistema de gestión integral del restaurante |
| Una herramienta de coordinación entre comensales y restaurantes | Una red social gastronómica |
| Una plataforma orientada a reducir tiempos de espera | Un sistema de cocina o de gestión de inventario |
| Un medio para consultar la oferta gastronómica de los restaurantes adheridos | Un marketplace de productos alimenticios |

| Hace | No hace |
| --- | --- |
| Permite consultar restaurantes y su disponibilidad | No realiza entregas a domicilio |
| Permite reservar una mesa para una fecha y horario | No administra el inventario del restaurante |
| Permite consultar el menú disponible, considerando restricciones alimenticias | No gestiona compras ni proveedores del restaurante |
| Permite seleccionar del menú y dejar listo el pedido antes de llegar | No reemplaza el sistema interno de gestión del restaurante |
| Considera los tiempos estimados de preparación para coordinar el pedido con la llegada | No garantiza un tiempo exacto de preparación |
| Permite gestionar o cancelar una reserva y su pedido según las políticas establecidas | No gestiona reservas de establecimientos no adheridos a la plataforma |
| Permite pagar el pedido de forma electrónica al momento de pedir | |
| Permite ver reviews de otros comensales para cada restaurante | |
| Permite solo reservar, sin necesidad de hacer un pedido | |

## Roles

- **Comensal**: busca restaurantes, reserva, arma su pedido anticipado, paga y califica la experiencia.
- **Restaurante**: lo opera el *responsable del restaurante*; una cuenta equivale a un restaurante (relación 1 a 1). Configura local, turnos, mesas y menú, y gestiona reservas, pedidos, pagos y reseñas.

## Personas

| Persona | Perfil | Comportamiento | Necesidades |
| --- | --- | --- | --- |
| **Martín, 29** — comensal con tiempo limitado | Trabaja presencial lejos de su casa y almuerza afuera los días laborales con poco tiempo | Busca restaurantes cerca del trabajo que le permitan comer en el tiempo disponible; consulta menús y precios y organiza todo desde el celular | Encontrar restaurante, ver menú y disponibilidad, reservar y pedir antes de salir del trabajo para no esperar al llegar |
| **Laura, 41** — responsable del restaurante | Administra un restaurante y organiza reservas y atención | Organiza mesas y turnos, recibe reservas y coordina pedidos con la capacidad y los tiempos de cocina | Administrar mesas, conocer reservas y pedidos por adelantado, organizar turnos y la preparación sin sobrecargar la cocina |
| **Tomás, 22** — estudiante con tiempo limitado | Cursa todo el día y almuerza afuera por la poca oferta del buffet | Filtra por precio y tiempo de espera corto; busca platos abundantes | Restaurantes económicos, con precio actualizado y tiempo de demora conocido |
| **Jazmín, 25** — comensal vegetariana | Ocupada en la semana, sale a cenar los fines de semana | Filtra por opciones vegetarianas y reserva con días de anticipación | Buscar comidas vegetarianas y reservar con tiempo para no quedarse sin mesa |
| **Agustín, 8** — comensal celíaco | Sus padres analizan de antemano dónde puede comer | Usan el filtro por restricciones alimenticias | Restaurantes con platos sin TACC y sin contaminación cruzada |

## Features y valor por persona

Valor percibido de 1 a 5.

| Feature | Martín | Laura | Tomás | Jazmín | Agustín |
| --- | --- | --- | --- | --- | --- |
| Reserva de mesa | 5 | 5 | 4 | 5 | 5 |
| Pedido anticipado | 5 | 5 | 4 | 4 | 3 |
| Consulta de menú | 5 | 4 | 5 | 5 | 5 |
| Filtrado de restaurantes | 4 | 1 | 4 | 5 | 5 |
| Coordinación con tiempos de cocina | 5 | 5 | 5 | 5 | 4 |
| Gestión de turnos | 3 | 5 | 3 | 3 | 3 |
| Cancelación de reserva | 3 | 4 | 3 | 3 | 3 |
| Pago del pedido | 5 | 5 | 5 | 4 | 4 |
| Gestión de reviews | 4 | 1 | 4 | 5 | 5 |

## Glosario

| Término | Significado |
| --- | --- |
| Reserva | Comprobante que asegura un lugar físico disponible en una mesa del restaurante. No necesariamente tiene pedido |
| Pedido | Conjunto de platos que ordena el comensal (para él y sus acompañantes) para una reserva dada |
| Responsable del restaurante | Equivale al restaurante (relación 1 a 1) |
| Turno | Cada franja del día en la que el restaurante abre y cierra (por ejemplo, de 10 a 15 y de 19 a 01) |

Los nombres en inglés que se usan en el código están en [AGENTS.md](../../AGENTS.md#domain-glossary).
