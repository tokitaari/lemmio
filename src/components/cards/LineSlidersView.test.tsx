import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { TARGET_HINT, TARGET_REACHED, type Deck, type LineSlidersWidget } from '../../cards'
import CardDeck from './CardDeck'
import LineSlidersView from './LineSlidersView'

const both: LineSlidersWidget = { kind: 'line-sliders', m: { value: 2 }, n: { value: -3 } }
const onlyN: LineSlidersWidget = { kind: 'line-sliders', m: { value: -2 }, n: { value: 4 }, vary: 'n', target: { m: -2, n: -1 }, name: 'g' }

beforeEach(() => {
  localStorage.clear()
})

function setup(widget: LineSlidersWidget) {
  const view = render(<LineSlidersView widget={widget} />)
  const own = () => view.container.querySelector('.line-widget > [aria-live="polite"]')
  const status = () => view.container.querySelector('.line-status')
  return { view, own, status }
}

describe('LineSlidersView', () => {
  it('draws the line with the point (0|n) and offers a slider for m and n', () => {
    setup(both)
    expect(screen.getByRole('group', { name: /^Gerade mit Schiebereglern\. Koordinatensystem/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x − 3' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Punkt n: x = 0, y = −3' })).toBeInTheDocument()
    const m = screen.getByRole('slider', { name: 'Steigung m' })
    expect(m).toHaveAttribute('min', '-4')
    expect(m).toHaveAttribute('max', '4')
    expect((m as HTMLInputElement).value).toBe('2')
    expect(m).toHaveAttribute('aria-valuetext', 'm = 2, f(x) = 2x − 3')
    const n = screen.getByRole('slider', { name: 'y-Achsenabschnitt n' })
    expect(n).toHaveAttribute('min', '-8')
    expect(n).toHaveAttribute('max', '8')
  })

  it('follows the sliders with the line, the point and the value texts', () => {
    setup(both)
    fireEvent.change(screen.getByRole('slider', { name: 'Steigung m' }), { target: { value: '-1' } })
    expect(screen.getByRole('img', { name: 'Gerade f(x) = −x − 3' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'y-Achsenabschnitt n' }), { target: { value: '0' } })
    expect(screen.getByRole('img', { name: 'Gerade f(x) = −x' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Punkt n: x = 0, y = 0' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'y-Achsenabschnitt n' })).toHaveAttribute('aria-valuetext', 'n = 0, f(x) = −x')
    expect(screen.getByRole('slider', { name: 'Steigung m' })).toHaveAttribute('aria-valuetext', 'm = −1, f(x) = −x')
  })

  it('shows only the slider that varies and the fixed value as text', () => {
    setup(onlyN)
    expect(screen.getAllByRole('slider')).toHaveLength(1)
    expect(screen.getByText('Steigung m = −2 (fest)')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade g(x) = −2x + 4' })).toBeInTheDocument()
  })

  it('draws the target dashed and announces when it is reached', () => {
    const { own, status } = setup(onlyN)
    expect(screen.getByRole('img', { name: 'Gerade y = −2x − 1' })).toBeInTheDocument()
    expect(status()).toHaveTextContent(TARGET_HINT)
    expect(own()).toBeEmptyDOMElement()
    fireEvent.change(screen.getByRole('slider', { name: 'y-Achsenabschnitt n' }), { target: { value: '-1' } })
    expect(status()).toHaveTextContent(TARGET_REACHED)
    expect(status()).toHaveClass('is-done')
    expect(own()).toHaveTextContent(TARGET_REACHED)
    fireEvent.change(screen.getByRole('slider', { name: 'y-Achsenabschnitt n' }), { target: { value: '0' } })
    expect(own()).toBeEmptyDOMElement()
  })

  it('keeps the card when arrow keys are used on a slider', () => {
    const deck: Deck = {
      id: 'test/regler/a',
      cards: [
        { id: 'regler', title: 'Regler', body: ['Text'], widget: both },
        { id: 'zwei', title: 'Zwei', body: ['Text'] },
      ],
    }
    render(<CardDeck deck={deck} />)
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Steigung m' }), { key: 'ArrowRight' })
    expect(screen.getByText('Karte 1 von 2')).toBeInTheDocument()
  })
})
