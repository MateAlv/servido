import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { useAccount } from '../api/session'
import {
  changePromotionState,
  createPromotion,
  fetchPromotions,
  type Promotion,
  type PromotionCreate,
  updatePolicy,
  updatePromotion,
} from '../api/promotions'
import {
  Button,
  Card,
  Checkbox,
  IconArrowLeft,
  SegmentedControl,
  StatusPill,
  TextField,
  useToast,
} from '../components/ui'
import styles from './PromotionsPage.module.css'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

type Form = {
  name: string
  description: string
  discountType: 'percentage' | 'fixed'
  discountValue: string
  minimumAmount: string
  startsOn: string
  endsOn: string
  weekdays: number[]
  startTime: string
  endTime: string
  active: boolean
  stackable: boolean
}

const EMPTY_FORM: Form = {
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  minimumAmount: '',
  startsOn: '',
  endsOn: '',
  weekdays: [],
  startTime: '',
  endTime: '',
  active: true,
  stackable: true,
}

function discountText(promotion: Promotion): string {
  if (promotion.discount_type === 'percentage') {
    return `${promotion.discount_value}% de descuento`
  }
  const minimum =
    promotion.minimum_amount != null ? ` (pedido mínimo $${promotion.minimum_amount})` : ''
  return `$${promotion.discount_value} de descuento${minimum}`
}

function validityText(promotion: Promotion): string {
  const bits: string[] = []
  if (promotion.starts_on && promotion.ends_on) {
    bits.push(`del ${promotion.starts_on} al ${promotion.ends_on}`)
  }
  if (promotion.weekdays?.length) {
    const nombres = promotion.weekdays.map((d) => WEEKDAYS[d - 1])
    bits.push(`los ${nombres.join(', ')}`)
  }
  if (promotion.start_time && promotion.end_time) {
    bits.push(`de ${promotion.start_time} a ${promotion.end_time}`)
  }
  return bits.length ? bits.join(' · ') : 'Siempre vigente'
}

function stateTone(state: Promotion['state']): 'ok' | 'neutral' | 'warn' | 'error' {
  switch (state) {
    case 'active':
      return 'ok'
    case 'programmed':
      return 'neutral'
    case 'paused':
      return 'warn'
    case 'expired':
      return 'error'
  }
}

