# Feature Specification: Confirmación de Términos y Condiciones (Restaurante)

**Created**: 2026-11-02

**Input**: Backlog Servido! — US-26 (Sprint 4, 1 SP). La versión para comensales es US-29 (spec aparte).

**Rol**: Restaurante

## User Scenarios & Testing *(mandatory)*

### US-26 — Confirmación de términos y condiciones (Prioridad: -, Estimación: 1)

Como **Responsable del restaurante**, quiero consultar y aceptar los términos y condiciones de adhesión a Servido!, para conocer las condiciones de uso de la plataforma antes de registrar mi restaurante.

**Valor**: El restaurante acepta de forma explícita las condiciones comerciales de la plataforma antes de operar, y la plataforma tiene constancia de ello.

**Independent Test**: Iniciar el registro de restaurante, leer los términos y condiciones de adhesión, intentar finalizar sin aceptarlos y verificar que no se completa; aceptarlos y verificar que el registro finaliza; repetirlo con el registro mediante Google.

**Acceptance Scenarios**:

1. **Dado** que estoy registrando mi restaurante, **Cuando** llego al paso de términos y condiciones, **Entonces** veo los términos de adhesión para restaurantes de forma legible y accesible.
2. **Dado** que no acepté los términos y condiciones, **Cuando** intento finalizar el registro, **Entonces** el sistema no me lo permite y me indica que debo aceptarlos.
3. **Dado** que acepté los términos y condiciones, **Cuando** finalizo el registro, **Entonces** la cuenta del restaurante se crea.
4. **Dado** que me registro con mi cuenta de Google, **Cuando** llego al final del registro, **Entonces** también debo aceptar los términos y condiciones.
5. **Dado** que el formulario tiene un dato inválido, **Cuando** lo corrijo, **Entonces** no pierdo lo ya completado ni el estado de la aceptación.

---

### Edge Cases

- **Texto de los términos**: texto redactado por el equipo, con autorización de la PO. Se publica en la versión 1.0.
- **Registro por Google** *(propuesta del equipo; falta que la PO la valide)*: el registro con Google (criterio de US-2) también exige aceptar los términos. Ingresar con una cuenta ya creada (US-4 y US-28) no los vuelve a pedir.
- **Constancia de la aceptación** *(propuesta del equipo; falta que la PO la valide)*: el sistema guarda qué versión de los términos aceptó el restaurante y cuándo.
- **Cuentas ya creadas** *(propuesta del equipo; falta que la PO la valide)*: los restaurantes registrados en los Sprints 1 a 3 no tienen aceptación registrada. No se les exige aceptar retroactivamente en este MVP.
- **Aceptación por defecto**: la casilla de aceptación nunca viene marcada de antemano.
- **Lectura vs. aceptación**: leer los términos no equivale a aceptarlos; la aceptación es una acción explícita aparte.
- **Si el registro falla** (por ejemplo, un correo o CUIT ya registrado): no se guarda ninguna aceptación.
- **Validación con mail** (US-44, Sprint 5): sigue siendo un paso aparte; aceptar los términos no la reemplaza.
- **Texto largo**: el contenido se puede recorrer completo en pantallas chicas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-26)*: El sistema MUST mostrar al responsable del restaurante los términos y condiciones de adhesión, de forma legible y accesible, durante el registro.
- **FR-002** *(US-26)*: El sistema MUST exigir aceptar los términos y condiciones para completar la creación de la cuenta del restaurante.
- **FR-003** *(US-26)*: Si el responsable no los acepta, el sistema MUST NOT permitir finalizar el registro.
- **FR-004** *(US-26; propuesta del equipo)*: El requisito de aceptación MUST aplicar también al registro mediante Google.
- **FR-005** *(US-26; propuesta del equipo)*: El sistema MUST guardar la versión de los términos aceptada y la fecha de aceptación al crear la cuenta.
- **FR-006** *(US-26)*: La casilla de aceptación MUST NOT venir marcada por defecto.

### Key Entities

- **Términos y condiciones (restaurante)**: versión, texto de adhesión.
- **Aceptación**: cuenta de restaurante, versión aceptada, fecha.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: mostrar los términos de adhesión durante el registro del restaurante; exigir la aceptación para crear la cuenta; guardar la constancia.
- **Fuera**: términos para comensales (US-29), redactar el texto legal definitivo, pedir reaceptación cuando cambie la versión, aceptación retroactiva de cuentas existentes, editar los términos desde la plataforma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las cuentas de restaurante nuevas tienen una aceptación registrada (0 cuentas creadas sin aceptar).
- **SC-002**: 100% de los intentos de finalizar el registro sin aceptar son rechazados.
- **SC-003**: El 90% de los responsables puede leer los términos y volver al formulario sin perder los datos.

## Assumptions

- El formulario de registro del restaurante ya existe (US-2, Sprint 1).
- Idioma de la interfaz y mensajes: español (Argentina).
