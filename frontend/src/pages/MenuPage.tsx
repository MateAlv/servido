import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation } from 'react-router'

import {
  changeDishAvailability,
  dishKeys,
  fetchOwnedDishes,
  refreshDishQueries,
  removeDish,
  STALE_DISH_MESSAGE,
  useDishSessionError,
  type OwnedDish,
} from '../api/dishes'
import { getRequestErrorMessage } from '../api/errors'
import { useAccount } from '../api/session'
import { Button, Card, IconArrowRight, Modal, StatusPill } from '../components/ui'
import styles from './MenuPage.module.css'

const restrictionLabels: Record<string, string> = {
  sin_tacc: 'Sin TACC',
  vegetariano: 'Vegetariano',
  vegano: 'Vegano',
}
const categoryLabels: Record<string, string> = {
  entrada: 'Entrada',
  plato_principal: 'Plato principal',
  postre: 'Postre',
  bebida: 'Bebida',
}

export function MenuPage() {
  const { data: account, isPending } = useAccount()
  if (isPending) return <main className={styles.page}>Cargando…</main>
  if (account?.rol !== 'restaurant') return <Navigate to="/ingresar" replace />
  return <OwnerMenu key={account.id} accountId={account.id} />
}

function OwnerMenu({ accountId }: { accountId: string }) {
  const client = useQueryClient()
  const location = useLocation()
  const [notice, setNotice] = useState<string>(location.state?.notice ?? '')
  const [removing, setRemoving] = useState<OwnedDish | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const focusAfterRemoval = useRef(false)
  const container = useRef<HTMLElement>(null)
  useEffect(() => {
    const element = container.current
    const restoreFocus = () => {
      if (!focusAfterRemoval.current) return
      focusAfterRemoval.current = false
      heading.current?.focus()
    }
    // The native close event follows Modal's exit animation; the removed trigger is gone.
    element?.addEventListener('close', restoreFocus, true)
    return () => element?.removeEventListener('close', restoreFocus, true)
  }, [])
  const query = useQuery({
    queryKey: dishKeys.list(accountId),
    queryFn: fetchOwnedDishes,
    retry: false,
  })
  const mutation = useMutation({
    mutationFn: async ({
      dish,
      action,
    }: {
      dish: OwnedDish
      action: 'availability' | 'remove'
    }) => {
      if (action === 'remove') {
        await removeDish(dish.id)
        return null
      }
      return changeDishAvailability(dish.id, !dish.disponible)
    },
    onSuccess: async (result, { dish, action }) => {
      setNotice(
        result?.changed_since_open
          ? STALE_DISH_MESSAGE
          : action === 'remove'
            ? 'Quitamos el plato del menú.'
            : 'Actualizamos la disponibilidad.',
      )
      if (action === 'remove') {
        focusAfterRemoval.current = true
        client.removeQueries({ queryKey: dishKeys.detail(accountId, dish.id) })
        setRemoving(null)
      }
      await refreshDishQueries(client, accountId)
      if (action === 'remove') heading.current?.focus()
    },
  })
  useDishSessionError(query.error ?? mutation.error)
  function close() {
    if (mutation.isPending) return
    setRemoving(null)
    mutation.reset()
    trigger.current?.focus()
  }
  return (
    <main className={styles.page} ref={container}>
      <Link to="/" className={styles.back}>
        <IconArrowRight className={styles.backIcon} /> Volver al menú principal
      </Link>
      <header className={styles.header}>
        <h1 ref={heading} tabIndex={-1}>
          Los platos de tu restaurante
        </h1>
        <Button to="/restaurante/menu/nuevo-plato">Agregar plato</Button>
      </header>
      {notice && <p role="status">{notice}</p>}
      {query.isPending ? (
        <p role="status">Cargando platos…</p>
      ) : query.error ? (
        <>
          <p role="alert">{getRequestErrorMessage(query.error, 'No pudimos cargar el menú.')}</p>
          <Button onClick={() => void query.refetch()}>Reintentar</Button>
        </>
      ) : query.data.length === 0 ? (
        <Card>
          <p>Todavía no cargaste platos.</p>
          <Button to="/restaurante/menu/nuevo-plato">Cargar el primer plato</Button>
        </Card>
      ) : (
        <div className={styles.grid}>
          {query.data.map((dish) => (
            <Card key={dish.id}>
              {dish.foto_url ? (
                <img className={styles.photo} src={dish.foto_url} alt={`Foto de ${dish.nombre}`} />
              ) : (
                <div className={styles.photoPlaceholder} aria-hidden="true">
                  Sin foto
                </div>
              )}
              <StatusPill tone={dish.disponible ? 'ok' : 'warn'}>
                {dish.disponible ? 'Disponible' : 'No disponible'}
              </StatusPill>
              <h2>{dish.nombre}</h2>
              <p className={styles.category}>{categoryLabels[dish.categoria] ?? dish.categoria}</p>
              {dish.descripcion && <p>{dish.descripcion}</p>}
              <strong>${dish.precio}</strong>
              <div className={styles.restrictions}>
                {dish.restricciones_alimenticias.map((value) => (
                  <span key={value} className={styles.restriction}>
                    {restrictionLabels[value] ?? value}
                  </span>
                ))}
              </div>
              {dish.tiempo_preparacion_minutos && (
                <p>{dish.tiempo_preparacion_minutos} min de preparación</p>
              )}
              <div className={styles.actions}>
                <Button to={`/restaurante/menu/${dish.id}/editar`} variant="secondary">
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setNotice('')
                    mutation.mutate({ dish, action: 'availability' })
                  }}
                >
                  {dish.disponible ? 'Marcar como no disponible' : 'Marcar como disponible'}
                </Button>
                <Button
                  variant="ghost"
                  disabled={mutation.isPending}
                  onClick={(event) => {
                    trigger.current = event.currentTarget
                    mutation.reset()
                    setRemoving(dish)
                  }}
                >
                  Quitar plato
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {mutation.error && !removing && (
        <p role="alert">
          {getRequestErrorMessage(mutation.error, 'No pudimos guardar los cambios.')}
        </p>
      )}
      <Modal
        open={removing !== null}
        onClose={close}
        title={`Quitar ${removing?.nombre ?? 'plato'}`}
        footer={
          <>
            <Button variant="secondary" disabled={mutation.isPending} onClick={close}>
              Cancelar
            </Button>
            <Button
              loading={mutation.isPending}
              onClick={() => {
                if (removing && !mutation.isPending)
                  mutation.mutate({ dish: removing, action: 'remove' })
              }}
            >
              Quitar plato
            </Button>
          </>
        }
      >
        <p>
          El plato dejará de aparecer en tu menú. Esta acción no se puede deshacer. Los pedidos
          confirmados conservarán sus datos.
        </p>
        {mutation.error && (
          <p role="alert">
            {getRequestErrorMessage(mutation.error, 'No pudimos quitar el plato.')}
          </p>
        )}
      </Modal>
    </main>
  )
}
