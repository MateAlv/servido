# Feature Specification: Recibir Detalle de Confirmación de Reserva

**Created**: 2026-11-18

**Input**: Backlog Servido\! — US-54 (Sprint 6, 1 SP)

**Rol**: Comensal

**Sprint**: 6

**Tests**: requeridos. Cada escenario de aceptación tiene al menos un test automatizado (constitución, principio III).

Esta spec completa el flujo de creación de reserva (spec 003, US-13) y la consulta de reservas activas (spec 011, US-23). Asegura que, al confirmar una reserva, el comensal reciba de inmediato una notificación con el comprobante completo (fecha, hora, restaurante y cantidad de personas) y que la reserva figure confirmada en su sección de reservas.

## User Scenarios & Testing *(mandatory)*

### US-54 — Recibir detalle de confirmación (Prioridad: \-, Estimación: 1\)

Como **Comensal**, quiero recibir una confirmación con el detalle de la reserva, para tener un comprobante de la misma.

**Valor**: Brinda certeza inmediata al comensal de que su mesa quedó reservada, entregándole un comprobante con todos los datos clave sin depender de recordar lo que seleccionó.

**Independent Test**: Con una cuenta de comensal verificada, completar y confirmar una nueva reserva; verificar que se emite la notificación de confirmación (correo electrónico y comprobante en pantalla) con restaurante, fecha, hora y cantidad de personas, y verificar que al abrir «Mis reservas» la reserva figura inmediatamente en estado confirmada con esos mismos datos.

**Acceptance Scenarios**:

1. **Dado** que completé los datos de una reserva disponible (restaurante, fecha, hora y cantidad de personas), **Cuando** confirmo la reserva, **Entonces** el sistema emite una notificación de confirmación que incluye el restaurante, la fecha, la hora y la cantidad de personas *(C1, C2)*.  
2. **Dado** que confirmé mi reserva, **Cuando** finaliza la operación, **Entonces** veo en pantalla el detalle completo de confirmación como comprobante (incluyendo restaurante, dirección, fecha, hora, cantidad de personas, mesa asignada y código/identificador de reserva) *(C2)*.  
3. **Dado** que confirmé mi reserva, **Cuando** accedo a la sección «Mis reservas» (US-23), **Entonces** la reserva figura inmediatamente en estado «Confirmada» en la lista de reservas activas con todos sus datos.  
4. **Dado** que la reserva no pudo confirmarse (por ejemplo, porque la última mesa disponible acaba de ocuparse), **Cuando** falla la confirmación, **Entonces** no se envía ninguna notificación de confirmación ni aparece la reserva como confirmada.

---

### Edge Cases

- **Medio de envío de la notificación** *(C1 — propuesta para la PO)*: dado que Servido\! es una aplicación web y ya dispone del servicio de correo (`mail.py` usado en verificación, recuperación y cancelaciones), la notificación de confirmación se envía por **correo electrónico** a la dirección de la cuenta del comensal, complementada por el comprobante inmediato en pantalla al finalizar la reserva.  
- **Datos mínimos y complementarios del comprobante** *(C2)*: el comprobante (tanto en el correo como en la vista de confirmación) incluye obligatoriamente nombre del restaurante, fecha (en horario local `America/Argentina/Buenos_Aires`), hora de inicio, cantidad de personas, y suma la dirección del restaurante, la mesa asignada (por capacidad/tipo, coherente con US-23) y el identificador de la reserva. El identificador se muestra como un código corto de 8 caracteres en mayúsculas (los primeros del identificador interno), el mismo en el correo y en pantalla, en lugar del identificador interno completo (24/11, prueba del equipo).  
- **Fallo transitorio en el envío del correo**: si la reserva se persistió correctamente en la base de datos pero el servicio de correo presenta un error transitorio, la reserva NO se revierte ni pierde su estado «Confirmada»; sigue visible en «Mis reservas» y en el comprobante en pantalla.  
- **Doble confirmación / reintento**: si la solicitud de confirmación llega dos veces (doble clic o reintento de red), se crea una única reserva y se envía una única notificación de confirmación.  
- **Privacidad**: cada comensal recibe únicamente notificaciones y comprobantes de sus propias reservas.  
- **Zona horaria**: la fecha y la hora informadas en la notificación y en el comprobante siempre corresponden a `America/Argentina/Buenos_Aires`.

## Decisiones propuestas para la PO

- **C1 — Canal de notificación**: envío de correo electrónico al email registrado del comensal mediante el servicio de mail existente del backend, acompañado de la pantalla de comprobante inmediato al confirmar.  
- **C2 — Contenido del comprobante**: restaurante (nombre y dirección), fecha, hora, cantidad de personas, mesa asignada (capacidad/tipo) e identificador único de la reserva.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** *(US-54; C1, C2)*: Al confirmarse una reserva, el sistema MUST enviar una notificación por correo electrónico al comensal con el detalle de la reserva: restaurante, fecha, hora y cantidad de personas.  
- **FR-002** *(US-54; C2)*: Al completarse la confirmación, el sistema MUST presentar al comensal el detalle de confirmación en pantalla a modo de comprobante con restaurante, dirección, fecha, hora, cantidad de personas, mesa asignada e identificador de reserva.  
- **FR-003** *(US-54; US-23)*: Toda reserva confirmada MUST quedar registrada en estado «Confirmada» y mostrarse inmediatamente en la sección de reservas activas del comensal.  
- **FR-004** *(US-54)*: Si la confirmación de la reserva es rechazada por conflicto de disponibilidad o validación, el sistema MUST NOT enviar notificación de confirmación ni crear una reserva confirmada.  
- **FR-005** *(US-54)*: Ante una solicitud duplicada de confirmación, el sistema MUST garantizar idempotencia generando una sola reserva y una sola notificación.

### Key Entities

- **Reserva** (sin cambios estructurales sobre spec 003/011): id, `comensal_id`, `restaurante_id`, `fecha_hora_inicio` (UTC), `cantidad_personas`, `mesa_capacidad` / tipo asignado, `estado` (`confirmed`).  
- **Notificación de confirmación**: correo enviado al email del comensal con los datos consolidados de la reserva en hora local de Buenos Aires.

## Límites de alcance *(MVP Boundaries)*

- **Dentro**: enviar correo de confirmación con fecha, hora, restaurante y cantidad de personas; mostrar el comprobante de confirmación al finalizar la reserva; reflejar la reserva confirmada en «Mis reservas».  
- **Fuera**: notificaciones push móviles nativas, envío por SMS o WhatsApp, descarga de archivos `.ics` de calendario, modificación de una reserva ya confirmada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% de las reservas confirmadas disparan el envío de la notificación de confirmación con restaurante, fecha, hora y cantidad de personas exactos.  
- **SC-002**: 100% de las reservas confirmadas figuran inmediatamente en estado «Confirmada» en la sección de reservas del comensal.  
- **SC-003**: 0 notificaciones de confirmación enviadas para reservas rechazadas o duplicadas por reintento.

## Assumptions

- El comensal tiene su cuenta verificada (spec 019, US-52) y realiza la reserva sobre un restaurante habilitado (spec 003, US-13).  
- El servicio de envío de correos (`backend/app/services/mail.py`) ya se encuentra operativo en el backend.  
- Fechas y horarios se muestran en `America/Argentina/Buenos_Aires`.