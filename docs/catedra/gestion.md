# Gestión del proyecto

Resumen de las teóricas y las plantillas de la cátedra sobre artefactos, costos, tiempos, calidad, indicadores y riesgos.

## Artefactos para el desarrollo de productos

| Artefacto | Para qué sirve | Cómo se completa |
| --- | --- | --- |
| **User Story Mapping** | Visualiza el recorrido del usuario y cómo interactúa con las funcionalidades; ayuda a definir el MVP de forma estructurada | Organizar las historias en un mapa que siga el flujo de interacción del usuario con el producto |
| **Product Backlog** | Lista priorizada de funcionalidades (una US describe una funcionalidad vista desde el usuario); asegura que el MVP se enfoque primero en lo esencial | Listar historias o tareas con prioridades |
| **Cronograma** | Calendario de actividades; organiza y programa el trabajo, anticipa retrasos y da una visión global | Identificar tareas, fechas de entrega, relaciones entre tareas y responsables |
| **WBS** | Descompone el trabajo en entregables más chicos y estimables; muestra el alcance completo | Gráfico o listado jerárquico, basado en entregables o en fases. Los elementos del nivel inferior son siempre entregables |

## El "triángulo de hierro"

Alcance, tiempo y costo: para mantener un objetivo de calidad, cambiar una de las tres variables obliga a cambiar alguna de las otras dos.

- **Duración**: tiempo calendario para completar una actividad (días o semanas laborables). Se asocia a calendarios.
- **Esfuerzo**: unidades de trabajo necesarias (horas-hombre). Se asocia a tamaño y costos.

## Costos

- Costo no es precio. Los ingresos tienen que cubrir los costos; conviene pensar el cashflow: no pedir recursos de más ni a destiempo, considerar los egresos cuando ocurren (sueldos, amortizaciones), saber cómo se financia el proyecto y no perder hitos (retrasar la facturación desfinancia el proyecto).
- La gestión de costos incluye trabajo, materiales, equipos (amortizaciones), servicios y mitigación de riesgos/contingencias. Se mide en dinero o en horas-hombre.
- **Directo**: existe porque existe el proyecto. **Indirecto**: se reparte entre varios proyectos. **Fijo**: no depende del nivel de actividad. **Variable**: crece o decrece con la actividad.

### Plantilla de costos de la cátedra

Dos variantes: **Time & Materials** (se factura por hora con una tarifa de venta por perfil) y **Precio fijo**.

- Perfiles: Project Manager, Solution Architect, Business Analyst y desarrolladores Sr / Ssr / Jr, con tarifa de costo por hora y horas por mes (hasta 6 meses).
- Infraestructura: set up de entornos y licenciamiento de herramientas, por mes.
- Contingencia (% sobre costos), markup (% sobre el costo total), revenue y profit/loss mensual y acumulado.
- Tarifas de venta por hora de referencia (T&M): PM 40, SA 30, BA 25, Sr 20, Ssr 17,5, Jr 15 (USD).

## Tiempos

- Actividades: estimar, secuenciar/priorizar, definir duraciones, armar el cronograma con sus hitos.
- Herramientas: diagrama de Gantt, PERT-CPM, diagrama de precedencias.
- **Compresión del cronograma** (acortar sin cambiar el alcance) siempre implica más costo y más riesgo:
  - *Crashing* (agregar horas o gente): no siempre funciona; suma coordinación y transferencia.
  - *Fast tracking* (paralelizar): riesgo de retrabajo por trabajar con información incompleta.
- Scrum entrega un incremento potencialmente desplegable por sprint; Lean/Kanban/DevOps optimizan un flujo continuo según la capacidad de trabajo.

## Calidad

> "Trying to improve software quality by increasing the amount of testing is like trying to lose weight by weighing yourself more often." — Steve McConnell

