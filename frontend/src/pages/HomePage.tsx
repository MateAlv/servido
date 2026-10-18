import { useState } from 'react'
import { Link } from 'react-router'

import { Highlight, Logo, Sticker } from '../components/brand'
import { ApiStatus } from '../components/dev/ApiStatus'
import { LiveIndicator, Steam } from '../components/order'
import { Ticket, TicketDivider, Timeline, type TimelineStep } from '../components/reservation'
import { OccupancyMeter } from '../components/restaurant'
import {
  Button,
  Card,
  IconCheck,
  IconCloche,
  IconClock,
  IconCutlery,
  IconPin,
  IconSearch,
  IconSparkle,
  Reveal,
  SegmentedControl,
  StarRating,
  StatusPill,
  ThemeToggle,
  useToast,
} from '../components/ui'
import { cx } from '../lib/cx'
import styles from './HomePage.module.css'

type Audience = 'diner' | 'restaurant'

const AUDIENCES = [
  { value: 'diner' as const, label: 'Soy comensal' },
  { value: 'restaurant' as const, label: 'Soy restaurante' },
]

const EXAMPLE_JOURNEY: TimelineStep[] = [
  {
    time: '20:10',
    title: 'Reservaste y elegiste',
    detail: '1× Bife de chorizo · 1× Ñoquis veganos',
    state: 'done',
  },
  {
    time: '20:32',
    title: 'La cocina empieza a prepararlo',
    detail: (
      <>
        <IconClock className={styles.clock} /> 28 min estimados
      </>
    ),
    state: 'current',
  },
  { time: '21:00', title: 'Llegás. Tu comida también.', state: 'upcoming' },
]

const STEPS = [
  {
    title: 'Reservá',
    text: 'Elegí cuántos son, cuándo y en qué mesa. Ves solo lo que realmente está libre.',
    icon: <IconPin className={styles.hop} />,
  },
  {
    title: 'Pedí',
    text: 'Armá tu pedido con el menú actualizado y los tiempos de cocina a la vista.',
    icon: (
      <>
        <Steam size={26} className={styles.stepSteam} />
        <IconCloche className={styles.hop} />
      </>
    ),
  },
  {
    title: 'Disfrutá',
    text: 'Llegás a tu hora y tu comida sale cuando vos entrás. Pagás con tarjeta o en el local.',
    icon: <IconCutlery className={styles.wiggle} />,
  },
]

