import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import {
  BrandSplash,
  Highlight,
  Logo,
  LogoSpinner,
  SparkleBurst,
  Sticker,
  type LogoAnimation,
} from '../components/brand'
import {
  AddToOrderButton,
  LiveIndicator,
  OrderIndicator,
  PrepTimer,
  Steam,
} from '../components/order'
import { ConfirmationStamp, Ticket, TicketDivider, Timeline } from '../components/reservation'
import { MapPin, OccupancyMeter, type OccupancyLevel } from '../components/restaurant'
import {
  Button,
  Card,
  Chip,
  IconArrowRight,
  IconButton,
  IconClose,
  IconPlus,
  IconSearch,
  Modal,
  QuantityStepper,
  RollingNumber,
  SegmentedControl,
  Skeleton,
  SkeletonText,
  StarRating,
  StatusPill,
  TextField,
  ThemeToggle,
  useToast,
} from '../components/ui'
import { cx } from '../lib/cx'
import styles from './DesignSystemPage.module.css'

const SECTIONS = [
  ['marca', 'Marca'],
  ['fundamentos', 'Fundamentos'],
  ['acciones', 'Acciones'],
  ['formularios', 'Formularios'],
  ['estados', 'Estados y carga'],
  ['pedido', 'Pedido'],
  ['reserva', 'Reserva'],
  ['mapa', 'Mapa'],
  ['feedback', 'Feedback'],
] as const

const COLORS = [
  ['Primario', '--color-primary'],
  ['Primario oscuro', '--color-primary-dark'],
  ['Acento', '--color-accent'],
  ['Tinta', '--color-ink'],
  ['Crema', '--color-cream'],
  ['Fondo', '--color-bg'],
  ['Superficie', '--color-surface'],
  ['Línea', '--color-line'],
  ['OK', '--color-ok'],
  ['Atención', '--color-warn'],
  ['Error', '--color-error'],
] as const

const DIETS = ['Sin TACC', 'Vegetariano', 'Vegano', 'Sin lactosa'] as const

const PRICE = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
})

const DISH_PRICE = 12500

function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string
  title: string
  lead: string
  children: ReactNode
}) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={styles.sectionTitle}>
        {title}
      </h2>
      <p className={styles.sectionLead}>{lead}</p>
      <div className={styles.grid}>{children}</div>
    </section>
  )
}

