# Arquitectura

Cómo está armada la plataforma, cómo viaja una solicitud de punta a punta y cómo trabajamos en el repositorio con specs y agentes de IA. El detalle de la infraestructura está en [infra/README.md](../../infra/README.md) y el porqué de cada decisión, en [docs/decisions/](../decisions/).

| Diagrama | Responde |
| --- | --- |
| [1. Vista física](#1-vista-física) | Dónde corre cada parte y quién puede hablar con quién |
| [2. Recorrido de una solicitud](#2-recorrido-de-una-solicitud) | Qué pasa cuando un comensal abre la app y busca restaurantes |
| [3. Vista lógica](#3-vista-lógica) | Cómo se organiza el código y cómo se entienden el frontend y la API |
| [4. Del código a producción](#4-del-código-a-producción) | Cómo llega un cambio a la app |
| [5. Cómo trabajamos](#5-cómo-trabajamos-con-specs-y-agentes) | Quién hace cada paso de una US, del backlog a la demo |
| [6. Mapa del repositorio](#6-mapa-del-repositorio) | Dónde vive cada cosa |
| [7. Modelo de dominio](#7-modelo-de-dominio) | Las entidades del backlog y cómo se relacionan |

## 1. Vista física

![Vista física: CloudFront es la única entrada pública; sirve la app desde S3 y manda /api a una instancia EC2, que usa una base RDS privada. GitHub despliega con un rol OIDC.](01-vista-fisica.svg)

- Hay una sola puerta de entrada pública: CloudFront, con HTTPS en una dirección `*.cloudfront.net`. Sirve la app desde S3 y manda todo lo que empieza con `/api` a la instancia EC2.
- La instancia solo acepta tráfico de CloudFront y la base solo acepta conexiones de la instancia. No hay SSH: se entra con AWS Systems Manager.
- GitHub no guarda claves de AWS: en cada deploy pide un rol temporal (OIDC), sube el frontend y le pide a la instancia que se actualice.
- Costo estimado: RDS ≈ USD 14, EC2 con su IP fija ≈ USD 10,6 y el resto ≈ 0, por mes. Dos meses de desarrollo usan la mitad de los USD 100 de crédito inicial del Free plan.

## 2. Recorrido de una solicitud

![Recorrido de una solicitud: el navegador baja la app de S3 a través de CloudFront y después pide datos a /api, que CloudFront reenvía sin cache a la API y esta a PostgreSQL.](02-recorrido-solicitud.svg)

- Primero llega la app (HTML, JavaScript y estilos). Como no cambia entre usuarios, CloudFront la guarda cerca del comensal.
- Después la app pide datos a `/api/…`. Esas respuestas nunca se cachean: siempre reflejan lo último de la base.
- La API valida el pedido; si algo está mal responde 400 con el detalle en español, como piden las specs.

## 3. Vista lógica

![Vista lógica: el frontend en React habla con la API por HTTP con un cliente tipado generado del contrato OpenAPI; la API valida, aplica reglas y persiste en PostgreSQL.](03-vista-logica.svg)

- En el backend, una solicitud baja de arriba hacia abajo: router, validación, reglas, modelos y base. Las líneas azules son código generado.
- El contrato OpenAPI sale del backend y genera los tipos del frontend (`make api-types`). Si alguien cambia la API sin regenerarlo, CI falla.
- Las pantallas se arman con el [sistema de diseño](../design/README.md), no con estilos sueltos.
- Los cambios de la base solo se hacen con migraciones de Alembic, que se aplican solas en cada deploy.

## 4. Del código a producción

![Del código a producción: cada US va en una rama y un PR con CI y revisión; al mergear a main, GitHub Actions asume un rol temporal, actualiza la API por SSM y publica el frontend.](04-ci-cd.svg)

- CI corre lint, tests contra PostgreSQL real, chequeo de migraciones y del contrato, build del frontend y validación de Terraform.
- Cada PR declara cómo se usó la IA (herramienta, prompts, qué cambió el humano): es la evidencia que pide la cátedra en cada defensa.
- El deploy corre solo si el merge toca `backend/`, `frontend/` o `infra/ec2/`. GitHub Actions es gratis en repos públicos.

## 5. Cómo trabajamos con specs y agentes

![Flujo de Spec-Driven Development: el equipo y la PO definen y validan; el agente de IA escribe spec, plan, tareas y código con Spec Kit; todo vuelve al equipo por PR y revisión.](05-flujo-sdd.svg)

- Cada spec agrupa una a tres historias del backlog y tiene escenarios Dado / Cuando / Entonces. Cada escenario termina en un test automático.
- El plan pasa un chequeo contra la [constitución](../../.specify/memory/constitution.md): solo lo que pide el backlog, simple, barato y con tests.
- Funciona con cualquier agente del equipo (Claude Code, Codex, Copilot, Antigravity, Gemini): todos leen el mismo [AGENTS.md](../../AGENTS.md).

## 6. Mapa del repositorio

![Mapa del repositorio: producto y cátedra, instrucciones para agentes, código, e infraestructura y automatización.](06-mapa-repositorio.svg)

- `make up` levanta todo en local (base, API y web) con Docker; `make lint test` corre lo mismo que CI.
- La planilla de artefactos sigue siendo la fuente de verdad del backlog; `scripts/export_backlog.py` la copia al repo para que la lean los agentes.

## 7. Modelo de dominio

![Modelo de dominio conceptual: un comensal hace reservas en un restaurante; una reserva puede tener un pedido con platos y un pago; el restaurante define turnos, mesas, bloqueos, platos y promociones; las reseñas son sobre reservas realizadas.](07-modelo-dominio.svg)

- Es un modelo conceptual a partir de las historias del backlog. Las tablas reales se definen en el plan de cada spec, y en el código llevan nombres en inglés ([glosario](../../AGENTS.md#domain-glossary)).
- Una reserva asegura una mesa; el pedido anticipado es opcional y se coordina con la hora de llegada.
- Las restricciones alimenticias de los platos las declara el restaurante, y así se muestran (riesgo 5 del registro).

## Editar los diagramas

Los SVG salen de [diagrams.py](diagrams.py) (Python 3, sin dependencias). Para cambiar uno, editá las coordenadas o los textos ahí, corré `python3 docs/architecture/diagrams.py` desde la raíz y commiteá los SVG regenerados. Se ven bien en modo claro y oscuro.

Si cambia la arquitectura (un servicio nuevo, otra forma de desplegar), actualizá el diagrama en el mismo PR que el ADR.