export function HomePage() {
  const toast = useToast()
  const [audience, setAudience] = useState<Audience>('diner')

  function comingSoon() {
    toast('Muy pronto vas a poder hacerlo desde acá.')
  }

  return (
    <>
      <header className={styles.wrap}>
        <nav className={styles.nav} aria-label="Principal">
          <Link to="/" className={styles.brandLink}>
            <Logo size="sm" animation="intro" />
          </Link>
          <div className={styles.links}>
            <a href="#como">Cómo funciona</a>
            <a href="#restaurantes">Para restaurantes</a>
          </div>
          <div className={styles.actions}>
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={comingSoon}>
              Ingresar
            </Button>
            <Button size="sm" className={styles.navCta} onClick={comingSoon}>
              Sumá tu local
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className={cx(styles.wrap, styles.hero)}>
          <div>
            <Reveal>
              <span className={styles.eyebrow}>
                <svg className={styles.eyebrowIcon} viewBox="0 0 20 20" aria-hidden="true">
                  <circle cx="10" cy="10" r="4" fill="currentColor" />
                  <circle
                    cx="10"
                    cy="10"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                  />
                </svg>
                Reservá. Pedí. Disfrutá.
              </span>
            </Reveal>
            <Reveal delay={60}>
              <h1 className={styles.title}>
                Llegá y que la mesa ya esté <Highlight delay={700}>servida</Highlight>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className={styles.lead}>
                Reservá tu mesa y elegí tu comida antes de salir. El restaurante la prepara para
                cuando llegues, así no esperás.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <SegmentedControl
                label="¿Quién sos?"
                options={AUDIENCES}
                value={audience}
                onChange={setAudience}
              />
              <div className={styles.ctas}>
                {audience === 'diner' ? (
                  <>
                    <Button size="lg" icon={<IconSearch />} onClick={comingSoon}>
                      Buscar mesa
                    </Button>
                    <Button size="lg" variant="secondary" onClick={comingSoon}>
                      Ingresar como comensal
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" onClick={comingSoon}>
                      Sumar mi local
                    </Button>
                    <Button size="lg" variant="secondary" onClick={comingSoon}>
                      Ya tengo cuenta
                    </Button>
                  </>
                )}
              </div>
            </Reveal>
          </div>

          <figure className={styles.art} aria-label="Ejemplo de una reserva con pedido anticipado">
            <span className={styles.blob} aria-hidden="true" />
            <IconSparkle className={cx(styles.sparkle, styles.sparkleBig)} />
            <IconSparkle className={cx(styles.sparkle, styles.sparkleSmall)} />
            <Ticket tilt={3} delay={250} sticker={<Sticker delay={1000}>Sin espera</Sticker>}>
              <p className={styles.ticketTitle}>La Esquina de Palermo</p>
              <p className={styles.ticketMeta}>Vie 24 · 21:00 h · 2 personas · Mesa 4</p>
              <TicketDivider />
              <Timeline steps={EXAMPLE_JOURNEY} delay={650} />
            </Ticket>
            <div className={cx(styles.floating, styles.floatLive)}>
              <LiveIndicator />
              <small>Tu pedido se está preparando</small>
            </div>
            <div className={cx(styles.floating, styles.floatDistance)}>
              <IconPin />
              <span>
                0,4 km
                <small> · caminando 6 min</small>
              </span>
            </div>
            <div className={cx(styles.floating, styles.floatRating)}>
              <StarRating value={4.7} size={15} />
              <span>
                4,7 <small>· 128 reseñas</small>
              </span>
            </div>
          </figure>
        </section>

        <section id="como" className={styles.how}>
          <div className={styles.wrap}>
            <Reveal>
              <h2 className={styles.howTitle}>
                Tres pasos. <span>Cero esperas.</span>
              </h2>
            </Reveal>
            <ol className={styles.steps}>
              {STEPS.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 120}>
                  <div className={styles.step}>
                    <div className={styles.stepHead}>
                      <span className={styles.stepNumber}>{i + 1}</span>
                      <span className={styles.stepIcon} aria-hidden="true">
                        {step.icon}
                      </span>
                    </div>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <div className={styles.bizBackdrop}>
          <div className={styles.bizPanel}>
            <section id="restaurantes" className={cx(styles.wrap, styles.biz)}>
              <Reveal>
                <span className={styles.eyebrow}>Para restaurantes</span>
                <h2 className={styles.bizTitle}>Cocinás con tiempo, no con apuro.</h2>
                <ul className={styles.bullets}>
                  <li>
                    <IconCheck /> Recibí reservas y pedidos en un solo lugar
                  </li>
                  <li>
                    <IconCheck /> Sabé a qué hora empezar a preparar cada plato
                  </li>
                  <li>
                    <IconCheck /> Configurá turnos, mesas y seña a tu manera
                  </li>
                </ul>
                <div className={styles.ctas}>
                  <Button onClick={comingSoon}>Registrar mi restaurante</Button>
                  <Button variant="secondary" onClick={comingSoon}>
                    Ya tengo cuenta
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <Card>
                  <div className={styles.panelHead}>
                    <h3 className={styles.panelTitle}>Turno de esta noche</h3>
                    <LiveIndicator tone="primary" />
                  </div>
                  <span className={styles.barLabel}>Mesas ocupadas · 34 / 60</span>
                  <div className={styles.bar}>
                    <span className={styles.barFill} />
                  </div>
                  <div className={styles.panelRow}>
                    <b>20:32</b> Empezar: 2× Bife de chorizo
                    <StatusPill tone="warn" className={styles.rowEnd}>
                      En 5 min
                    </StatusPill>
                  </div>
                  <div className={styles.panelRow}>
                    <b>20:50</b> Mesa 6 · Pago confirmado
                    <StatusPill tone="ok" className={styles.rowEnd}>
                      Pagado
                    </StatusPill>
                  </div>
                  <div className={styles.panelRow}>
                    Concurrencia ahora
                    <span className={styles.rowEnd}>
                      <OccupancyMeter level="medium" />
                    </span>
                  </div>
                </Card>
              </Reveal>
            </section>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className={cx(styles.wrap, styles.footerInner)}>
          <span>© 2026 Servido! · Reservá. Pedí. Disfrutá.</span>
          {import.meta.env.DEV && (
            <span className={styles.devTools}>
              <ApiStatus />
              <Link to="/diseno">Sistema de diseño</Link>
            </span>
          )}
        </div>
      </footer>
    </>
  )
}