function Demo({
  title,
  note,
  wide = false,
  children,
}: {
  title: string
  note?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  return (
    <Card className={cx(styles.demo, wide && styles.wide)}>
      <h3 className={styles.demoTitle}>{title}</h3>
      {children}
      {note && <p className={styles.note}>{note}</p>}
    </Card>
  )
}

function LogoDemo() {
  const [logo, setLogo] = useState<{ animation: LogoAnimation; run: number }>({
    animation: 'intro',
    run: 0,
  })
  const play = (animation: LogoAnimation) =>
    setLogo((current) => ({ animation, run: current.run + 1 }))

  return (
    <Demo
      title="Logo animado"
      wide
      note={
        <>
          <code>{'<Logo animation="intro" />'}</code> aparece, <code>outro</code> desaparece (queda
          oculto) e <code>idle</code> lo mantiene vivo. Cambiá su <code>key</code> para repetir. Al
          pasar el mouse, la campana se levanta.
        </>
      }
    >
      <div className={styles.stage}>
        <Logo key={logo.run} layout="stacked" size="lg" tagline animation={logo.animation} />
      </div>
      <div className={styles.row}>
        <Button size="sm" onClick={() => play('intro')}>
          Aparecer
        </Button>
        <Button size="sm" variant="secondary" onClick={() => play('outro')}>
          Desaparecer
        </Button>
        <Button size="sm" variant="ghost" onClick={() => play('idle')}>
          En reposo
        </Button>
      </div>
    </Demo>
  )
}

function SplashDemo() {
  const [splash, setSplash] = useState<'off' | 'loading' | 'ready'>('off')

  function start() {
    setSplash('loading')
    window.setTimeout(
      () => setSplash((current) => (current === 'loading' ? 'ready' : current)),
      2200,
    )
  }

  return (
    <Demo
      title="Pantalla de bienvenida"
      note={
        <>
          <code>{'<BrandSplash ready={...} />'}</code>: el logo aparece, espera vivo hasta que{' '}
          <code>ready</code> sea verdadero, desaparece y la pantalla se levanta como una campana. Se
          muestra una vez por sesión y se puede saltear con un clic.
        </>
      }
    >
      <Button onClick={start} disabled={splash !== 'off'} icon={<IconArrowRight />}>
        Ver bienvenida
      </Button>
      {splash !== 'off' && (
        <BrandSplash ready={splash === 'ready'} onDone={() => setSplash('off')} />
      )}
    </Demo>
  )
}

function CelebrationDemo() {
  const [bursts, setBursts] = useState(0)
  return (
    <Demo
      title="Destellos y stickers"
      note="Para celebrar momentos chicos: una reserva confirmada, un pago aprobado, una reseña publicada."
    >
      <div className={styles.stage}>
        <SparkleBurst trigger={bursts}>
          <Sticker key={bursts} tilt={-6}>
            Sin espera
          </Sticker>
        </SparkleBurst>
      </div>
      <Button size="sm" onClick={() => setBursts((n) => n + 1)}>
        Celebrar
      </Button>
    </Demo>
  )
}

function FormsDemo() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [diets, setDiets] = useState<string[]>(['Sin TACC'])
  const [role, setRole] = useState<'diner' | 'restaurant'>('diner')
  const [stars, setStars] = useState(0)

  function validate() {
    setError(
      /\S+@\S+\.\S+/.test(email)
        ? undefined
        : 'Ingresá un email válido, por ejemplo nombre@mail.com.',
    )
  }

  function toggleDiet(diet: string) {
    setDiets((current) =>
      current.includes(diet) ? current.filter((item) => item !== diet) : [...current, diet],
    )
  }

  return (
    <>
      <Demo title="Campo de texto" note="El error se anuncia y tiembla cada vez que cambia.">
        <TextField
          label="Email"
          type="email"
          placeholder="nombre@mail.com"
          hint="Lo usás para ingresar."
          value={email}
          error={error}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button size="sm" variant="secondary" onClick={validate}>
          Validar
        </Button>
      </Demo>
      <Demo title="Chips de filtro" note="Selección múltiple con aria-pressed.">
        <div className={styles.row}>
          {DIETS.map((diet) => (
            <Chip key={diet} selected={diets.includes(diet)} onClick={() => toggleDiet(diet)}>
              {diet}
            </Chip>
          ))}
        </div>
      </Demo>
      <Demo title="Control segmentado" note="Una opción entre pocas; se maneja con flechas.">
        <SegmentedControl
          label="Tipo de cuenta"
          options={[
            { value: 'diner', label: 'Soy comensal' },
            { value: 'restaurant', label: 'Soy restaurante' },
          ]}
          value={role}
          onChange={setRole}
        />
      </Demo>
      <Demo
        title="Calificación"
        note="Interactiva para dejar una reseña; de solo lectura para promedios."
      >
        <StarRating value={stars} onChange={setStars} label="Tu calificación" />
        <StarRating value={4.6} size={18} />
      </Demo>
    </>
  )
}

function StatesDemo() {
  const [level, setLevel] = useState<OccupancyLevel>('low')
  return (
    <>
      <Demo
        title="Estados"
        note="Cada tono tiene además una forma (● ▲ ■) para no depender solo del color."
      >
        <div className={styles.row}>
          <StatusPill tone="ok">Hay mesa</StatusPill>
          <StatusPill tone="warn">Quedan pocas</StatusPill>
          <StatusPill tone="error">Completo</StatusPill>
          <StatusPill tone="neutral">Cancelada</StatusPill>
        </div>
        <div className={styles.row}>
          <LiveIndicator />
          <LiveIndicator tone="primary">Pedidos en vivo</LiveIndicator>
        </div>
      </Demo>
      <Demo title="Concurrencia" note="Indicador de la US-5: baja, media o alta.">
        <OccupancyMeter key={level} level={level} />
        <SegmentedControl
          label="Nivel de concurrencia"
          options={[
            { value: 'low', label: 'Baja' },
            { value: 'medium', label: 'Media' },
            { value: 'high', label: 'Alta' },
          ]}
          value={level}
          onChange={setLevel}
        />
      </Demo>
      <Demo
        title="Cargando"
        note="Pin que orbita para cargas generales; pin que salta mientras se buscan lugares."
      >
        <div className={styles.row}>
          <LogoSpinner kind="orbit" showLabel />
          <LogoSpinner kind="hop" showLabel label="Buscando cerca tuyo…" />
        </div>
      </Demo>
      <Demo
        title="Esqueleto"
        note="Mientras llega una lista; decorativo, el estado se anuncia aparte."
      >
        <div className={styles.row}>
          <Skeleton width={72} height={72} radius={16} />
          <div style={{ flex: 1 }}>
            <SkeletonText lines={3} />
          </div>
        </div>
      </Demo>
    </>
  )
}

