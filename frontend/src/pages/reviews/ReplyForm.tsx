import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

import { getRequestErrorMessage } from '../../api/errors'
import { editReply, publishReply } from '../../api/reviews'
import { signOut } from '../../api/session'
import { Button, TextAreaField, useToast } from '../../components/ui'
import styles from './ReplyForm.module.css'

const MAX_REPLY_LENGTH = 500
const EMPTY = 'Escribí tu respuesta.'
const TOO_LONG = `La respuesta puede tener hasta ${MAX_REPLY_LENGTH} caracteres.`
const SAVE_FAILED = 'No pudimos guardar tu respuesta. Probá de nuevo.'
const SESSION_EXPIRED = 'Tu sesión venció. Volvé a ingresar para responder.'

function remainingHint(remaining: number): string {
  if (remaining < 0)
    return `Te pasaste por ${-remaining} ${remaining === -1 ? 'carácter' : 'caracteres'}.`
  return remaining === 1 ? 'Te queda 1 carácter.' : `Te quedan ${remaining} caracteres.`
}

type ReplyFormProps = {
  reviewId: string
  author: string
  /** The published text, when editing the reply. */
  current?: string
  /** Why the form changed under the restaurant, e.g. the review was replied from another tab. */
  notice?: string
  onSaved: () => Promise<void>
  onCancel: () => void
  /** The review already has a reply or left Opiniones: the list must be reloaded. */
  onConflict: (message: string) => Promise<void>
}

/** Writes or edits the restaurant's reply to a review (US-42). It is published at once, without a
 * preview, because it can be edited later (spec 025, C2). */
export function ReplyForm({
  reviewId,
  author,
  current,
  notice,
  onSaved,
  onCancel,
  onConflict,
}: ReplyFormProps) {
  const queryClient = useQueryClient()
  const showToast = useToast()
  const [text, setText] = useState(current ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const editing = current !== undefined
  const clean = text.trim()
  const remaining = MAX_REPLY_LENGTH - clean.length

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    if (!clean) {
      setError(EMPTY)
      return
    }
    if (remaining < 0) return
    setError('')
    setSaving(true)
    try {
      const failure = editing
        ? await editReply(reviewId, clean)
        : await publishReply(reviewId, clean)
      if (failure?.kind === 'session') {
        showToast(SESSION_EXPIRED, { tone: 'error' })
        signOut(queryClient)
        return
      }
      if (failure?.kind === 'conflict') {
        await onConflict(failure.message)
        return
      }
      if (failure) {
        setError(failure.message)
        return
      }
      showToast(editing ? 'Guardamos tu respuesta.' : 'Publicamos tu respuesta.', { tone: 'ok' })
      await onSaved()
    } catch (requestError) {
      setError(getRequestErrorMessage(requestError, SAVE_FAILED))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => void save(event)} noValidate>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <TextAreaField
        label={editing ? `Editá tu respuesta a ${author}` : `Tu respuesta a ${author}`}
        hint={`${remainingHint(remaining)} Se publica en la página del restaurante.`}
        error={remaining < 0 ? TOO_LONG : error}
        value={text}
        rows={4}
        autoFocus
        onChange={(event) => {
          setText(event.target.value)
          setError('')
        }}
      />
      <div className={styles.actions}>
        <Button type="submit" size="sm" loading={saving}>
          {editing ? 'Guardar cambios' : 'Publicar respuesta'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
