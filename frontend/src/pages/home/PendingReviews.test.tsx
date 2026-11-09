import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Account } from '../../api/session'
import { renderWithProviders } from '../../test/renderWithProviders'
import { PendingReviews } from './PendingReviews'

const api = vi.hoisted(() => ({
  fetchPendingReviews: vi.fn(),
  publishReview: vi.fn(),
}))

vi.mock('../../api/reviews', () => api)

const VERIFIED = {
  rol: 'diner',
  email: 'mateo@example.com',
  email_verificado: true,
} as unknown as Account
const UNVERIFIED = { ...VERIFIED, email_verificado: false } as unknown as Account

const RESERVATION = {
  reservation_id: 'reservation-1',
  restaurant_id: 'restaurant-1',
  restaurant_name: 'La Esquina',
  date: '2026-11-02',
  start_time: '21:00',
  party_size: 2,
  hidden_by_later_visit: false,
  replaces_earlier_review: false,
}
const SPEND_LABEL = '¿Cuánto gastaste por persona? (opcional)'

function pendingWith(reservations = [RESERVATION]) {
  api.fetchPendingReviews.mockResolvedValue({ author: 'Mateo A.', reservations })
}

async function openForm() {
  renderWithProviders(<PendingReviews account={VERIFIED} />)
  fireEvent.click(await screen.findByRole('button', { name: /^Dejar reseña de La Esquina/ }))
}

function chooseStars(count: number) {
  const name = count === 1 ? '1 estrella' : `${count} estrellas`
  fireEvent.click(screen.getByRole('radio', { name }))
}

const review = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

/** Publishes as someone who read the preview, past the time that counts as a double tap. */
function publish() {
  const later = Date.now() + 1000
  vi.spyOn(Date, 'now').mockReturnValue(later)
  fireEvent.click(screen.getByRole('button', { name: /Publicar/ }))
}

