import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { TwoLinesWidget } from '../../cards'
import TwoLinesView from './TwoLinesView'

const widget = (extra: Partial<TwoLinesWidget> = {}): TwoLinesWidget => ({
  kind: 'two-lines',
  f: { m: 2, n: 1 },
  g: { m: -1, n: 7 },
  ...extra,
})

function setup(w: TwoLinesWidget) {
  const view = render(<TwoLinesView widget={w} />)
  const status = () => view.container.querySelector('.two-lines-status')
  const annotations = (selector: string) =>
    [...view.container.querySelectorAll(`${selector} annotation`)].map((a) => a.textContent)
  return { view, status, annotations }
}

describe('TwoLinesView', () => {
  it('draws f, g and the intersection point with both equations', () => {
    const { status, annotations } = setup(widget())
    expect(screen.getByRole('group', { name: /^Geraden f und g\. Koordinatensystem/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x + 1' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade g(x) = −x + 7' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Schnittpunkt S(2|5)' })).toBeInTheDocument()
    expect(annotations('.two-lines-equations')).toEqual(['f(x) = 2x + 1', 'g(x) = -x + 7'])
    expect(annotations('.two-lines-status')).toEqual(['S(2 \\mid 5)'])
    expect(status()).toHaveTextContent(/^Schnittpunkt:/)
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.queryByText(/Gleichsetzen/)).not.toBeInTheDocument()
  })

  it('moves g with the sliders and names the result in their value text', () => {
    const { status, annotations } = setup(widget({ vary: 'both', equate: true }))
    expect(annotations('.two-lines-equate')).toEqual(['2x + 1 = -x + 7', '\\mathbb{L} = \\{2\\}'])
    const n = screen.getByRole('slider', { name: 'y-Achsenabschnitt n von g' })
    fireEvent.change(n, { target: { value: '3' } })
    expect(n).toHaveAttribute('aria-valuetext', 'n = 3, g(x) = −x + 3; Schnittpunkt S(2/3|7/3)')
    expect(screen.getByRole('img', { name: 'Schnittpunkt S(2/3|7/3)' })).toBeInTheDocument()
    expect(annotations('.two-lines-status')[0]).toContain('\\frac{2}{3}')

    const m = screen.getByRole('slider', { name: 'Steigung m von g' })
    fireEvent.change(m, { target: { value: '2' } })
    expect(m).toHaveAttribute('aria-valuetext', 'm = 2, g(x) = 2x + 3; parallel, kein Schnittpunkt')
    expect(screen.queryByRole('img', { name: /^Schnittpunkt/ })).not.toBeInTheDocument()
    expect(status()).toHaveTextContent('Sie sind parallel und haben keinen Schnittpunkt.')
    expect(annotations('.two-lines-equate')).toEqual(['2x + 1 = 2x + 3', '\\mathbb{L} = \\{\\,\\}'])
  })

  it('shows identical lines as one line f = g with g dashed on top', () => {
    const { view, status } = setup(widget({ g: { m: 2, n: -3 }, vary: 'n' }))
    expect(screen.getByText('Steigung m von g = 2 (fest)')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'y-Achsenabschnitt n von g' }), { target: { value: '1' } })
    expect(screen.getByRole('img', { name: 'Gerade f = g(x) = 2x + 1' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /^Gerade g/ })).not.toBeInTheDocument()
    expect(view.container.querySelector('.plane-line.is-dashed[aria-hidden="true"]')).toBeInTheDocument()
    expect(status()).toHaveTextContent('f und g sind identisch: Alle Punkte sind gemeinsam.')
  })

  it('shows g as written when it is given as a term', () => {
    const { annotations } = setup(widget({ g: '2(x + 1) - 1', equate: true }))
    const [f, g] = annotations('.two-lines-equations')
    expect(f).toBe('f(x) = 2x + 1')
    expect(g).toMatch(/^g\(x\) = 2/)
    expect(g).toContain('(x + 1)')
    expect(annotations('.two-lines-equate')[1]).toBe('\\mathbb{L} = \\mathbb{Q}')
  })

  it('says so when S leaves the window', () => {
    const { status } = setup(widget({ g: { m: 1, n: 0 }, vary: 'n' }))
    fireEvent.change(screen.getByRole('slider', { name: 'y-Achsenabschnitt n von g' }), { target: { value: '8' } })
    expect(screen.queryByRole('img', { name: /^Schnittpunkt/ })).not.toBeInTheDocument()
    expect(status()).toHaveTextContent('S liegt außerhalb des sichtbaren Bereichs.')
  })
})
