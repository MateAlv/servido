# Diseño

Guía visual de Servido! y catálogo de componentes. Con la app corriendo en modo desarrollo, el catálogo vivo está en **[/diseno](http://localhost:5173/diseno)**: cada componente con sus animaciones y botones para repetirlas.

[boceto-pagina-inicial.html](boceto-pagina-inicial.html) es el primer boceto de estilo: de ahí salen los colores, las tipografías y las formas, pero no es el diseño final.

## Identidad

- **Logo**: un pin de ubicación naranja que lleva una campana de plato (cloche), con tres rayitos. Lema: "Reservá. Pedí. Disfrutá." En el código es el componente `Logo` (no se usa el PNG, salvo el favicon).
- **Tipografías**: **Baloo 2** para títulos y números; **Nunito** para texto.
- **Colores**: terracota `#D2441C` sobre crema `#FDF9EE`, texto marrón `#3B1F18`. Modo claro y oscuro.
- **Estados**: verde (hay mesa, pagado), ámbar (quedan pocas, pendiente), rojo (completo, error). Siempre acompañados de una forma (● ▲ ■) para no depender solo del color.
- **Formas**: botones tipo píldora con hundido 3D, tarjetas con bordes de 22 a 28 px, detalles de ticket (muescas y línea punteada).
- **Mobile first**: todo tiene que funcionar a 360 px de ancho.

## Principios de movimiento

1. **Rápido y con rebote.** Las cosas aparecen con un pequeño rebote (`--ease-spring`) y nunca tardan más de medio segundo, salvo los momentos de marca.
2. **Celebrar lo que importa.** Las animaciones grandes son para los momentos clave del producto: bienvenida, agregar un plato, confirmar una reserva, pago aprobado. El resto de la interfaz se mueve poco.
3. **La marca cuenta la historia.** La campana se levanta cuando algo queda "servido", el pin cae y rebota como en un mapa, los cubiertos chocan al pedir.
4. **Movimiento reducido siempre.** Si la persona pide menos movimiento, todo llega directo a su estado final; lo que indica carga se reemplaza por un pulso suave.

## Tokens

Todos en `frontend/src/styles/tokens.css`. Nunca usar valores sueltos.

| Grupo | Tokens |
| --- | --- |
| Color | `--color-primary`, `--color-primary-dark`, `--color-accent`, `--color-ink`, `--color-cream`, `--color-text`, `--color-text-muted`, `--color-bg`, `--color-surface`, `--color-surface-sunken`, `--color-line`, `--color-inverse-*`, `--color-ok/warn/error` y sus `-bg` |
| Tipografía | `--font-display`, `--font-body`, `--text-xs` … `--text-2xl`, `--text-display` |
| Espaciado | `--space-1` (4 px) … `--space-8` (72 px) |
| Forma | `--radius-pill`, `--radius-card`, `--radius-field`, `--radius-small`, `--shadow-card`, `--shadow-pop`, `--shadow-press`, `--shadow-pin` |
| Movimiento | `--duration-fast` (150 ms), `--duration-base` (240 ms), `--duration-slow` (420 ms), `--duration-brand` (900 ms), `--ease-out`, `--ease-in`, `--ease-in-out`, `--ease-spring`, `--stagger` (60 ms) |

## Componentes

Viven en `frontend/src/components/`, agrupados por tema, y se importan desde el `index.ts` de cada carpeta.

### Marca (`brand/`)

| Componente | Para qué | Animación |
| --- | --- | --- |
| `Logo` | Logo en el encabezado y en pantallas de marca. Variantes `full` / `mark`, `inline` / `stacked`, con o sin lema | `intro`: el pin cae y rebota, la campana aparece, se dibujan los rayos y suben las letras. `outro`: la tapa se levanta ("¡servido!") y el pin se hunde. `idle`: rayos que titilan y tapa que espía. Hover: la tapa se levanta |
| `LogoSpinner` | Cargas de página o de secciones | `orbit`: un cometa gira alrededor del pin mientras la tapa espía. `hop`: el pin salta, ideal mientras se buscan restaurantes cerca |
| `BrandSplash` | Bienvenida, una vez por sesión | El logo aparece, espera hasta que la app esté lista, desaparece y la pantalla se levanta como una campana. Se saltea con un clic |
| `Highlight` | Resaltar una palabra en un título | Trazo de marcador que se dibuja solo |
| `SparkleBurst` | Celebraciones chicas | Estallido de destellos de la marca |
| `Sticker` | Etiquetas juguetonas ("Sin espera") | Se "pega" con un golpe |

### Interfaz (`ui/`)

| Componente | Para qué |
| --- | --- |
| `Button`, `IconButton` | Acciones. `Button` tiene variantes `primary` (hundido 3D), `secondary`, `ghost`, tamaños y estado `loading` |
| `TextField` | Campos de formulario con ayuda y error (el error tiembla y se anuncia) |
| `Chip` | Filtros de selección múltiple (precio, restricciones) |
| `SegmentedControl` | Una opción entre pocas, con indicador que se desliza |
| `Card` | Superficie base; `interactive` se eleva al pasar el mouse |
| `StatusPill` | Estado corto: disponibilidad, pago, reserva |
| `Skeleton`, `SkeletonText` | Placeholders con brillo mientras carga una lista |
| `Spinner` | Carga dentro de un botón o de un texto |
| `Modal` | Diálogos (en el celular se abre como hoja desde abajo) |
| `ToastProvider`, `useToast` | Avisos breves que se van solos |
| `ThemeToggle` | Cambio de tema claro / oscuro |
| `Reveal` | Animación de entrada al hacer scroll |
| `QuantityStepper`, `RollingNumber` | Cantidades y totales que ruedan al cambiar |
| `StarRating` | Calificación interactiva o de solo lectura |
| `icons` | Íconos de trazo redondeado (`IconCloche`, `IconCutlery`, `IconPin`, …) |

### Pedido (`order/`)

| Componente | Para qué | US |
| --- | --- | --- |
| `AddToOrderButton` | Agregar un plato: los cubiertos chocan, aparece un check y sube un "+1" | 17 |
| `OrderIndicator` | Botón del pedido en el encabezado: la tapa salta y el contador rebota al agregar | 17, 47 |
| `PrepTimer` | Anillo de tiempo de preparación que se completa y termina en "¡Listo!" | 19, 20, 40 |
| `Steam` | Vapor que sube: algo se está cocinando | 19, 20 |
| `LiveIndicator` | Píldora "En vivo" que late | 5, 20 |

### Reserva (`reservation/`)

| Componente | Para qué | US |
| --- | --- | --- |
| `Ticket`, `TicketDivider` | Resumen de una reserva con forma de ticket; se "imprime" al aparecer | 13, 23, 54 |
| `Timeline` | Recorrido de la reserva: reservaste → la cocina empieza → llegás. El paso en curso late | 19, 43 |
| `ConfirmationStamp` | Sello de confirmación con destellos | 13, 54, 56 |

### Restaurante (`restaurant/`)

| Componente | Para qué | US |
| --- | --- | --- |
| `MapPin` | Marcador del mapa: caen uno tras otro y el seleccionado late. Con Leaflet va dentro de un `divIcon` | 5 |
| `OccupancyMeter` | Concurrencia baja / media / alta, como barras de señal | 5, 33 |

## Reglas para animaciones nuevas

- **CSS, no librerías** ([ADR 0007](../decisions/0007-css-animations.md)): `@keyframes` en el CSS Module del componente, con los tokens de movimiento.
- **Movimiento reducido**: una regla global hace que toda animación llegue a su estado final al instante. Si algo necesita seguir comunicando (por ejemplo, una carga), definí una alternativa suave en un bloque `@media (prefers-reduced-motion: reduce)` con `!important`, como en `LogoSpinner`.
- **Entradas**: marcá con `data-entrance` los elementos que animan al aparecer, así esperan a que termine la bienvenida. Para animar al hacer scroll, envolvé en `Reveal`; sus hijos pueden usar `[data-visible]` para empezar sus propias animaciones.
- **Repetir**: para volver a reproducir una animación, cambiá la `key` del elemento.
- **Accesibilidad**: lo decorativo lleva `aria-hidden`; los cambios importantes se anuncian (por ejemplo, `AddToOrderButton` anuncia "Plato agregado al pedido").
- Agregá cada componente nuevo a la página `/diseno` y a esta guía.

## Oportunidades para más adelante

Animaciones que encajan con el backlog y todavía no están hechas:

- **Cancelar una reserva** (US-25, US-49): el ticket se rompe por la línea punteada.
- **Pago aprobado** (US-56): la tarjeta se da vuelta y aparece el sello.
- **Reseña publicada** (US-27, US-50): las estrellas vuelan hacia el promedio del restaurante.
- **Turno lleno** (US-30): la píldora de disponibilidad pasa a "Completo" con un pequeño temblor.
- **Pedidos del turno para la cocina** (US-20): las tarjetas se reordenan con una transición cuando cambia la hora sugerida.
