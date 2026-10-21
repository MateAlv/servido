import type { ReactNode } from 'react'

import type { Account } from '../../api/session'
import {
  Button,
  Card,
  IconCheck,
  IconCloche,
  IconClock,
  IconPin,
  IconSearch,
  IconUsers,
  Reveal,
  StatusPill,
} from '../../components/ui'
import styles from './RestaurantHome.module.css'

type NextStep = { title: string; text: string; icon: ReactNode }

/** What the restaurant will set up next (specs 004 and 006, Sprint 2), and then receive. */
const NEXT_STEPS: NextStep[] = [
  {
    title: 'Tu local',
    text: 'Dirección, tipo de cocina y fotos, para que los comensales te encuentren en el mapa.',
    icon: <IconPin />,
  },
  {
    title: 'Horarios y mesas',
    text: 'Turnos de atención, mesas por capacidad y bloqueos de días u horarios.',
    icon: <IconClock />,
  },
  {
    title: 'Menú',
    text: 'Platos, precios y tiempo de preparación de cada uno.',
    icon: <IconCloche />,
  },
  {
    title: 'Reservas y pedidos',
    text: 'Quién viene, a qué hora y cuándo empezar a cocinar cada pedido.',
    icon: <IconUsers />,
  },
]

/** A signed-in restaurant's panel: its account, and what it can set up next. */
export function RestaurantHome({ account }: { account: Account }) {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Reveal>
          <p className={styles.eyebrow}>Panel del restaurante</p>
        </Reveal>
        <Reveal delay={60}>
          <h1 className={styles.title}>Hola, {account.nombre ?? account.email}</h1>
        </Reveal>
        <Reveal delay={120}>
          <p className={styles.lead}>
            Tu cuenta está lista. Estos son los pasos para empezar a recibir reservas con el pedido
            ya elegido.
          </p>
        </Reveal>
      </header>

      <div className={styles.top}>
        <Reveal delay={150}>
          <Card className={styles.account}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>Tu cuenta</h2>
              <StatusPill tone="ok">Activa</StatusPill>
            </div>
            <dl className={styles.data}>
              <div>
                <dt>Restaurante</dt>
                <dd>{account.nombre ?? '—'}</dd>
              </div>
              <div>
                <dt>Email para ingresar</dt>
                <dd>{account.email}</dd>
              </div>
            </dl>
            <p className={styles.check}>
              <IconCheck /> Registro completo
            </p>
          </Card>
        </Reveal>
        <Reveal delay={210}>
          <Card className={styles.preview}>
            <h2 className={styles.cardTitle}>Así eligen los comensales</h2>
            <p className={styles.cardText}>
              Buscan en el mapa por precio y por cuánta gente hay, y entran al menú de cada lugar.
              Cuando cargues tu local, vas a aparecer ahí.
            </p>
            <Button variant="secondary" icon={<IconSearch />} to="/mapa">
              Ver el mapa de restaurantes
            </Button>
          </Card>
        </Reveal>
      </div>

      <section aria-labelledby="proximos-pasos">
        <h2 id="proximos-pasos" className={styles.sectionTitle}>
          Próximos pasos
        </h2>
        <ol className={styles.steps}>
          {NEXT_STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={240 + i * 70}>
              <div className={styles.step}>
                <div className={styles.stepHead}>
                  <span className={styles.stepIcon} aria-hidden="true">
                    {step.icon}
                  </span>
                  <StatusPill tone="warn">Próximamente</StatusPill>
                </div>
                <h3 className={styles.stepTitle}>
                  <span className={styles.stepNumber}>{i + 1}.</span> {step.title}
                </h3>
                <p className={styles.stepText}>{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>
    </main>
  )
}
