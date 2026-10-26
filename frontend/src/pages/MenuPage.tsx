import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { accessToken, useAccount } from '../api/session'
import { Button, Card, IconArrowRight } from '../components/ui'
import styles from './MenuPage.module.css'

type Dish = {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string
  precio: string
  restricciones_alimenticias: string[]
  tiempo_preparacion_minutos: number | null
  foto_url: string | null
}

const restrictionLabels: Record<string, string> = {
  sin_tacc: 'Sin TACC',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
}

export function MenuPage() {
  const navigate = useNavigate()
  const { data: account, isPending } = useAccount()
  const [dishes, setDishes] = useState<Dish[]>([])

  useEffect(() => {
    if (account?.rol !== 'restaurant') return
    fetch('/api/restaurantes/me/platos', {
      headers: { Authorization: `Bearer ${accessToken() ?? ''}` },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then(setDishes)
  }, [account])

  if (isPending) return <main className={styles.page}>Cargando…</main>
  if (account?.rol !== 'restaurant') {
    navigate('/ingresar', { replace: true })
    return null
  }

  return (
    <main className={styles.page}>
      <Link to="/" className={styles.back}>
        <IconArrowRight className={styles.backIcon} /> Volver al menú principal
      </Link>
      <header className={styles.header}>
        <div>
          <h1>Los platos de tu restaurante</h1>
        </div>
        <Button to="/restaurante/menu/nuevo-plato">Agregar plato</Button>
      </header>
      {dishes.length === 0 ? (
        <Card>
          <p>Todavía no cargaste platos.</p>
          <Button to="/restaurante/menu/nuevo-plato">Cargar el primer plato</Button>
        </Card>
      ) : (
        <div className={styles.grid}>
          {dishes.map((dish) => (
            <Card key={dish.id}>
              {dish.foto_url ? (
                <img className={styles.photo} src={dish.foto_url} alt={`Foto de ${dish.nombre}`} />
              ) : (
                <div className={styles.photoPlaceholder} aria-hidden="true">
                  Sin foto
                </div>
              )}
              {dish.restricciones_alimenticias.length > 0 && (
                <div className={styles.restrictions} aria-label="Restricciones alimenticias">
                  {dish.restricciones_alimenticias.map((restriction) => (
                    <span key={restriction} className={styles.restriction}>
                      {restrictionLabels[restriction] ?? restriction}
                    </span>
                  ))}
                </div>
              )}
              <h2>{dish.nombre}</h2>
              <p className={styles.category}>{dish.categoria.replace('_', ' ')}</p>
              {dish.descripcion && <p>{dish.descripcion}</p>}
              <strong>${dish.precio}</strong>
              {dish.tiempo_preparacion_minutos && (
                <p>{dish.tiempo_preparacion_minutos} min de preparación</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