- La calidad es un atributo del producto: el grado en que satisface las necesidades del cliente (PMBOK), o "valor para alguna persona" (Weinberg).
- **Control de calidad (QC)**: probar el producto.
  - *Verificación*: revisiones de pares, pruebas unitarias, pruebas de componentes.
  - *Validación*: pruebas de comportamiento, UAT de punta a punta, validación en producción (A/B, canary, monitoreo).
- **Regresiones y fallas en producción**: repararlas y evidenciarlas con pruebas nuevas.
- **Aseguramiento de la calidad (QA)**: procesos que incorporan la calidad durante el desarrollo. **Prevenir es mejor que reparar**: las inspecciones y pruebas generan retrabajo y costo.
- **Costos de la calidad**: prevención (definición del proceso, capacitación, herramientas, tiempo para hacerlo bien), evaluación (pruebas e inspecciones), fallas internas (corregir antes de entregar) y fallas externas (quejas, garantías, problemas legales, pérdida de prestigio).
- **Prácticas ágiles de calidad**: integración continua, pruebas automatizadas, TDD, refactoring, pair programming, UAT, specification by example, entrega continua, automatización de ambientes, infraestructura como código, desarrollo en el tronco común.
- QC y QA son complementarios. "No les digan QA a los testers."

## Indicadores

- Sin datos es una opinión; sin opinión, solo datos.
- Precisión no es exactitud: elegir qué comunicar (un rango puede comunicar mejor que un número exacto).
- Problemas clásicos: **efecto Hawthorne** (medir cambia el comportamiento), **vanity metrics** (fáciles de medir y positivas, pero engañosas), **desmoralización** por metas inalcanzables, **sesgo de confirmación**, confundir correlación con causalidad y abusar de indicadores *proxy*.
- Un buen indicador es medible, independiente de la influencia humana (para cambiarlo hay que cambiar lo medido), trazable y repetible. Hay que balancear objetividad, costo de administración, foco en resultados y comprensión.
- Métricas de sprint que pide la cátedra: ver [sprint-review.md](sprint-review.md).

## Riesgos

### Categorías

| Categoría | Subcategorías (ejemplo) |
| --- | --- |
| Técnicos | Requisitos (specs poco precisas), tecnología (dependencia de avances poco probados), complejidad (interfaces), rendimiento y fiabilidad |
| Externos | Proveedores o subcontratistas, normativa, mercado, cliente, climatología |
| Organizativos | Dependencias de otros proyectos, recursos y priorización, financiación |
| Gestión del proyecto | Estimación, planificación, control, comunicación |

### Escalas de la clase

| Probabilidad | Significa |
| --- | --- |
| 20 % | Rara vez |
| 40 % | Es posible |
| 60 % | Se espera que ocurra |
| 80 % | Ocurre la mayoría de las veces |

| Impacto | Tiempo | Funcionalidad / calidad |
| --- | --- | --- |
| 0,05 | Insignificante | Casi no se nota |
| 0,1 | Desvío < 5 % | Poca funcionalidad afectada |
| 0,2 | Desvío 5–10 % | Varias áreas afectadas |
| 0,4 | Desvío 10–20 % | Inaceptable para el PO |
| 0,8 | Desvío > 20 % | El producto no sirve |

**Exposición = probabilidad × impacto.** Respuesta sugerida: < 0,10 aceptar · 0,10–0,25 mitigar o transferir (oportunidades: mejorar) · > 0,25 evitar o mitigar ya (oportunidades: explotar).

- Las escalas existen para medir el impacto de forma objetiva, sin depender de la aversión al riesgo de cada persona. Las define el PM junto con el cliente y el sponsor.
- Si un riesgo afecta varios objetivos, se evalúa el impacto general considerando cada objetivo.
- La tabla de respuesta es una guía: un riesgo en rojo no siempre se puede evitar.

### Registro de riesgos

Columnas: número, descripción, tipo (amenaza u oportunidad), causas, consecuencias, categoría, probabilidad, impacto, exposición, umbral, plan de respuesta, trigger, plan de contingencia, estado, responsable, fecha de actualización y observaciones.
