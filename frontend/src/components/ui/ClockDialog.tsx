import { useState } from 'react'

import { cssVars } from '../../lib/cssVars'
import { Button } from './Button'
import { Modal } from './Modal'
import styles from './ClockDialog.module.css'

/** Radius of each ring and size of its buttons, in px; they match the dial in the CSS. */
const OUTER = { radius: 116, size: 44 }
const INNER = { radius: 76, size: 36 }

type ClockDialogProps = {
  open: boolean
  /** What is being chosen, e.g. «Llegar desde». */
  title: string
  /** The hour it opens with, «20:30». */
  value: string
  /** The half hours that can be chosen. */
  selectable: readonly string[]
  onConfirm: (hour: string) => void
  onClose: () => void
}

type Step = 'hour' | 'minute'

const pad = (number: number) => String(number).padStart(2, '0')

/** Where a button sits on the dial: `angle` in degrees from 12 o'clock. */
function place(angle: number, ring: typeof OUTER) {
  const radians = (angle * Math.PI) / 180
  return cssVars({
    '--x': `${(Math.sin(radians) * ring.radius).toFixed(1)}px`,
    '--y': `${(-Math.cos(radians) * ring.radius).toFixed(1)}px`,
    '--size': `${ring.size}px`,
  })
}

function ClockFace({
  value,
  selectable,
  onConfirm,
  onClose,
}: Omit<ClockDialogProps, 'open' | 'title'>) {
  const [step, setStep] = useState<Step>('hour')
  const [hour, setHour] = useState(Number(value.slice(0, 2)) || 0)
  const [minute, setMinute] = useState(value.endsWith(':30') ? 30 : 0)
  const allowed = (h: number, m: number) => selectable.includes(`${pad(h)}:${pad(m)}`)
  const chosen = `${pad(hour)}:${pad(minute)}`

  function pickHour(next: number) {
    setHour(next)
    if (!allowed(next, minute)) setMinute(minute === 0 ? 30 : 0)
    setStep('minute')
  }

  const ring = step === 'hour' && hour < 12 ? INNER : OUTER
  const handAngle = step === 'hour' ? (hour % 12) * 30 : minute === 30 ? 180 : 0

  return (
    <div className={styles.face}>
      <div className={styles.readout}>
        <button
          type="button"
          className={styles.segment}
          aria-pressed={step === 'hour'}
          aria-label={`Hora: ${pad(hour)}. Cambiar la hora`}
          onClick={() => setStep('hour')}
        >
          {pad(hour)}
        </button>
        <span aria-hidden="true" className={styles.colon}>
          :
        </span>
        <button
          type="button"
          className={styles.segment}
          aria-pressed={step === 'minute'}
          aria-label={`Minutos: ${pad(minute)}. Cambiar los minutos`}
          onClick={() => setStep('minute')}
        >
          {pad(minute)}
        </button>
      </div>
      <p className={styles.hint} aria-live="polite">
        {step === 'hour' ? 'Elegí la hora' : 'Elegí los minutos'}
      </p>

      <div key={step} className={styles.dial}>
        <span
          className={styles.hand}
          aria-hidden="true"
          style={cssVars({ '--angle': `${handAngle}deg`, '--length': `${ring.radius}px` })}
        />
        <span className={styles.center} aria-hidden="true" />
        {step === 'hour'
          ? Array.from({ length: 24 }, (_, h) => (
              <button
                key={h}
                type="button"
                className={styles.number}
                data-ring={h < 12 ? 'inner' : 'outer'}
                style={place((h % 12) * 30, h < 12 ? INNER : OUTER)}
                aria-pressed={h === hour}
                aria-label={`Las ${h}`}
                disabled={!allowed(h, 0) && !allowed(h, 30)}
                onClick={() => pickHour(h)}
              >
                {pad(h)}
              </button>
            ))
          : [0, 30].map((m) => (
              <button
                key={m}
                type="button"
                className={styles.number}
                data-ring="minute"
                style={place(m === 30 ? 180 : 0, { ...OUTER, size: 56 })}
                aria-pressed={m === minute}
                aria-label={m === 30 ? 'Y media' : 'En punto'}
                disabled={!allowed(hour, m)}
                onClick={() => setMinute(m)}
              >
                {pad(m)}
              </button>
            ))}
      </div>
      <p className={styles.hint}>
        {step === 'hour' ? 'Afuera, de 12 a 23 · adentro, de 00 a 11' : 'En punto o y media'}
      </p>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!selectable.includes(chosen)} onClick={() => onConfirm(chosen)}>
          Listo
        </Button>
      </div>
    </div>
  )
}

/**
 * An analog clock to choose a half hour: first the hour (24 h, in two rings), then the minutes,
 * only :00 or :30. It confirms with «Listo»; the hours that can't be chosen are disabled.
 */
export function ClockDialog({ open, title, ...face }: ClockDialogProps) {
  return (
    <Modal open={open} onClose={face.onClose} title={title}>
      {open && <ClockFace key={face.value} {...face} />}
    </Modal>
  )
}
