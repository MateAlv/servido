import { useEffect, useState, type ReactNode } from 'react'

import {
  configurationApi,
  type OpeningShift,
  type RestaurantProfile,
  type TableGroup,
} from '../../api/restaurantConfiguration'
import { sessionHeaders, type Account } from '../../api/session'
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

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type DashboardCardProps = {
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
  action: ReactNode
}

function DashboardCard({ title, description, icon, children, action }: DashboardCardProps) {
  return (
    <Card className={styles.managementCard}>
      <div className={styles.managementHead}>
        <span className={styles.managementIcon} aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 className={styles.cardTitle}>{title}</h2>
          <p className={styles.cardText}>{description}</p>
        </div>
      </div>
      <div className={styles.summary}>{children}</div>
      {action}
    </Card>
  )
}

/** A signed-in restaurant's dashboard and direct access to each management area. */
export function RestaurantHome({ account }: { account: Account }) {
  const [profile, setProfile] = useState<RestaurantProfile>()
  const [hours, setHours] = useState<OpeningShift[]>([])
  const [tables, setTables] = useState<TableGroup[]>([])
  const [dishCount, setDishCount] = useState<number>()
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    void Promise.all([
      configurationApi.getProfile().then(setProfile),
      configurationApi.getHours().then(setHours),
      configurationApi.getTables().then(setTables),
      fetch('/api/restaurantes/me/platos', { headers: sessionHeaders() })
        .then((response) => (response.ok ? response.json() : []))
        .then((dishes: unknown[]) => setDishCount(dishes.length)),
    ]).catch((requestError: Error) => setDashboardError(requestError.message))
  }, [])

  const activeHours = hours.filter((shift) => shift.active)
  const availableTables = tables
    .filter((group) => group.available)
    .reduce((total, group) => total + group.quantity, 0)
  const totalTables = tables.reduce((total, group) => total + group.quantity, 0)
  const configuredProfile = Boolean(profile?.nombre && profile.latitud !== null)
  // The same rule as GET /api/restaurants (spec 005, D4): location, an active shift and tables.
  const takesReservations = configuredProfile && activeHours.length > 0 && availableTables > 0

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
            Gestioná tu local desde un solo lugar y mantené actualizada la información que ven los
            comensales.
          </p>
        </Reveal>
      </header>
      {dashboardError && (
        <p className={styles.dashboardError} role="alert">
          No pudimos cargar todo el estado del local. {dashboardError}
        </p>
      )}

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
              Revisá tu información pública en el mapa y asegurate de que puedan encontrarte.
            </p>
            <Button variant="secondary" icon={<IconSearch />} to="/mapa">
              Ver el mapa de restaurantes
            </Button>
          </Card>
        </Reveal>
      </div>

      <section className={styles.management} aria-labelledby="gestion-del-local">
        <h2 id="gestion-del-local" className={styles.sectionTitle}>
          Gestión del local
        </h2>
        <div className={styles.managementGrid}>
          <Reveal>
            <DashboardCard
              title="Datos del restaurante"
              description="La información pública de tu local."
              icon={<IconPin />}
              action={
                <Button size="sm" to="/restaurante/perfil">
                  Modificar perfil
                </Button>
              }
            >
              {profile?.tipo_cocina && <p>{profile.tipo_cocina}</p>}
              {profile?.direccion && <p>{profile.direccion}</p>}
              <StatusPill tone={configuredProfile ? 'ok' : 'warn'}>
                {configuredProfile ? 'Perfil completo' : 'Falta configurar'}
              </StatusPill>
            </DashboardCard>
          </Reveal>

          <Reveal delay={60}>
            <DashboardCard
              title="Turnos y horarios"
              description="Cuándo pueden reservar los comensales."
              icon={<IconClock />}
              action={
                <Button size="sm" to="/restaurante/horarios">
                  Modificar horarios
                </Button>
              }
            >
              <p>
                {activeHours.length > 0
                  ? `${activeHours.length} ${activeHours.length === 1 ? 'turno activo' : 'turnos activos'}`
                  : 'Todavía no configuraste turnos'}
              </p>
              <p className={styles.muted}>
                {activeHours.length > 0
                  ? [...new Set(activeHours.map((shift) => DAYS[shift.day_of_week - 1]))].join(
                      ' · ',
                    )
                  : 'Agregá tus días y franjas horarias'}
              </p>
            </DashboardCard>
          </Reveal>

          <Reveal delay={120}>
            <DashboardCard
              title="Mesas y capacidad"
              description="El inventario disponible para reservas."
              icon={<IconUsers />}
              action={
                <Button size="sm" to="/restaurante/mesas">
                  Gestionar mesas
                </Button>
              }
            >
              <p>
                {totalTables > 0
                  ? `${availableTables} de ${totalTables} mesas disponibles`
                  : 'Sin mesas cargadas'}
              </p>
              <p className={styles.muted}>
                {tables.length > 0
                  ? `${tables.length} ${tables.length === 1 ? 'grupo de mesas' : 'grupos de mesas'}`
                  : 'Agregá grupos de mesas'}
              </p>
            </DashboardCard>
          </Reveal>

          <Reveal delay={180}>
            <DashboardCard
              title="Platos y menú"
              description="La propuesta que van a elegir tus clientes."
              icon={<IconCloche />}
              action={
                <Button size="sm" to="/restaurante/menu">
                  Administrar menú
                </Button>
              }
            >
              {dishCount !== undefined && dishCount > 0 && (
                <p>
                  {dishCount} {dishCount === 1 ? 'plato cargado' : 'platos cargados'}
                </p>
              )}
              <p className={styles.muted}>Agregá platos, precios y tiempos de preparación.</p>
            </DashboardCard>
          </Reveal>

          <Reveal delay={240}>
            <DashboardCard
              title="Reservas"
              description="Las próximas visitas a tu local."
              icon={<IconUsers />}
              action={
                <Button size="sm" to="/restaurante/reservas">
                  Ver reservas
                </Button>
              }
            >
              <p>
                {takesReservations
                  ? 'Los comensales ya pueden reservar en tu local.'
                  : 'Completá tus datos con la dirección, tus horarios y tus mesas para recibir reservas.'}
              </p>
            </DashboardCard>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