export function PromotionsPage() {
  const { data: account } = useAccount()
  const client = useQueryClient()
  const toast = useToast()
  const { data: promotionsData, isLoading } = useQuery({
    queryKey: ['restaurant', 'promotions'],
    queryFn: fetchPromotions,
    enabled: Boolean(account?.rol === 'restaurant'),
    retry: false,
  })
  const [error, setError] = useState('')
  const [screen, setScreen] = useState<'list' | 'create' | 'edit'>('list')
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [requestId, setRequestId] = useState(crypto.randomUUID())
  const [saving, setSaving] = useState(false)

  const promotions = promotionsData?.promotions ?? []
  const stackPromotions = promotionsData?.stack_promotions ?? false

  const change = (field: keyof Form, value: Form[keyof Form]) =>
    setForm((current) => ({ ...current, [field]: value }))

  const toggleWeekday = (day: number) =>
    setForm((current) => {
      const next = current.weekdays.includes(day)
        ? current.weekdays.filter((item) => item !== day)
        : [...current.weekdays, day]
      return { ...current, weekdays: next }
    })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setRequestId(crypto.randomUUID())
    setError('')
    setScreen('create')
  }

  const openEdit = (promotion: Promotion) => {
    setEditing(promotion)
    setForm({
      name: promotion.name,
      description: promotion.description ?? '',
      discountType: promotion.discount_type,
      discountValue: String(promotion.discount_value),
      minimumAmount: promotion.minimum_amount != null ? String(promotion.minimum_amount) : '',
      startsOn: promotion.starts_on ?? '',
      endsOn: promotion.ends_on ?? '',
      weekdays: promotion.weekdays ?? [],
      startTime: promotion.start_time ?? '',
      endTime: promotion.end_time ?? '',
      active: promotion.active,
      stackable: promotion.stackable,
    })
    setRequestId(crypto.randomUUID())
    setError('')
    setScreen('edit')
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    setError('')
    const payload: PromotionCreate = {
      request_id: requestId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      discount_type: form.discountType,
      discount_value: form.discountValue,
      minimum_amount:
        form.discountType === 'fixed' && form.minimumAmount.trim() ? form.minimumAmount : null,
      starts_on: form.startsOn || null,
      ends_on: form.endsOn || null,
      weekdays: form.weekdays.length ? form.weekdays : null,
      start_time: form.startTime || null,
      end_time: form.endTime || null,
      active: form.active,
      stackable: form.stackable,
    }
    setSaving(true)
    try {
      if (editing) {
        await updatePromotion(editing.id, {
          name: payload.name,
          description: payload.description,
          discount_type: payload.discount_type,
          discount_value: payload.discount_value,
          minimum_amount: payload.minimum_amount,
          starts_on: payload.starts_on,
          ends_on: payload.ends_on,
          weekdays: payload.weekdays,
          start_time: payload.start_time,
          end_time: payload.end_time,
          active: form.active,
          stackable: form.stackable,
        })
        toast(editing ? 'Promoción actualizada.' : 'Promoción creada.', { tone: 'ok' })
      } else {
        await createPromotion(payload)
        toast('Promoción creada.', { tone: 'ok' })
      }
      setScreen('list')
      setRequestId(crypto.randomUUID())
      await client.invalidateQueries({ queryKey: ['restaurant', 'promotions'] })
    } catch (requestError) {
      setError((requestError as Error).message || 'No pudimos guardar la promoción.')
    } finally {
      setSaving(false)
    }
  }

  async function togglePolicy() {
    try {
      await updatePolicy(!stackPromotions)
      toast(`Promociones ${!stackPromotions ? 'acumulables' : 'solo la que más ahorra'}.`, {
        tone: 'ok',
      })
      await client.invalidateQueries({ queryKey: ['restaurant', 'promotions'] })
    } catch (requestError) {
      setError((requestError as Error).message || 'No pudimos guardar la política.')
    }
  }

  async function pauseOrActivate(promotion: Promotion) {
    try {
      await changePromotionState(promotion.id, !promotion.active)
      await client.invalidateQueries({ queryKey: ['restaurant', 'promotions'] })
    } catch (requestError) {
      setError((requestError as Error).message || 'No pudimos cambiar el estado.')
    }
  }

  if (isLoading) return <p role="status">Cargando promociones…</p>
  if (account?.rol !== 'restaurant') return <p>Esta sección es solo para restaurantes.</p>

  const closeEditor = () => {
    setScreen('list')
    setEditing(null)
    setError('')
  }

  if (screen !== 'list') {
    return (
      <main className={styles.page}>
        <Button variant="ghost" size="sm" onClick={closeEditor} icon={<IconArrowLeft />}>
          Volver a promociones
        </Button>
        <header className={styles.editorHeader}>
          <p className={styles.eyebrow}>{editing ? 'Editar promoción' : 'Nueva promoción'}</p>
          <h1 className={styles.title}>{editing ? editing.name : 'Crear promoción'}</h1>
          <p className={styles.lead}>
            El descuento se aplica automáticamente al subtotal del pedido anticipado dentro de la
            vigencia.
          </p>
        </header>

        <Card className={styles.formCard}>
          <form className={styles.form} onSubmit={save}>
            <section className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>Datos generales</h2>
              <TextField
                label="Nombre"
                required
                value={form.name}
                onChange={(event) => change('name', event.target.value)}
              />
              <TextField
                label="Descripción (opcional)"
                value={form.description}
                onChange={(event) => change('description', event.target.value)}
              />
            </section>

            <section className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>Tipo de descuento</h2>
              <SegmentedControl
                label="Tipo de descuento"
                options={[
                  { value: 'percentage', label: 'Porcentual' },
                  { value: 'fixed', label: 'Monto fijo' },
                ]}
                value={form.discountType}
                onChange={(value) => {
                  change('discountType', value)
                  if (value === 'percentage') change('minimumAmount', '')
                }}
              />
              <div className={styles.discountFields}>
                <TextField
                  label={
                    form.discountType === 'percentage'
                      ? 'Porcentaje de descuento'
                      : 'Monto de descuento'
                  }
                  type="number"
                  hint={
                    form.discountType === 'percentage' ? 'Entre 1% y 100%' : 'Debe ser mayor a $0.'
                  }
                  value={form.discountValue}
                  onChange={(event) => change('discountValue', event.target.value)}
                />
                {form.discountType === 'fixed' && (
                  <TextField
                    label="Monto mínimo del pedido"
                    type="number"
                    hint="Debe ser mayor o igual al monto de descuento."
                    value={form.minimumAmount}
                    onChange={(event) => change('minimumAmount', event.target.value)}
                  />
                )}
              </div>
            </section>

            <section className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>Vigencia</h2>
              <p className={styles.fieldHint}>
                Combiná fechas, días y horarios. Se requiere al menos un criterio.
              </p>
              <div className={styles.validityGrid}>
                <div className={styles.validityBlock}>
                  <strong className={styles.validityTitle}>Rango de fechas</strong>
                  <div className={styles.datePair}>
                    <TextField
                      label="Desde"
                      type="date"
                      value={form.startsOn}
                      onChange={(event) => change('startsOn', event.target.value)}
                    />
                    <TextField
                      label="Hasta"
                      type="date"
                      value={form.endsOn}
                      onChange={(event) => change('endsOn', event.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.validityBlock}>
                  <strong className={styles.validityTitle}>Días de la semana</strong>
                  <div className={styles.weekdays}>
                    {WEEKDAYS.map((label, index) => {
                      const day = index + 1
                      return (
                        <Checkbox
                          key={label}
                          label={label}
                          checked={form.weekdays.includes(day)}
                          onChange={() => toggleWeekday(day)}
                        />
                      )
                    })}
                  </div>
                </div>
                <div className={styles.validityBlock}>
                  <strong className={styles.validityTitle}>Franja horaria</strong>
                  <div className={styles.timePair}>
                    <TextField
                      label="Desde"
                      type="time"
                      value={form.startTime}
                      onChange={(event) => change('startTime', event.target.value)}
                    />
                    <TextField
                      label="Hasta"
                      type="time"
                      value={form.endTime}
                      onChange={(event) => change('endTime', event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.formSection}>
              <h2 className={styles.formSectionTitle}>Estado</h2>
              <div className={styles.options}>
                <Checkbox
                  label="Promoción activa"
                  checked={form.active}
                  onChange={(event) => change('active', event.target.checked)}
                />
                <Checkbox
                  label="Acumulable con otras promociones"
                  checked={form.stackable}
                  onChange={(event) => change('stackable', event.target.checked)}
                />
              </div>
            </section>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <footer className={styles.formFooter}>
              <Button type="button" variant="secondary" onClick={closeEditor}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar promoción'}
              </Button>
            </footer>
          </form>
        </Card>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <Button variant="ghost" size="sm" to="/" icon={<IconArrowLeft />}>
        Volver al panel
      </Button>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Panel del restaurante</p>
        <h1 className={styles.title}>Promociones</h1>
        <p className={styles.lead}>
          Creá descuentos porcentuales o de monto fijo para los pedidos anticipados. Los pedidos ya
          confirmados no se ven afectados.
        </p>
      </header>

      <Card className={styles.card}>
        <div className={styles.policy}>
          <div>
            <strong className={styles.policyTitle}>Promociones simultáneas</strong>
            <p className={styles.policyHelp}>
              Elegí si se aplican varias promociones o solo la que más ahorra.
            </p>
          </div>
          <Checkbox
            label="Acumular promociones"
            checked={stackPromotions}
            onChange={togglePolicy}
          />
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle}>Tus promociones</h2>
          <Button size="sm" onClick={openCreate}>
            Nueva promoción
          </Button>
        </div>
        {promotions.length === 0 ? (
          <p className={styles.muted}>Aún no hay promociones creadas.</p>
        ) : (
          <ul className={styles.list}>
            {promotions.map((promotion) => (
              <li key={promotion.id} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.itemHeading}>
                    <strong>{promotion.name}</strong>
                    <StatusPill tone={stateTone(promotion.state)}>
                      {promotion.state === 'active'
                        ? 'Activa'
                        : promotion.state === 'programmed'
                          ? 'Programada'
                          : promotion.state === 'expired'
                            ? 'Vencida'
                            : 'Pausada'}
                    </StatusPill>
                  </div>
                  <p className={styles.muted}>{discountText(promotion)}</p>
                  <p className={styles.muted}>{validityText(promotion)}</p>
                </div>
                <div className={styles.actions}>
                  <Button variant="secondary" size="sm" onClick={() => openEdit(promotion)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={promotion.active ? 'ghost' : 'secondary'}
                    onClick={() => pauseOrActivate(promotion)}
                  >
                    {promotion.active ? 'Pausar' : 'Activar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  )
}
