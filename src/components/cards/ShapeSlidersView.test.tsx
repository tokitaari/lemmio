import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Deck, ShapeSlidersWidget } from '../../cards'
import CardDeck from './CardDeck'
import ShapeSlidersView from './ShapeSlidersView'

const parallelogram: ShapeSlidersWidget = {
  kind: 'shape-sliders',
  shape: 'parallelogram',
  measures: { g: { value: 6, min: 2, max: 10 }, h: 4 },
}

beforeEach(() => {
  localStorage.clear()
})

describe('ShapeSlidersView', () => {
  it('draws the figure with a slider for each length that varies', () => {
    const { container } = render(<ShapeSlidersView widget={parallelogram} />)
    expect(
      screen.getByRole('img', { name: 'Figur mit Schiebereglern. Parallelogramm ABCD: Grundseite g = 6 cm, Höhe h = 4 cm.' }),
    ).toBeInTheDocument()
    const g = screen.getByRole('slider', { name: 'Grundseite g' })
    expect(g).toHaveAttribute('min', '2')
    expect(g).toHaveAttribute('max', '10')
    expect(g).toHaveAttribute('step', '0.5')
    expect(g).toHaveAttribute('aria-valuetext', 'g = 6 cm, A = 24 cm²')
    expect(screen.getAllByRole('slider')).toHaveLength(1)
    expect(screen.getByText('Höhe h = 4 cm (fest)')).toBeInTheDocument()
    expect(container.querySelector('.shape-formula .katex')).not.toBeNull()
  })

  it('follows a slider with the figure, the value and the result, inside a fixed frame', () => {
    const { container } = render(<ShapeSlidersView widget={parallelogram} />)
    const viewBox = () => container.querySelector('svg.shape-svg')?.getAttribute('viewBox')
    const before = viewBox()
    const g = screen.getByRole('slider', { name: 'Grundseite g' })
    fireEvent.change(g, { target: { value: '6.5' } })
    expect(screen.getByRole('img', { name: /Grundseite g = 6,5 cm, Höhe h = 4 cm\.$/ })).toBeInTheDocument()
    expect(g).toHaveAttribute('aria-valuetext', 'g = 6,5 cm, A = 26 cm²')
    expect(container.querySelector('.line-slider-value')).toHaveTextContent('6,5 cm')
    fireEvent.change(g, { target: { value: '10' } })
    expect(g).toHaveAttribute('aria-valuetext', 'g = 10 cm, A = 40 cm²')
    expect(viewBox()).toBe(before)
  })

  it('shows the perimeter with all sides', () => {
    render(
      <ShapeSlidersView
        widget={{ kind: 'shape-sliders', shape: 'rhombus', quantity: 'perimeter', measures: { a: { value: 3, min: 2, max: 6 } }, label: 'Raute' }}
      />,
    )
    expect(screen.getByRole('img', { name: 'Raute. Raute ABCD: Seite a = 3 cm.' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Seite a' })).toHaveAttribute('aria-valuetext', 'a = 3 cm, u = 12 cm')
  })

  it('keeps the card when arrow keys are used on a slider', () => {
    const deck: Deck = {
      id: 'test/figur/a',
      cards: [
        { id: 'regler', title: 'Regler', body: ['Text'], widget: parallelogram },
        { id: 'zwei', title: 'Zwei', body: ['Text'] },
      ],
    }
    render(<CardDeck deck={deck} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Grundseite g' }), { key: 'ArrowRight' })
    expect(screen.getByText('Karte 1 von 2')).toBeInTheDocument()
  })
})
