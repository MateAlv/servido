import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { cancelReservation, fetchActiveReservations, type Reservation } from '../api/reservations'
import { retryUnlessSessionExpired, SessionExpiredError } from '../api/errors'
import { signOut } from '../api/session'
import { Button, Card, Modal, StatusPill, useToast } from '../components/ui'
import { longDate } from '../lib/date'
import { tableLabel } from '../lib/seating'
import styles from './DinerReservationsPage.module.css'

const ACTIVE_KEY = ['reservations', 'active'] as const

function reservationWhen(reservation: Reservation) {
  return `${longDate(reservation.date)} · ${reservation.start_time} a ${reservation.end_time}`
}

function queryErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'No pudimos ver tus reservas.'
}

export function DinerReservationsPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState<Reservation | null>(null)
  const [confirming, setConfirming] = useState(false)
  const active = useQuery({
    queryKey: ACTIVE_KEY,
    queryFn: fetchActiveReservations,
    retry: retryUnlessSessionExpired,
  })
  const cancellation = useMutation({
    mutationFn: (reservationId: string) => cancelReservation(reservationId),
    onSuccess: (result) => {
      if (!result.ok) {
        toast(result.message, { tone: 'error' })
        return
      }
      setConfirming(false)
      setSelected(null)
      toast(result.cancellation.message, { tone: 'ok' })
      void queryClient.invalidateQueries({ queryKey: ACTIVE_KEY })
    },
  })

  useEffect(() => {
    if (active.error instanceof SessionExpiredError) signOut(queryClient)
  }, [active.error, queryClient])

  useEffect(() => {
    if (cancellation.error instanceof SessionExpiredError) signOut(queryClient)
  }, [cancellation.error, queryClient])

  function choose(reservation: Reservation) {
    setSelected((current) => (current?.id === reservation.id ? null : reservation))
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Tu cuenta</p>
        <h1>Mis reservas</h1>
        <p>Consultá los datos de tus próximas visitas.</p>
      </header>
      {active.isPending && (
        <p className={styles.feedback} role="status">
          Cargando reservas…
        </p>
      )}
      {Boolean(active.error) && !(active.error instanceof SessionExpiredError) && (
        <p className={styles.feedback} role="alert">
          {queryErrorMessage(active.error)}
        </p>
      )}
      {!active.isPending && !active.error && active.data?.length === 0 && (
        <p className={styles.empty} role="status">
          No tenés reservas activas.
        </p>
      )}
      {!active.isPending && !active.error && active.data && active.data.length > 0 && (
        <ul className={styles.list}>
          {active.data.map((reservation) => (
            <li key={reservation.id}>
              <Card className={styles.reservation}>
                <button
                  type="button"
                  className={styles.reservationButton}
                  aria-expanded={selected?.id === reservation.id}
                  onClick={() => choose(reservation)}
                >
                  <div className={styles.reservationHead}>
                    <div>
                      <p className={styles.restaurant}>{reservation.restaurant.nombre}</p>
                      <p className={styles.when}>{reservationWhen(reservation)}</p>
                    </div>
                    <StatusPill tone="ok">Confirmada</StatusPill>
                  </div>
                </button>
                {selected?.id === reservation.id && (
                  <div className={styles.detail}>
                    <h2>Detalle de la reserva</h2>
                    <dl className={styles.details}>
                      <div>
                        <dt>Restaurante</dt>
                        <dd>{reservation.restaurant.nombre}</dd>
                      </div>
                      <div>
                        <dt>Fecha y hora</dt>
                        <dd>{reservationWhen(reservation)}</dd>
                      </div>
                      <div>
                        <dt>Mesa</dt>
                        <dd>{tableLabel(reservation.table)}</dd>
                      </div>
                      <div>
                        <dt>Comensales</dt>
                        <dd>{reservation.party_size}</dd>
                      </div>
                    </dl>
                    <div className={styles.actions}>
                      <Button variant="secondary" onClick={() => setConfirming(true)}>
                        Cancelar reserva
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={confirming}
        onClose={() => {
          if (!cancellation.isPending) setConfirming(false)
        }}
        title="¿Cancelar reserva?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={cancellation.isPending}
            >
              No, volver
            </Button>
            <Button
              onClick={() => selected && cancellation.mutate(selected.id)}
              loading={cancellation.isPending}
            >
              Sí, cancelar
            </Button>
          </>
        }
      >
        <p>
          La cancelación es definitiva. Podés cancelar hasta 45 minutos antes del horario de tu
          reserva.
        </p>
      </Modal>
    </main>
  )
}
