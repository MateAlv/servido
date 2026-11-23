import { useEffect, useState } from 'react'

import styles from './TestCards.module.css'

/** Mercado Pago's published test cards (developers › Tarjetas de prueba). All expire 11/30. */
const CARDS = [
  { brand: 'Visa', kind: 'crédito', number: '4509 9535 6623 3704', code: '123' },
  { brand: 'Mastercard', kind: 'crédito', number: '5031 7557 3453 0604', code: '123' },
  { brand: 'American Express', kind: 'crédito', number: '3711 803032 57522', code: '1234' },
  { brand: 'Visa', kind: 'débito', number: '4002 7686 9439 5619', code: '123' },
  { brand: 'Mastercard', kind: 'débito', number: '5287 3383 1025 3304', code: '123' },
]

/** The cardholder name decides what Mercado Pago answers. */
const OUTCOMES = [
  { holder: 'APRO', result: 'Aprobado', tone: 'ok' },
  { holder: 'OTHE', result: 'Rechazado', tone: 'error' },
  { holder: 'FUND', result: 'Sin fondos', tone: 'error' },
  { holder: 'SECU', result: 'Código inválido', tone: 'error' },
  { holder: 'CONT', result: 'En revisión', tone: 'warn' },
] as const

/** Shown only with Mercado Pago's test credentials, so anyone can try a payment (spec 032). */
export function TestCards() {
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (copied === null) return
    const timer = window.setTimeout(() => setCopied(null), 1500)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copy(number: string) {
    try {
      await navigator.clipboard.writeText(number.replace(/\s/g, ''))
      setCopied(number)
    } catch {
      // Without clipboard access the number is still there to type.
    }
  }

  return (
    <details className={styles.panel}>
      <summary className={styles.summary}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M2.5 10h19M6.5 15h4" />
        </svg>
        Tarjetas de prueba
        <span className={styles.chevron} aria-hidden="true" />
      </summary>
      <div className={styles.body}>
        <ul className={styles.cards}>
          {CARDS.map((card) => (
            <li key={card.number} className={styles.card}>
              <span className={styles.brand}>
                {card.brand} <span>{card.kind}</span>
              </span>
              <code className={styles.number}>{card.number}</code>
              <button
                type="button"
                className={styles.copy}
                onClick={() => void copy(card.number)}
                aria-label={`Copiar ${card.brand} ${card.kind} ${card.number}`}
              >
                {copied === card.number ? 'Copiado' : 'Copiar'}
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.shared}>
          Vencimiento <strong>11/30</strong> · Código <strong>123</strong> (Amex{' '}
          <strong>1234</strong>) · DNI <strong>12345678</strong> · cualquier mail que no termine en
          .local
        </p>
        <p className={styles.lead}>El nombre del titular decide el resultado:</p>
        <ul className={styles.outcomes}>
          {OUTCOMES.map((outcome) => (
            <li key={outcome.holder} className={styles[outcome.tone]}>
              <code>{outcome.holder}</code> {outcome.result}
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
