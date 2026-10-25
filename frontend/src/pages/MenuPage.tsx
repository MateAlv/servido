import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { accessToken, useAccount } from '../api/session'
import { Button, Card } from '../components/ui'
import styles from './MenuPage.module.css'

type Dish = {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string
  precio: string
  tiempo_preparacion_minutos: number | null
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
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Menú</p>
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