describe('PendingReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pendingWith()
    api.publishReview.mockResolvedValue(null)
    HTMLDialogElement.prototype.showModal ??= vi.fn(function (this: HTMLDialogElement) {
      this.open = true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('US-27 S1 shows the finished reservation in «¿Cómo estuvo?»', async () => {
    renderWithProviders(<PendingReviews account={VERIFIED} />)

    expect(await screen.findByRole('heading', { name: '¿Cómo estuvo?' })).toBeInTheDocument()
    expect(screen.getByText('La Esquina')).toBeInTheDocument()
    expect(screen.getByText(/2 de noviembre · 21:00/)).toBeInTheDocument()
  })

  it('US-27 S1 hides the block when nothing is pending', async () => {
    pendingWith([])
    renderWithProviders(<PendingReviews account={VERIFIED} />)

    await waitFor(() => expect(api.fetchPendingReviews).toHaveBeenCalled())
    expect(screen.queryByRole('heading', { name: '¿Cómo estuvo?' })).not.toBeInTheDocument()
  })

  it('US-27 S2 publishes the stars and confirms it', async () => {
    await openForm()
    chooseStars(4)
    review()
    publish()

    await waitFor(() =>
      expect(api.publishReview).toHaveBeenCalledWith('reservation-1', {
        rating: 4,
        comment: null,
        spend_per_person: null,
      }),
    )
    const thanks = await screen.findByText(/¡Gracias! Publicamos tu reseña de La Esquina/)
    expect(thanks.closest('[role="status"]')).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Ver el restaurante' })).toHaveAttribute(
      'href',
      '/restaurantes/restaurant-1',
    )
    expect(api.fetchPendingReviews.mock.calls.length).toBeGreaterThan(1)
  })

  it('US-27 S3 asks for a rating before moving on', async () => {
    await openForm()
    review()

    expect(screen.getByRole('alert')).toHaveTextContent('Elegí una calificación')
    expect(screen.queryByText('Así se va a ver')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '1 estrella' })).toHaveFocus()
    expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('radiogroup')).toHaveAccessibleDescription(/Elegí una calificación/)

    chooseStars(4)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('4 de 5')).toBeInTheDocument()
  })

  it('US-27 S6 says the time is up when the form was open', async () => {
    api.publishReview.mockResolvedValue({
      kind: 'conflict',
      message: 'Esta reserva ya no se puede calificar.',
    })
    await openForm()
    chooseStars(5)
    review()
    publish()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esta reserva ya no se puede calificar.',
    )
  })

  it('US-27 S8 says it was already published, and refreshes the list', async () => {
    api.publishReview.mockResolvedValue({
      kind: 'conflict',
      message: 'Ya publicaste la reseña de esta reserva.',
    })
    await openForm()
    chooseStars(5)
    review()
    publish()

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya publicaste')
    await waitFor(() => expect(api.fetchPendingReviews.mock.calls.length).toBeGreaterThan(1))
  })

  it('US-27 S9 offers no way to change what was published', async () => {
    await openForm()
    chooseStars(5)
    review()
    publish()

    await screen.findByText(/¡Gracias!/)
    expect(screen.queryByRole('button', { name: /editar|borrar/i })).not.toBeInTheDocument()
  })

  it('US-27 S10 asks an unverified diner to verify, without the form', async () => {
    renderWithProviders(<PendingReviews account={UNVERIFIED} />)

    expect(await screen.findByText(/verificá tu email/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dejar reseña/ })).not.toBeInTheDocument()
  })

  it('US-50 S2 asks for the spend, and warns that it is published', async () => {
    await openForm()

    const spend = screen.getByLabelText(SPEND_LABEL)
    expect(spend).toHaveAccessibleDescription(/se publica en tu reseña/)
  })

  it('US-50 S3 shows the review as it will look, and warns that it is final', async () => {
    await openForm()
    chooseStars(5)
    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: '  Muy rico.  ' },
    })
    fireEvent.change(screen.getByLabelText(SPEND_LABEL), {
      target: { value: '$25.000' },
    })
    review()

    expect(screen.getByRole('heading', { name: 'Así se va a ver' })).toHaveFocus()
    const preview = within(screen.getByRole('article'))
    expect(preview.getByText('Mateo A.')).toBeInTheDocument()
    expect(preview.getByText('Muy rico.')).toBeInTheDocument()
    expect(preview.getByRole('img', { name: '5 de 5 estrellas' })).toBeInTheDocument()
    expect(preview.getByText(/Visitó el .*2 de noviembre/)).toBeInTheDocument()
    expect(preview.getByText(/\$\s?25\.000 por persona/)).toBeInTheDocument()
    expect(screen.getByText('Todavía no se publicó.')).toBeInTheDocument()
    expect(screen.getByText(/Es definitiva/)).toBeInTheDocument()
    expect(screen.getByText(/con el monto que gastaste/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publicar' })).toHaveAccessibleDescription(
      /Es definitiva/,
    )
    expect(api.publishReview).not.toHaveBeenCalled()
  })

  it('US-50 S3 explains that a review without comment is not listed', async () => {
    await openForm()
    chooseStars(5)
    review()

    expect(screen.getByText(/no aparece en Opiniones/)).toBeInTheDocument()
  })

  it('US-50 S4 goes back with what was written, having published nothing', async () => {
    await openForm()
    chooseStars(3)
    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: 'Rico.' },
    })
    review()
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }))

    expect(screen.getByLabelText('Tu comentario (opcional)')).toHaveValue('Rico.')
    expect(screen.getByRole('radio', { name: '3 estrellas' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '3 estrellas' })).toHaveFocus()
    expect(api.publishReview).not.toHaveBeenCalled()
  })

  it('US-50 S5 publishes once while the first request is running', async () => {
    let finish: (value: null) => void = () => {}
    api.publishReview.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    await openForm()
    chooseStars(5)
    review()
    publish()
    fireEvent.click(screen.getByRole('button', { name: /Publicar/ }))

    expect(api.publishReview).toHaveBeenCalledTimes(1)
    finish(null)
    await screen.findByText(/¡Gracias!/)
  })

  it('US-50 S6 sends blank comment and spend as nothing', async () => {
    await openForm()
    chooseStars(2)
    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: '    ' },
    })
    review()
    publish()

    await waitFor(() =>
      expect(api.publishReview).toHaveBeenCalledWith('reservation-1', {
        rating: 2,
        comment: null,
        spend_per_person: null,
      }),
    )
  })

  it.each(['0', '-5', '25,50', 'mucho', '1000001', '1.000.001', '25.00'])(
    'US-50 S7 refuses %s as a spend',
    async (spend) => {
      await openForm()
      chooseStars(5)
      const field = screen.getByLabelText(SPEND_LABEL)
      fireEvent.change(field, { target: { value: spend } })
      review()

      expect(screen.getByRole('alert')).toHaveTextContent('pesos enteros')
      expect(field).toHaveFocus()
      expect(screen.queryByText('Así se va a ver')).not.toBeInTheDocument()

      fireEvent.change(field, { target: { value: '25000' } })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    },
  )

  it('US-50 S7 refuses a comment over 500 characters', async () => {
    await openForm()
    chooseStars(5)
    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: 'a'.repeat(501) },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('hasta 500 caracteres')

    review()
    expect(screen.queryByText('Así se va a ver')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: 'a'.repeat(500) },
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps what was written when the connection fails', async () => {
    api.publishReview.mockRejectedValue(new TypeError('Failed to fetch'))
    await openForm()
    chooseStars(5)
    review()
    publish()

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectarnos')
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })

  it('US-50 S5 ignores the second tap of a double tap on «Continuar»', async () => {
    await openForm()
    chooseStars(5)
    review()
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))

    expect(api.publishReview).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled()
  })

  it('US-50 S9 warns that the new review hides the earlier one', async () => {
    pendingWith([{ ...RESERVATION, replaces_earlier_review: true }])
    await openForm()
    chooseStars(5)
    review()

    expect(screen.getByText(/Tu reseña anterior de este local deja de verse/)).toBeInTheDocument()
  })

  it('US-50 S10 says that the review of an older visit stays private', async () => {
    pendingWith([{ ...RESERVATION, hidden_by_later_visit: true }])
    await openForm()
    expect(screen.getByText(/esta reseña la va a ver solo el restaurante/)).toBeInTheDocument()

    chooseStars(5)
    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: 'Rico.' },
    })
    review()

    expect(
      screen.getByRole('heading', { name: 'Así la va a ver el restaurante' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No aparece en público ni cuenta en el promedio/)).toBeInTheDocument()
    expect(screen.queryByText(/Se va a ver en la página/)).not.toBeInTheDocument()

    publish()
    expect(await screen.findByText(/ya le llegó al restaurante/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver el restaurante' })).not.toBeInTheDocument()
  })

  it('keeps what was written when the form is closed, for each reservation', async () => {
    pendingWith([RESERVATION, { ...RESERVATION, reservation_id: 'reservation-2' }])
    renderWithProviders(<PendingReviews account={VERIFIED} />)
    const [first, second] = await screen.findAllByRole('button', { name: /^Dejar reseña/ })

    fireEvent.click(first)
    fireEvent.change(screen.getByLabelText('Tu comentario (opcional)'), {
      target: { value: 'Rico.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(second)
    expect(screen.getByLabelText('Tu comentario (opcional)')).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: /^Seguir mi reseña/ }))
    expect(screen.getByLabelText('Tu comentario (opcional)')).toHaveValue('Rico.')
  })

  it('reopens on the form, not on the preview', async () => {
    await openForm()
    chooseStars(5)
    review()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    fireEvent.click(screen.getByRole('button', { name: /^Seguir mi reseña/ }))

    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5 estrellas' })).toBeChecked()
  })

  it('offers only to close once the reservation can no longer be reviewed', async () => {
    api.publishReview.mockResolvedValue({
      kind: 'conflict',
      message: 'Ya publicaste la reseña de esta reserva.',
    })
    await openForm()
    chooseStars(5)
    review()
    publish()

    await screen.findByRole('alert')
    expect(screen.queryByRole('button', { name: 'Publicar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument()
  })

  it('explains that the session expired while publishing', async () => {
    api.publishReview.mockResolvedValue({ kind: 'session' })
    await openForm()
    chooseStars(5)
    review()
    publish()

    expect(await screen.findByText(/Tu sesión venció/)).toBeInTheDocument()
  })

  it('says so when the pending reviews fail to load, and can retry', async () => {
    api.fetchPendingReviews.mockRejectedValue(new Error('No pudimos cargar las reseñas.'))
    renderWithProviders(<PendingReviews account={VERIFIED} />)

    expect(await screen.findByRole('alert', {}, { timeout: 15000 })).toHaveTextContent(
      'No pudimos cargar',
    )
    pendingWith()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: '¿Cómo estuvo?' })).toBeInTheDocument()
  }, 20000)
})
