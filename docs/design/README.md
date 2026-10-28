# Diseño

Guía visual de Servido! y catálogo de componentes. El catálogo vivo está en la ruta **/diseno** de la app (en local, [localhost:5173/diseno](http://localhost:5173/diseno); la ruta existe también en producción, aunque el enlace del pie solo aparece en modo desarrollo): cada componente con sus animaciones y botones para repetirlas.

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
| Color | `--color-primary`, `--color-primary-dark`, `--color-primary-soft`, `--color-on-primary`, `--color-accent`, `--color-ink`, `--color-cream`, `--color-location` (posición del comensal en el mapa), `--color-star` (estrellas de calificación), `--color-text`, `--color-text-muted`, `--color-bg`, `--color-surface`, `--color-surface-sunken`, `--color-line`, `--color-inverse-*`, `--color-ok/warn/error` y sus `-bg` |
| Tipografía | `--font-display`, `--font-body`, `--text-xs` … `--text-2xl`, `--text-display` |
| Espaciado | `--space-1` (4 px) … `--space-8` (72 px) |
| Forma | `--radius-pill`, `--radius-card`, `--radius-field`, `--radius-small`, `--shadow-card`, `--shadow-pop`, `--shadow-press`, `--shadow-pin` |
| Movimiento | `--duration-fast` (150 ms), `--duration-base` (240 ms), `--duration-slow` (420 ms), `--duration-brand` (900 ms), `--ease-out`, `--ease-in`, `--ease-in-out`, `--ease-spring`, `--stagger` (60 ms) |
| Capas | `--z-sticky` (encabezado fijo), `--z-overlay`, `--z-toast`, `--z-splash` |

## Componentes

Viven en `frontend/src/components/`, agrupados por tema, y se importan desde el `index.ts` de cada carpeta.

### Marca (`brand/`)

| Componente | Para qué | Animación |
| --- | --- | --- |
| `Logo` | Logo en el encabezado y en pantallas de marca. Variantes `full` / `mark`, `inline` / `stacked`, con o sin lema | `intro`: el pin cae y rebota, la campana aparece, se dibujan los rayos y suben las letras. `outro`: la tapa se levanta ("¡servido!") y el pin se hunde. `idle`: rayos que titilan y tapa que espía. Hover: la tapa se levanta |
| `LogoMark` | El pin con la campana en SVG, sin animación propia. Lo usan `Logo` y `LogoSpinner`, que animan sus partes con `classes`; `orbit` dibuja la órbita del spinner | — |
| `LogoSpinner` | Cargas de página o de secciones | `orbit`: un cometa gira alrededor del pin mientras la tapa espía. `hop`: el pin salta, ideal mientras se buscan restaurantes cerca |
| `BrandSplash` | Bienvenida, una vez por sesión | El logo aparece, espera hasta que la app esté lista, desaparece y la pantalla se levanta como una campana. Se saltea con un clic |
| `Highlight` | Resaltar una palabra en un título | Trazo de marcador que se dibuja solo |
| `SparkleBurst` | Celebraciones chicas | Estallido de destellos de la marca |
| `Sticker` | Etiquetas juguetonas ("Sin espera") | Se "pega" con un golpe |

### Interfaz (`ui/`)

| Componente | Para qué |
| --- | --- |
| `Button`, `IconButton` | Acciones. `Button` tiene variantes `primary` (hundido 3D), `secondary`, `ghost`, tamaños, estado `loading` y `to` para navegar con look de botón |
| `TextField` | Campos de formulario con ayuda y error (el error tiembla y se anuncia). `action` agrega un botón chico al final del campo |
| `PasswordField` | Contraseña oculta con un ojo para mostrarla u ocultarla (`aria-pressed`). Usalo en todo campo de contraseña |
| `Chip` | Opciones que se alternan: filtros de selección múltiple (precio, restricciones) y grupos donde se elige una sola (horarios, tipo de mesa) |
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

### Estructura (`layout/`)

| Componente | Para qué |
| --- | --- |
| `SiteHeader` | Barra superior de todas las páginas: logo, y "Ingresar" / "Crear cuenta" o quién está conectado y "Cerrar sesión". Queda fija al hacer scroll |
| `SiteFooter` | Pie de todas las páginas |

El inicio cambia según quién entra: visitante (presentación y una tarjeta por rol para crear cuenta o ingresar), comensal (elegir restaurante) o restaurante (su panel).

### Acceso (`access/`)

| Componente | Para qué | US |
| --- | --- | --- |
| `AccessForm` | Email y contraseña para ingresar con un tipo de cuenta (`role`: `diner` o `restaurant`). Muestra el error genérico de credenciales y ofrece "Registrarme". Lo usa `/ingresar`, con un `SegmentedControl` de `ACCOUNT_ROLE_OPTIONS` para elegir el tipo de cuenta | 3, 4 |
| `RedirectIfSignedIn` | Envuelve las páginas de ingreso y registro: con una sesión abierta, manda al inicio | 1, 2, 3, 4 |
| `GoogleButton` | El botón oficial de Google, que dibuja el script de Google con su propio estilo (las reglas de marca de Google no permiten rehacerlo) y devuelve la credencial. Lo usan los dos botones de abajo y `/suma-tu-local` | 52, 58, 28, 2 |
| `GoogleSignInButton` | "Iniciar sesión con Google" para el rol elegido: manda la credencial a la API, abre la sesión o muestra el error. Si el email no tiene cuenta de ese rol, ofrece crearla con esa misma cuenta de Google: al comensal ahí mismo, y al restaurante lo lleva a `/suma-tu-local` para completar sus datos. Va en `/ingresar` | 52, 58, 28 |
| `GoogleSignUpButton` | "Registrarse con Google": crea la cuenta del comensal ya verificada y abre la sesión; si Google no dio el nombre, lo pide. Va en `/registrarme` | 58 |

`registerPathFor(role)` devuelve adónde lleva "Registrarme" para cada tipo de cuenta (`/registrarme` o `/suma-tu-local`).

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

La revisión y la confirmación de la reserva (US-13, `pages/reservation/`) todavía no usan `Ticket` ni `ConfirmationStamp`: muestran los datos en una lista de dos columnas (`.summary`) que es estilo propio de la página `/reservar`, no un componente del catálogo. Si otra pantalla necesita ese resumen, se convierte en componente.

### Restaurante (`restaurant/`)

| Componente | Para qué | US |
| --- | --- | --- |
| `MapPin` | Marcador del mapa: el nombre del restaurante y la forma de su concurrencia (● baja, ▲ media, ■ alta; un restaurante real sin datos de concurrencia muestra solo su nombre). Caen uno tras otro y el seleccionado late. Con Leaflet va dentro de un `divIcon` con `interactive={false}`, porque el marcador ya es el botón | 5 |
| `PinGlyph` | Solo la forma de concurrencia de un marcador (● ▲ ■); la usan `MapPin` y `OccupancyLegend` | 5 |
| `OccupancyLegend` | Leyenda de las formas y colores de concurrencia; en el mapa flota abajo a la izquierda. | 5 |
| `RestaurantMap` | Mapa Leaflet + OpenStreetMap con la posición del comensal, los marcadores y el popup de cada restaurante: una tarjeta con foto, precio, calificación, concurrencia, barrio, dirección, distancia y el botón al detalle | 5 |
| `OccupancyMeter` | Concurrencia baja / media / alta, como barras de señal. Si un restaurante no tiene datos de concurrencia, no se muestra (no decimos «sin datos») | 5, 33 |
| `PriceFilter` | Chips de precio (`$` … `$$$$`) y "Quitar filtro de precio"; avisa cuando no hay coincidencias | 7 |
| `RestaurantExplorer` | Elegir restaurante: filtro de precio, mapa con leyenda y la misma lista en tarjetas con su concurrencia, que se actualiza sola. El filtro vive en la URL (`?precio=$$`), así que se conserva al ir al detalle y volver. Lo usan el inicio del comensal y `/mapa`. Muestra los restaurantes reales de `GET /api/restaurants` (sin concurrencia ni calificación todavía) junto con los de prueba de `frontend/src/data/restaurants.fixture.ts`; solo los reales se pueden reservar (spec 005, D4) | 5, 7, 9, 33 |

#### Restaurantes reales con datos incompletos

Los restaurantes reales (spec 005, D4) pueden no tener todavía foto, tipo de cocina, barrio, dirección, menú, opiniones ni datos de concurrencia. Lo que falta no se muestra: no hay indicador de concurrencia, ni tarjetas vacías, ni separadores sueltos («·», «,»), y nunca un «sin datos» o «sin cargar». Solo se ve lo que el restaurante cargó.

#### Filtro de precio (US-7)

`PriceFilter` compone `Chip` y `Button`.
Recibe `selectedTiers` (arreglo de `PriceTier`: `$`, `$$`, `$$$`, `$$$$`),
`onChange` (nueva selección completa) y `resultCount` opcional. Quien lo usa conserva
el estado: cada interacción notifica el cambio inmediatamente; quitar el filtro
emite un arreglo vacío y no modifica otros criterios.

`matchesPriceFilter(tier, hasMenu, selectedTiers)` permite filtrar los datos con
`Array.filter`, conservando el orden y sin modificar el arreglo original. Sin
selección se incluyen todos; con selección se excluyen restaurantes sin menú o sin
categoría conocida. `RestaurantExplorer` lo aplica a los marcadores y a la lista por
igual, con el `priceTier` y el menú de cada restaurante del fixture.

Pasá `resultCount` solo después de una consulta exitosa: cero muestra el mensaje
sin resultados, con la acción de quitar precio habilitada si hay selección.
`RestaurantExplorer` administra la carga, los errores, los marcadores y la
selección en la URL.

`priceTierFromAverageSpend(averageSpendPerPerson)` convierte un gasto promedio
por persona en pesos argentinos en `PriceTier`:
`$` si es menor a $15.000, `$$` desde $15.000 hasta menos de $25.000,
`$$$` desde $25.000 hasta $40.000 inclusive y `$$$$` si supera $40.000.
Son límites provisionales del equipo. Los promedios están mockeados en el fixture:
todavía no se calculan desde reseñas; eso queda para cuando existan al menos cinco
reseñas con precio por persona.

En `/diseno#filtro-precio` hay una demostración aislada, con cuatro restaurantes
ficticios (uno sin menú): seleccioná `$$$$` para ver cero coincidencias y «Quitar
filtro de precio» para recuperar los cuatro ejemplos.

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
