# Feature Specification: Leer Términos y Condiciones (Comensal)

**Created**: 2026-11-02

**Input**: Backlog Servido! — US-29 (Sprint 4, 1 SP). La versión para restaurantes es US-26 (spec aparte).

**Rol**: Comensal

## User Scenarios & Testing *(mandatory)*

### US-29 — Leer términos y condiciones (Prioridad: -, Estimación: 1)

Como **Comensal**, quiero poder consultar los términos y condiciones de Servido! durante el registro, para conocer las condiciones de uso antes de crear mi cuenta.

**Valor**: El comensal sabe a qué se compromete antes de crear su cuenta, y la plataforma tiene constancia de su aceptación.

**Independent Test**: Iniciar el registro de comensal, abrir los términos y condiciones, intentar finalizar sin aceptarlos y verificar que no se crea la cuenta; aceptarlos y verificar que se crea; repetirlo con el registro mediante Google.

**Acceptance Scenarios**:

1. **Dado** que estoy registrándome como comensal, **Cuando** elijo consultar los términos y condiciones, **Entonces** los veo de forma legible y accesible, sin salir del registro ni perder lo que completé.
2. **Dado** que completé mis datos, **Cuando** intento finalizar el registro sin aceptar los términos y condiciones, **Entonces** el sistema no me lo permite y me indica que debo aceptarlos.
3. **Dado** que completé mis datos, **Cuando** acepto los términos y condiciones y finalizo, **Entonces** la cuenta se crea.
4. **Dado** que me registro con mi cuenta de Google, **Cuando** llego al final del registro, **Entonces** también debo aceptar los términos y condiciones para que se cree la cuenta.
5. **Dado** que el formulario tiene un dato inválido, **Cuando** lo corrijo, **Entonces** no pierdo lo ya completado ni el estado de la aceptación.

---

### Edge Cases

- **Texto de los términos**: texto redactado por el equipo, con autorización de la PO. Se publica en la versión 1.0.
- **Registro por Google** *(propuesta del equipo; falta que la PO la valide)*: el registro con Google (US-58) también exige aceptar los términos. Ingresar con una cuenta ya creada (US-3 y US-52) no los vuelve a pedir.
- **Constancia de la aceptación** *(propuesta del equipo; falta que la PO la valide)*: el sistema guarda qué versión de los términos aceptó la cuenta y cuándo.
- **Cuentas ya creadas** *(propuesta del equipo; falta que la PO la valide)*: las cuentas de los Sprints 1 a 3 no tienen aceptación registrada. No se les exige aceptar retroactivamente en este MVP.
- **Aceptación por defecto**: la casilla de aceptación nunca viene marcada de antemano.
- **Lectura vs. aceptación**: abrir los términos no equivale a aceptarlos; la aceptación es una acción explícita aparte.
- **Si el registro falla** (por ejemplo, un mail ya registrado): no se guarda ninguna aceptación.
- **Texto largo**: el contenido se puede recorrer completo en pantallas chicas.
- **Verificación por mail** (US-51): sigue siendo un paso aparte; aceptar los términos no la reemplaza.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-29)*: El sistema MUST permitir al comensal consultar los términos y condiciones durante el registro, de forma legible y accesible, sin perder los datos ya completados.
- **FR-002** *(US-29)*: El sistema MUST exigir al comensal aceptar los términos y condiciones para completar la creación de la cuenta.
- **FR-003** *(US-29)*: Si el comensal no los acepta, el sistema MUST NOT permitir finalizar el registro.
- **FR-004** *(US-29; propuesta del equipo)*: El requisito de aceptación MUST aplicar también al registro mediante Google.
- **FR-005** *(US-29; propuesta del equipo)*: El sistema MUST guardar la versión de los términos aceptada y la fecha de aceptación al crear la cuenta.
- **FR-006** *(US-29)*: La casilla de aceptación MUST NOT venir marcada por defecto.

### Key Entities

- **Términos y condiciones (comensal)**: versión, texto.
- **Aceptación**: cuenta de comensal, versión aceptada, fecha.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: mostrar los términos durante el registro del comensal; exigir la aceptación para crear la cuenta; guardar la constancia.
- **Fuera**: términos para restaurantes (US-26), redactar el texto legal definitivo, pedir reaceptación cuando cambie la versión, aceptación retroactiva de cuentas existentes, editar los términos desde la plataforma.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las cuentas de comensal nuevas tienen una aceptación registrada (0 cuentas creadas sin aceptar).
- **SC-002**: 100% de los intentos de finalizar el registro sin aceptar son rechazados.
- **SC-003**: El 90% de los comensales puede abrir y volver de los términos sin perder los datos del formulario.

## Assumptions

- Los formularios de registro del comensal ya existen (US-1, US-58, Sprints 1 y 2).
- Idioma de la interfaz y mensajes: español (Argentina).