function OrderDemo() {
  const [count, setCount] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [remaining, setRemaining] = useState(18)

  return (
    <>
      <Demo
        title="Agregar al pedido"
        note="Los cubiertos chocan, aparece el check y sube un +1. La campana del encabezado levanta la tapa."
      >
        <div className={styles.row}>
          <AddToOrderButton onAdd={() => setCount((n) => n + 1)} />
          <OrderIndicator count={count} />
        </div>
      </Demo>
      <Demo
        title="Cantidad y total"
        note="Los números ruedan hacia arriba o hacia abajo al cambiar."
      >
        <QuantityStepper
          label="Cantidad de Bife de chorizo"
          value={quantity}
          onChange={setQuantity}
          min={1}
        />
        <span className={styles.total}>
          Total: <RollingNumber value={quantity * DISH_PRICE} format={(n) => PRICE.format(n)} />
        </span>
      </Demo>
      <Demo
        title="Tiempo de preparación"
        note="Anillo que se completa mientras la cocina prepara (US-19)."
      >
        <div className={styles.row}>
          <PrepTimer totalMinutes={28} remainingMinutes={remaining} />
          <Steam size={40} />
        </div>
        <input
          className={styles.range}
          type="range"
          min={0}
          max={28}
          value={remaining}
          aria-label="Minutos restantes"
          onChange={(event) => setRemaining(Number(event.target.value))}
        />
      </Demo>
    </>
  )
}

function ReservationDemo() {
  const [stamps, setStamps] = useState(0)
  return (
    <>
      <Demo title="Ticket de reserva" note="Se imprime al aparecer; el paso en curso late.">
        <div className={styles.stage}>
          <Ticket tilt={-2} sticker={<Sticker>Sin espera</Sticker>}>
            <strong>La Esquina de Palermo</strong>
            <p className={styles.note}>Vie 24 · 21:00 h · 2 personas</p>
            <TicketDivider />
            <Timeline
              steps={[
                { time: '20:10', title: 'Reservaste', state: 'done' },
                { time: '20:32', title: 'Empieza la cocina', state: 'current' },
                { time: '21:00', title: 'Llegás', state: 'upcoming' },
              ]}
            />
          </Ticket>
        </div>
      </Demo>
      <Demo
        title="Confirmación"
        note="Sello para reserva confirmada (US-13) o pago aprobado (US-56)."
      >
        <div className={styles.stage}>
          <ConfirmationStamp replayKey={stamps} detail="Vie 24 · 21:00 h" />
        </div>
        <Button size="sm" variant="secondary" onClick={() => setStamps((n) => n + 1)}>
          Sellar de nuevo
        </Button>
      </Demo>
    </>
  )
}

function MapDemo() {
  const [selected, setSelected] = useState('Verde Que Te Quiero')
  const [run, setRun] = useState(0)
  const pins = [
    { name: 'La Esquina de Palermo', label: '6 mesas', status: 'available' as const },
    { name: 'Bodegón Estudiantil', label: '2 mesas', status: 'few' as const },
    { name: 'Verde Que Te Quiero', label: '9 mesas', status: 'available' as const },
    { name: 'Terraza del Río', label: 'Completo', status: 'full' as const },
  ]
  return (
    <Demo
      title="Marcadores"
      wide
      note="Caen uno detrás de otro; el seleccionado se invierte y late en el piso. Con Leaflet van dentro de un divIcon."
    >
      <div key={run} className={styles.map}>
        {pins.map((pin, i) => (
          <MapPin
            key={pin.name}
            {...pin}
            index={i}
            selected={selected === pin.name}
            onClick={() => setSelected(pin.name)}
          />
        ))}
      </div>
      <Button size="sm" variant="secondary" onClick={() => setRun((n) => n + 1)}>
        Soltar de nuevo
      </Button>
    </Demo>
  )
}

function FeedbackDemo() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <Demo title="Avisos" note="useToast(): mensajes breves que se van solos.">
        <div className={styles.row}>
          <Button size="sm" variant="secondary" onClick={() => toast('Guardamos tus cambios.')}>
            Neutro
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast('¡Reserva confirmada!', { tone: 'ok' })}
          >
            Éxito
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => toast('No pudimos conectar. Probá de nuevo.', { tone: 'error' })}
          >
            Error
          </Button>
        </div>
      </Demo>
      <Demo title="Modal" note="Diálogo nativo; en el celular se abre como hoja desde abajo.">
        <Button size="sm" onClick={() => setOpen(true)}>
          Abrir modal
        </Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Cancelar reserva"
          footer={
            <>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Volver
              </Button>
              <Button onClick={() => setOpen(false)}>Sí, cancelar</Button>
            </>
          }
        >
          <p>Podés cancelar sin costo hasta 30 minutos antes de tu reserva.</p>
        </Modal>
      </Demo>
    </>
  )
}

