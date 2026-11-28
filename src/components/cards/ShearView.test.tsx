import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { HEIGHT_OUTSIDE_NOTE, SHEAR_COMPARE, SHEAR_HINT, SHEAR_RECTANGLE, SHEAR_RIGHT_TRIANGLE, type ShearWidget } from '../../cards'
import ShearView from './ShearView'

const parallelogram: ShearWidget = {
  kind: 'shear',
  shape: 'parallelogram',
  vertices: [
    [2, 2],
    [8, 2],
    [10, 6],
    [4, 6],
  ],
}

const triangle: ShearWidget = {
  kind: 'shear',
  shape: 'triangle',
  vertices: [
    [2, 2],
    [8, 2],
    [5, 7],
  ],
}

function setup(w: ShearWidget) {
  const user = userEvent.setup()
  const view = render(<ShearView widget={w} />)
  const live = () => view.container.querySelector('.plane [aria-live="polite"]')
  const status = () => view.container.querySelector('.line-status')
  const slider = (name: string) => screen.getByRole('slider', { name: `Punkt ${name}` })
  return { user, view, live, status, slider }
}

describe('ShearView', () => {
  it('draws the figure with only the top vertex movable, the parallel and the rectangle for comparison', () => {
    const { view, status } = setup(parallelogram)
    expect(screen.getByRole('group', { name: /^Parallelogramm scheren\. Gitter, 12 mal 10 Kästchen/ })).toBeInTheDocument()
    expect(screen.getAllByRole('slider').map((s) => s.getAttribute('aria-label'))).toEqual(['Punkt D'])
    expect(screen.getByRole('slider', { name: 'Punkt D' })).toHaveAttribute('aria-orientation', 'horizontal')
    expect(screen.getByRole('img', { name: 'Parallele zu AB durch D' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: SHEAR_COMPARE })).toBeInTheDocument()
    expect(screen.getByText(SHEAR_HINT.parallelogram)).toBeInTheDocument()
    expect(view.container.querySelector('.shape-values')).toHaveTextContent('g = 6 cmh = 4 cm')
    expect(view.container.querySelector('.shape-formula .katex')).not.toBeNull()
    expect(status()).toHaveTextContent('A = 24 cm², wie am Anfang.')
  })

  it('shears D to a rectangle with the keyboard; C follows and the area stays', async () => {
    const { user, live, status, slider } = setup(parallelogram)
    act(() => slider('D').focus())
    await user.keyboard('{ArrowLeft}')
    expect(slider('D')).toHaveAttribute('aria-valuetext', 'x = 3, y = 6')
    expect(screen.getByRole('img', { name: 'Punkt C: x = 9, y = 6' })).toBeInTheDocument()
    expect(live()).toHaveTextContent('D: x = 3, y = 6. g = 6 cm, h = 4 cm, A = 24 cm². Der Flächeninhalt bleibt gleich.')
    await user.keyboard('{ArrowLeft}')
    expect(status()).toHaveTextContent(SHEAR_RECTANGLE)
    expect(status()).toHaveClass('is-done')
    expect(live()).toHaveTextContent(SHEAR_RECTANGLE)
  })

  it('keeps C inside the grid and notes a height outside', async () => {
    const { user, live, slider } = setup(parallelogram)
    act(() => slider('D').focus())
    await user.keyboard('{End}')
    expect(slider('D')).toHaveAttribute('aria-valuetext', 'x = 6, y = 6')
    expect(screen.getByRole('img', { name: 'Punkt C: x = 12, y = 6' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(live()).toHaveTextContent('D: Grenze erreicht')
    await user.keyboard('{Home}')
    expect(slider('D')).toHaveAttribute('aria-valuetext', 'x = 0, y = 6')
    expect(screen.getByText(HEIGHT_OUTSIDE_NOTE)).toBeInTheDocument()
  })

  it('slides the apex of a triangle along the parallel, without a rectangle', async () => {
    const { user, status, slider } = setup(triangle)
    expect(screen.getByRole('img', { name: 'Parallele zu AB durch C' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: SHEAR_COMPARE })).toBeNull()
    expect(status()).toHaveTextContent('A = 15 cm², wie am Anfang.')
    act(() => slider('C').focus())
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}')
    expect(slider('C')).toHaveAttribute('aria-valuetext', 'x = 2, y = 7')
    expect(status()).toHaveTextContent(SHEAR_RIGHT_TRIANGLE)
  })
})
