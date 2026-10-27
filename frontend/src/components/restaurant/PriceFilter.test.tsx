import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PriceFilter } from './PriceFilter'
import { matchesPriceFilter, PRICE_TIERS, type PriceTier } from './priceFilterUtils'

function Harness() {
  const [selected, setSelected] = useState<PriceTier[]>([])
  const matches = PRICE_TIERS.filter((tier) => matchesPriceFilter(tier, true, selected))
  return (
    <>
      <PriceFilter selectedTiers={selected} onChange={setSelected} resultCount={matches.length} />
      <output aria-label="Resultados de prueba">{matches.join(',')}</output>
    </>
  )
}

describe('PriceFilter', () => {
  it('US-7 S1 selects multiple categories and immediately communicates matches', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '$' }))
    await user.click(screen.getByRole('button', { name: '$$$$' }))
    expect(screen.getByRole('button', { name: '$' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '$$$$' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Resultados de prueba')).toHaveTextContent(/^\$,\$\$\$\$$/)
  })

  it('US-7 S2 deselects a category and immediately updates matches', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const first = screen.getByRole('button', { name: '$' })
    await user.click(first)
    await user.click(screen.getByRole('button', { name: '$$' }))
    await user.click(first)
    expect(first).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Resultados de prueba')).toHaveTextContent(/^\$\$$/)
  })

  it('US-7 S3 clears only the price selection and restores all matches', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: '$' }))
    await user.click(screen.getByRole('button', { name: 'Quitar filtro de precio' }))
    expect(screen.getByLabelText('Resultados de prueba')).toHaveTextContent(PRICE_TIERS.join(','))
    expect(screen.getByRole('button', { name: 'Quitar filtro de precio' })).toBeDisabled()
  })

  it('US-7 edge supports keyboard selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PriceFilter selectedTiers={[]} onChange={onChange} />)
    await user.tab()
    await user.keyboard(' ')
    expect(onChange).toHaveBeenCalledWith(['$'])
  })

  it('US-7 edge offers clearing when no restaurants match', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PriceFilter selectedTiers={['$$$$']} onChange={onChange} resultCount={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('No hay restaurantes que coincidan')
    await user.click(screen.getByRole('button', { name: 'Quitar filtro de precio' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('US-7 edge distinguishes an empty source from an active price filter', () => {
    render(<PriceFilter selectedTiers={[]} onChange={vi.fn()} resultCount={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('No hay restaurantes para mostrar.')
  })
})
