import { Link } from 'react-router'

import { Highlight, Sticker } from '../../components/brand'
import { LiveIndicator, Steam } from '../../components/order'
import { Ticket, TicketDivider, Timeline, type TimelineStep } from '../../components/reservation'
import { OccupancyMeter } from '../../components/restaurant'
import {
  Button,
  Card,
  IconArrowRight,
  IconCheck,
  IconCloche,
  IconClock,
  IconCutlery,
  IconPin,
  IconSparkle,
  Reveal,
  StarRating,
  StatusPill,
} from '../../components/ui'
import { cx } from '../../lib/cx'
import styles from './LandingPage.module.css'

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

/** Home for someone who is not signed in: what Servido! is, and the way in for each role. */
export function LandingPage() {
  return (
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
              Llegá y que tu plato ya esté <Highlight delay={700}>Servido!</Highlight>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className={styles.lead}>
              Reservá tu mesa y elegí tu comida antes de salir. El restaurante la prepara para
              cuando llegues, así no esperás.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className={styles.access}>
              <section className={styles.accessCard} aria-labelledby="acceso-comensal">
                <span className={styles.accessIcon} aria-hidden="true">
                  <IconCutlery />
                </span>
                <h2 id="acceso-comensal" className={styles.accessTitle}>
                  Soy comensal
                </h2>
                <p className={styles.accessText}>Reservá y pedí antes de llegar.</p>
                <div className={styles.accessActions}>
                  <Button to="/registrarme">Crear cuenta</Button>
                  <Button variant="secondary" to="/ingresar?rol=comensal">
                    Ingresar
                  </Button>
                </div>
              </section>
              <section className={styles.accessCard} aria-labelledby="acceso-restaurante">
                <span className={cx(styles.accessIcon, styles.accessIconAlt)} aria-hidden="true">
                  <IconCloche />
                </span>
                <h2 id="acceso-restaurante" className={styles.accessTitle}>
                  Soy restaurante
                </h2>
                <p className={styles.accessText}>Recibí reservas con el pedido listo.</p>
                <div className={styles.accessActions}>
                  <Button to="/suma-tu-local">Sumá tu local</Button>
                  <Button variant="secondary" to="/ingresar?rol=restaurante">
                    Ingresar
                  </Button>
                </div>
              </section>
            </div>
            <Link to="/mapa" className={styles.explore}>
              Ver restaurantes sin crear cuenta <IconArrowRight />
            </Link>
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
                <Button to="/suma-tu-local">Registrar mi restaurante</Button>
                <Button variant="secondary" to="/ingresar?rol=restaurante">
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
  )
}
