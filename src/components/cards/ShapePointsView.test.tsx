import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HEIGHT_OUTSIDE_NOTE, SHAPE_POINTS_HINT, type ShapePointsWidget } from '../../cards'
import ShapePointsView from './ShapePointsView'

const parallelogram: ShapePointsWidget = {
  kind: 'shape-points',
  shape: 'parallelogram',
  vertices: [
    [2, 2],
    [7, 2],
    [9, 5],
    [4, 5],
  ],
}

const triangle: ShapePointsWidget = {
  kind: 'shape-points',
  shape: 'triangle',
  vertices: [
    [2, 2],
    [8, 2],
    [4, 6],
  ],
  target: 15,
}

function setup(w: ShapePointsWidget) {
  const user = userEvent.setup()
  const view = render(<ShapePointsView widget={w} />)
  const live = () => view.container.querySelector('.plane [aria-live="polite"]')
  const slider = (name: string) => screen.getByRole('slider', { name: `Punkt ${name}` })
  return { user, view, live, slider }
}

describe('ShapePointsView', () => {
  it('draws the figure on a grid without axes, with the movable vertices as sliders', () => {
    const { view } = setup(parallelogram)
    expect(screen.getByRole('group', { name: /^Parallelogramm mit ziehbaren Ecken\. Gitter, 12 mal 10 Kästchen/ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Parallelogramm ABCD mit A(2|2), B(7|2), C(9|5), D(4|5)' })).toBeInTheDocument()
    expect(screen.getAllByRole('slider').map((s) => s.getAttribute('aria-label'))).toEqual(['Punkt B', 'Punkt D'])
    expect(screen.getByRole('img', { name: 'Punkt A: x = 2, y = 2' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Punkt C: x = 9, y = 5' })).toBeInTheDocument()
    expect(screen.getByText(SHAPE_POINTS_HINT.parallelogram)).toBeInTheDocument()
    expect(view.container.querySelector('.shape-values')).toHaveTextContent('g = 5 cmh = 3 cm')
    expect(view.container.querySelector('.shape-formula .katex')).not.toBeNull()
    // Height and labels are drawn above the polygon, hidden from assistive technology.
    expect(view.container.querySelector('.shape-drawing')).toHaveAttribute('aria-hidden', 'true')
    expect(view.container.querySelector('.shape-height-line')).not.toBeNull()
  })

  it('moves D with the keyboard, lets C follow and announces lengths and area', async () => {
    const { user, live, slider } = setup(parallelogram)
    act(() => slider('D').focus())
    await user.keyboard('{ArrowUp}')
    expect(slider('D')).toHaveAttribute('aria-valuetext', 'x = 4, y = 6')
    expect(screen.getByRole('img', { name: 'Punkt C: x = 9, y = 6' })).toBeInTheDocument()
    expect(live()).toHaveTextContent('D: x = 4, y = 6. g = 5 cm, h = 4 cm, A = 20 cm².')
  })

  it('stops D above AB and says so', async () => {
    const { user, live, slider } = setup(parallelogram)
    act(() => slider('D').focus())
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(slider('D')).toHaveAttribute('aria-valuetext', 'x = 4, y = 3')
    await user.keyboard('{ArrowDown}')
    expect(slider('D')).toHaveAttribute('aria-valuetext', 'x = 4, y = 3')
    expect(live()).toHaveTextContent('D: Grenze erreicht')
  })

  it('shows the target and when it is reached, and notes a height outside', async () => {
    const { user, view, live, slider } = setup(triangle)
    const status = () => view.container.querySelector('.line-status')
    expect(status()).toHaveTextContent('Ziel: Bringe den Flächeninhalt auf 15 cm².')
    act(() => slider('C').focus())
    await user.keyboard('{ArrowUp}')
    expect(status()).toHaveTextContent('Geschafft: A = 15 cm².')
    expect(status()).toHaveClass('is-done')
    expect(live()).toHaveTextContent('C: x = 4, y = 7. g = 6 cm, h = 5 cm, A = 15 cm². Geschafft: A = 15 cm².')
    expect(screen.queryByText(HEIGHT_OUTSIDE_NOTE)).toBeNull()
    await user.keyboard('{End}')
    expect(slider('C')).toHaveAttribute('aria-valuetext', 'x = 12, y = 7')
    expect(screen.getByText(HEIGHT_OUTSIDE_NOTE)).toBeInTheDocument()
    expect(view.container.querySelector('.shape-extension')).not.toBeNull()
  })

  it('mirrors A when C of a rhombus moves', async () => {
    const { user, slider } = setup({
      kind: 'shape-points',
      shape: 'rhombus',
      vertices: [
        [3, 5],
        [6, 3],
        [9, 5],
        [6, 7],
      ],
    })
    act(() => slider('C').focus())
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('img', { name: 'Raute ABCD mit A(2|5), B(6|3), C(10|5), D(6|7)' })).toBeInTheDocument()
    expect(screen.getAllByRole('slider').map((s) => s.getAttribute('aria-label'))).toEqual(['Punkt C', 'Punkt D'])
  })
})
