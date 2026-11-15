import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../test/renderWithProviders'
import { RestaurantReviewsPage } from './RestaurantReviewsPage'

const api = vi.hoisted(() => ({
  fetchRestaurantReviews: vi.fn(),
  publishReply: vi.fn(),
  editReply: vi.fn(),
}))
const session = vi.hoisted(() => ({
  account: { data: { rol: 'restaurant' } as unknown, isPending: false },
}))

vi.mock('../api/reviews', () => api)
vi.mock('../api/session', () => ({
  useAccount: () => session.account,
  signOut: vi.fn(),
}))

const REVIEW = {
  id: 'review-1',
  author: 'Ana P.',
  visit_date: '2026-11-02',
  visit_time: '21:00',
  rating: 5,
  comment: 'Muy rico.',
  spend_per_person: 25000,
  published_at: '2026-11-03T10:00:00-03:00',
  counts_in_average: true,
  reply: null as null | { text: string; created_at: string; edited_at: string | null },
  can_reply: true,
}

function page(overrides = {}) {
  return {
    rating: 4.5,
    review_count: 3,
    total_reviews: 5,
    price_tier: '$$',
    average_spend_per_person: null,
    spend_people: 0,
    reviews: [REVIEW],
    next_offset: null,
    ...overrides,
  }
}