/** Living catalog of the design system: every component with its animations, in context. */
export function DesignSystemPage() {
  const [loading, setLoading] = useState(false)

  function fakeSave() {
    setLoading(true)
    window.setTimeout(() => setLoading(false), 1600)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" aria-label="Volver al inicio">
          <Logo size="sm" />
        </Link>
        <nav aria-label="Herramientas">
          <ThemeToggle />
        </nav>
      </header>

      <div className={styles.intro}>
        <h1>
          Sistema de <Highlight>diseño</Highlight>
        </h1>
        <p>
          Los componentes y animaciones de Servido!, listos para armar pantallas. Usalos en lugar de
          estilos sueltos; la guía está en <code>docs/design/README.md</code>.
        </p>
        <nav className={styles.toc} aria-label="Secciones">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
      </div>

      <Section
        id="marca"
        title="Marca"
        lead="El pin con la campana: aparece, desaparece, espera y celebra."
      >
        <LogoDemo />
        <Demo
          title="Variantes"
          note="Horizontal para el encabezado, apilado para pantallas de marca, solo el pin para espacios chicos."
        >
          <Logo size="md" />
          <Logo variant="mark" size="lg" animation="idle" />
        </Demo>
        <SplashDemo />
        <CelebrationDemo />
      </Section>

      <Section
        id="fundamentos"
        title="Fundamentos"
        lead="Colores, tipografías y movimiento. Todo vive en tokens.css."
      >
        <Demo title="Colores" wide>
          <div className={styles.swatches}>
            {COLORS.map(([name, token]) => (
              <div key={token} className={styles.swatch}>
                <span style={{ background: `var(${token})` }} />
                <strong>{name}</strong>
                <code>{token}</code>
              </div>
            ))}
          </div>
        </Demo>
        <Demo title="Tipografía" note="Baloo 2 para títulos y números; Nunito para texto.">
          <div className={styles.typeSample}>
            <span className={styles.display}>Llegá y comé</span>
            <strong>Reservá. Pedí. Disfrutá.</strong>
            <span>Texto de interfaz en Nunito, cómodo de leer en el celular.</span>
          </div>
        </Demo>
        <Demo
          title="Movimiento"
          note={
            <>
              Duraciones <code>--duration-fast</code> 150 ms, <code>--duration-base</code> 240 ms,{' '}
              <code>--duration-slow</code> 420 ms. Curvas <code>--ease-out</code> y{' '}
              <code>--ease-spring</code> (con rebote). Con movimiento reducido, todo llega directo
              al estado final.
            </>
          }
        >
          <Highlight delay={0}>Con rebote, nunca lento</Highlight>
        </Demo>
      </Section>

      <Section id="acciones" title="Acciones" lead="Botones con el hundido 3D de la marca.">
        <Demo title="Botones" wide>
          <div className={styles.row}>
            <Button>Reservar mesa</Button>
            <Button variant="secondary">Ver menú</Button>
            <Button variant="ghost">Más tarde</Button>
            <Button icon={<IconSearch />}>Buscar</Button>
            <Button loading={loading} onClick={fakeSave}>
              {loading ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button disabled>No disponible</Button>
          </div>
          <div className={styles.row}>
            <Button size="sm">Chico</Button>
            <Button size="lg">Grande</Button>
            <IconButton label="Agregar">
              <IconPlus />
            </IconButton>
            <IconButton label="Cerrar" variant="ghost">
              <IconClose />
            </IconButton>
            <ThemeToggle />
          </div>
        </Demo>
      </Section>

      <Section id="formularios" title="Formularios" lead="Campos, filtros y selección.">
        <FormsDemo />
      </Section>

      <Section
        id="estados"
        title="Estados y carga"
        lead="Disponibilidad, concurrencia, en vivo y esperas."
      >
        <StatesDemo />
      </Section>

      <Section id="pedido" title="Pedido" lead="Las microinteracciones del pedido anticipado.">
        <OrderDemo />
      </Section>

      <Section id="reserva" title="Reserva" lead="Cómo se ve y se celebra una reserva.">
        <ReservationDemo />
      </Section>

      <Section id="mapa" title="Mapa" lead="Marcadores para el mapa de restaurantes (US-5).">
        <MapDemo />
      </Section>

      <Section id="feedback" title="Feedback" lead="Avisos y diálogos.">
        <FeedbackDemo />
      </Section>
    </div>
  )
}
