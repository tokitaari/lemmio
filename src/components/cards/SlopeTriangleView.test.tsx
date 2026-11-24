import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { SlopeTriangleWidget } from '../../cards'
import SlopeTriangleView from './SlopeTriangleView'

const fixed: SlopeTriangleWidget = { kind: 'slope-triangle', m: 2, n: -1, at: 1 }
const resizable: SlopeTriangleWidget = { kind: 'slope-triangle', m: -1, n: 3, at: 0, run: 2, resizable: true }

function setup(widget: SlopeTriangleWidget) {
  const user = userEvent.setup()
  const view = render(<SlopeTriangleView widget={widget} />)
  const live = () => view.container.querySelector('.plane [aria-live="polite"]')
  const slider = (name: string) => screen.getByRole('slider', { name: `Punkt ${name}` })
  const triangle = () => view.container.querySelector('.slope-triangle')
  return { user, view, live, slider, triangle }
}

describe('SlopeTriangleView', () => {
  it('draws the triangle from P to Q with the legs "rechts" and "hoch"', () => {
    const { view, triangle } = setup(fixed)
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x − 1' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Steigungsdreieck: rechts 1, hoch 2' })).toBe(triangle())
    expect(screen.getByRole('img', { name: 'Punkt Q: x = 2, y = 3' })).toBeInTheDocument()
    const labels = [...view.container.querySelectorAll('.slope-label')].map((t) => t.textContent)
    expect(labels).toEqual(['rechts 1', 'hoch 2'])
    expect(view.container.querySelector('.slope-calc')).toHaveTextContent(/hoch/)
  })

  it('moves the fixed triangle along the line and stops before Q leaves the window', async () => {
    const { user, live, slider, triangle } = setup(fixed)
    expect(slider('P')).toHaveAttribute('aria-valuemin', '-3')
    expect(slider('P')).toHaveAttribute('aria-valuemax', '3')
    act(() => slider('P').focus())
    await user.keyboard('{ArrowRight}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = 3')
    expect(screen.getByRole('img', { name: 'Punkt Q: x = 3, y = 5' })).toBeInTheDocument()
    expect(live()).toHaveTextContent('P: x = 2, y = 3. rechts 1, hoch 2, m = 2')
    await user.keyboard('{End}')
    expect(screen.getByRole('img', { name: 'Punkt Q: x = 4, y = 7' })).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(live()).toHaveTextContent('P: Rand erreicht')
    expect(triangle()).toHaveAttribute('aria-label', 'Steigungsdreieck: rechts 1, hoch 2')
  })

  it('changes the size of a resizable triangle but not the slope', async () => {
    const { user, live, slider, triangle } = setup(resizable)
    expect(triangle()).toHaveAttribute('aria-label', 'Steigungsdreieck: rechts 2, hoch −2')
    act(() => slider('Q').focus())
    await user.keyboard('{ArrowRight}')
    expect(triangle()).toHaveAttribute('aria-label', 'Steigungsdreieck: rechts 3, hoch −3')
    expect(live()).toHaveTextContent('Q: x = 3, y = 0. rechts 3, hoch −3, m = −1')
    // P passes Q: the triangle now starts at Q.
    act(() => slider('P').focus())
    await user.keyboard('{End}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 8, y = −5')
    expect(triangle()).toHaveAttribute('aria-label', 'Steigungsdreieck: rechts 5, hoch −5')
  })
})