describe('RestaurantReviewsPage (US-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.account = { data: { rol: 'restaurant' }, isPending: false }
    api.fetchRestaurantReviews.mockResolvedValue(page())
  })

  it('US-24 S1 shows each review with its author, visit, stars, comment and spend', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText('Ana P.')).toBeInTheDocument()
    expect(screen.getByText('Muy rico.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '5 de 5 estrellas' })).toBeInTheDocument()
    expect(screen.getByText(/2 de noviembre a las 21:00/)).toBeInTheDocument()
    expect(screen.getByText(/\$\s?25\.000 por persona/)).toBeInTheDocument()
  })

  it('US-24 S3 shows the average, the people who count and the total', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText('Los comensales ven 4,5 · 3 reseñas.')).toBeInTheDocument()
    expect(screen.getByText(/Recibiste 5 en total/)).toBeInTheDocument()
  })

  it('US-24 S3 marks the older visit that does not count', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ reviews: [REVIEW, { ...REVIEW, id: 'review-2', counts_in_average: false }] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findAllByText(/no cuenta en el promedio/)).toHaveLength(1)
  })

  it('US-7 S5 says where a calculated price tier comes from', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ price_tier: '$$$', average_spend_per_person: 30000, spend_people: 5 }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText(/Tu categoría de precio es \$\$\$/)).toHaveTextContent(
      /gasto medio de 5 comensales, \$\s?30\.000/,
    )
  })

  it('US-7 S4 says nothing about a declared price tier', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    await screen.findByText('Ana P.')
    expect(screen.queryByText(/Tu categoría de precio/)).toBeNull()
  })

  it('US-24 S4 offers no way to change or delete a review', async () => {
    renderWithProviders(<RestaurantReviewsPage />)

    await screen.findByText('Ana P.')
    expect(screen.queryByRole('button', { name: /editar|borrar|eliminar/i })).toBeNull()
  })

  it('US-24 S5 sends a diner home and a visitor to sign in', async () => {
    session.account = { data: { rol: 'diner' }, isPending: false }
    const { unmount } = renderWithProviders(<RestaurantReviewsPage />)
    expect(screen.queryByRole('heading', { name: 'Reseñas' })).toBeNull()
    unmount()

    session.account = { data: null, isPending: false }
    renderWithProviders(<RestaurantReviewsPage />)
    expect(screen.queryByRole('heading', { name: 'Reseñas' })).toBeNull()
    expect(api.fetchRestaurantReviews).not.toHaveBeenCalled()
  })

  it('US-24 S7 explains the empty state', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ rating: null, review_count: 0, total_reviews: 0, reviews: [] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText(/Todavía no tenés reseñas/)).toBeInTheDocument()
  })

  it('US-24 S8 loads the next reviews with «Ver más»', async () => {
    api.fetchRestaurantReviews.mockImplementation(async (offset: number) =>
      offset === 0
        ? page({ next_offset: 20 })
        : page({ reviews: [{ ...REVIEW, id: 'review-2', author: 'Beto' }] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByText('Viendo 1 de 5.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }))

    expect(await screen.findByText('Beto')).toBeInTheDocument()
    expect(screen.getByText('Ana P.')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Ver más' })).toBeNull())
    expect(api.fetchRestaurantReviews).toHaveBeenCalledWith(20)
  })
})

describe('RestaurantReviewsPage (US-42)', () => {
  const REPLY = { text: '¡Gracias, Ana!', created_at: '2026-11-04T10:00:00-03:00', edited_at: null }
  const REPLIED = { ...REVIEW, reply: REPLY, can_reply: false }
  const DISCARD = '¿Descartás tu respuesta?'

  beforeEach(() => {
    vi.clearAllMocks()
    session.account = { data: { rol: 'restaurant' }, isPending: false }
    api.fetchRestaurantReviews.mockResolvedValue(page())
    api.publishReply.mockResolvedValue(null)
    api.editReply.mockResolvedValue(null)
  })

  async function openReply(name: string) {
    renderWithProviders(<RestaurantReviewsPage />)
    fireEvent.click(await screen.findByRole('button', { name }))
  }

  function type(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }

  function discardDialog() {
    return screen.queryByRole('dialog', { name: DISCARD })
  }

  it('US-42 S1 publishes a reply and shows it under the review', async () => {
    await openReply('Responder')
    type('Tu respuesta a Ana P.', '  ¡Gracias, Ana!  ')
    api.fetchRestaurantReviews.mockResolvedValue(page({ reviews: [REPLIED] }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }))

    const reply = await screen.findByRole('group', { name: 'Tu respuesta' })
    expect(api.publishReply).toHaveBeenCalledWith('review-1', '¡Gracias, Ana!')
    expect(reply).toHaveTextContent('¡Gracias, Ana!')
    expect(reply).toHaveTextContent(/Respondió el miércoles, 4 de noviembre/)
    expect(screen.queryByRole('button', { name: 'Responder' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Editar respuesta' })).toHaveFocus()
  })

  it('US-42 S3 offers editing instead of a second reply', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(page({ reviews: [REPLIED] }))
    renderWithProviders(<RestaurantReviewsPage />)

    expect(await screen.findByRole('button', { name: 'Editar respuesta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Responder' })).toBeNull()
  })

  it('US-42 S3 switches to editing the existing reply and keeps what was typed', async () => {
    await openReply('Responder')
    type('Tu respuesta a Ana P.', 'Otra respuesta.')
    const message = 'Esta reseña ya tiene tu respuesta. Podés editarla.'
    api.publishReply.mockResolvedValue({ kind: 'conflict', message })
    api.fetchRestaurantReviews.mockResolvedValue(page({ reviews: [REPLIED] }))
    fireEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }))

    const field = await screen.findByLabelText('Editá tu respuesta a Ana P.')
    expect(field).toHaveValue('¡Gracias, Ana!')
    expect(screen.getByText(message)).toHaveAttribute('role', 'status')
    expect(screen.getByText('Otra respuesta.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Usar lo que escribiste' }))
    expect(field).toHaveValue('Otra respuesta.')
  })

  it('US-42 S4 edits the reply and marks it', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(page({ reviews: [REPLIED] }))
    await openReply('Editar respuesta')
    const field = screen.getByLabelText<HTMLTextAreaElement>('Editá tu respuesta a Ana P.')
    expect(field).toHaveValue('¡Gracias, Ana!')
    expect(field).toHaveFocus()
    expect(field.selectionStart).toBe('¡Gracias, Ana!'.length)

    fireEvent.change(field, { target: { value: 'Gracias por volver.' } })
    const edited = { ...REPLY, text: 'Gracias por volver.', edited_at: '2026-11-05T10:00:00-03:00' }
    api.fetchRestaurantReviews.mockResolvedValue(page({ reviews: [{ ...REPLIED, reply: edited }] }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const reply = await screen.findByRole('group', { name: 'Tu respuesta' })
    expect(api.editReply).toHaveBeenCalledWith('review-1', 'Gracias por volver.')
    expect(reply).toHaveTextContent('Gracias por volver.')
    expect(reply).not.toHaveTextContent('¡Gracias, Ana!')
    expect(reply).toHaveTextContent('Respondió el miércoles, 4 de noviembre · Editada')
    expect(screen.getByRole('button', { name: 'Editar respuesta' })).toHaveFocus()
  })

  it('US-42 S5 counts the remaining characters and refuses an empty or long reply', async () => {
    await openReply('Responder')
    const field = screen.getByLabelText('Tu respuesta a Ana P.')
    expect(field).toHaveAccessibleDescription(/Te quedan 500 caracteres\./)

    fireEvent.change(field, { target: { value: 'Hola' } })
    expect(field).toHaveAccessibleDescription(/Te quedan 496 caracteres\./)

    fireEvent.change(field, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribí tu respuesta.')

    fireEvent.change(field, { target: { value: 'a'.repeat(501) } })
    expect(field).toHaveAccessibleDescription(/Te pasaste por 1 carácter\./)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'La respuesta puede tener hasta 500 caracteres.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }))
    expect(api.publishReply).not.toHaveBeenCalled()
  })

  it('US-42 S5 counts an emoji as one character, as the server does', async () => {
    await openReply('Responder')
    const field = screen.getByLabelText('Tu respuesta a Ana P.')

    fireEvent.change(field, { target: { value: '😀'.repeat(500) } })

    expect(field).toHaveAccessibleDescription(/Te quedan 0 caracteres\./)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('US-42 S5 says a reply can be edited but not emptied', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(page({ reviews: [REPLIED] }))
    await openReply('Editar respuesta')
    type('Editá tu respuesta a Ana P.', '  ')
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La respuesta no puede quedar vacía. Podés editarla, pero no borrarla.',
    )
    expect(api.editReply).not.toHaveBeenCalled()
  })

  it('US-42 S6 cancelling an empty reply closes it and returns the focus', async () => {
    await openReply('Responder')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByLabelText('Tu respuesta a Ana P.')).toBeNull()
    expect(discardDialog()).toBeNull()
    expect(screen.getByRole('button', { name: 'Responder' })).toHaveFocus()
    expect(api.publishReply).not.toHaveBeenCalled()
  })

  it('US-42 S6 asks before discarding what was typed', async () => {
    await openReply('Responder')
    type('Tu respuesta a Ana P.', 'Gracias.')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(discardDialog()).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir escribiendo' }))
    await waitFor(() => expect(discardDialog()).toBeNull())
    expect(screen.getByLabelText('Tu respuesta a Ana P.')).toHaveValue('Gracias.')

    fireEvent.keyDown(screen.getByLabelText('Tu respuesta a Ana P.'), { key: 'Escape' })
    expect(discardDialog()).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    await waitFor(() => expect(screen.queryByLabelText('Tu respuesta a Ana P.')).toBeNull())
    expect(screen.getByRole('button', { name: 'Responder' })).toHaveFocus()
    expect(screen.queryByRole('group', { name: 'Tu respuesta' })).toBeNull()
    expect(api.publishReply).not.toHaveBeenCalled()
  })

  it('US-42 S6 asks before leaving a draft to answer another review', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ reviews: [REVIEW, { ...REVIEW, id: 'review-2', author: 'Beto' }] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)
    const [first] = await screen.findAllByRole('button', { name: 'Responder' })
    fireEvent.click(first)
    type('Tu respuesta a Ana P.', 'Gracias.')

    fireEvent.click(screen.getByRole('button', { name: 'Responder' }))
    expect(discardDialog()).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(await screen.findByLabelText('Tu respuesta a Beto')).toHaveFocus()
    expect(screen.queryByLabelText('Tu respuesta a Ana P.')).toBeNull()
  })

  it('US-42 S7 offers no reply on a review that is not public', async () => {
    api.fetchRestaurantReviews.mockResolvedValue(
      page({ reviews: [{ ...REVIEW, comment: null, can_reply: false }] }),
    )
    renderWithProviders(<RestaurantReviewsPage />)

    await screen.findByText('Ana P.')
    expect(screen.queryByRole('button', { name: /Responder|Editar respuesta/ })).toBeNull()
  })
})
