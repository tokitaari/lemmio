import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DecomposeWidget } from '../../cards'
import { DURATION } from '../../motion'
import { mockReducedMotion } from '../../test/matchMedia'
import DecomposeView from './DecomposeView'

const parallelogram: DecomposeWidget = { kind: 'decompose', shape: 'parallelogram', measures: { g: 6.5, h: 4 }, offset: 2 }
const triangle: DecomposeWidget = { kind: 'decompose', shape: 'triangle', measures: { g: 6, h: 4 } }
const rhombus: DecomposeWidget = { kind: 'decompose', shape: 'rhombus', measures: { e: 6, f: 4 } }

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
  Reflect.deleteProperty(Element.prototype, 'animate')
  vi.restoreAllMocks()
})

/** jsdom has no Web Animations API; this records every call. */
function recordAnimations() {
  const calls = vi.fn((keyframes: Keyframe[], options: KeyframeAnimationOptions) => ({
    keyframes,
    options,
    finished: Promise.resolve(),
    cancel: () => {},
  }))
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      return calls(keyframes, options)
    },
  })
  return calls
}

function setup(w: DecomposeWidget) {
  const user = userEvent.setup()
  const view = render(<DecomposeView widget={w} />)
  const live = () => view.container.querySelector('[aria-live="polite"]')
  const figure = () => view.container.querySelector('svg.decompose-svg')
  const pieces = (tone: 'figure' | 'copy') => view.container.querySelectorAll(`.decompose-piece.is-${tone}`)
  return { user, view, live, figure, pieces }
}

describe('DecomposeView', () => {
  it('cuts the parallelogram, moves the triangle and ends with the rectangle', async () => {
    mockReducedMotion(true)
    const { user, view, live, figure, pieces } = setup(parallelogram)
    expect(figure()).toHaveAttribute('role', 'img')
    expect(figure()).toHaveAttribute('aria-label', 'Zerlegen. Ein Parallelogramm mit der Grundseite g = 6,5 cm und der Höhe h = 4 cm.')
    expect(screen.getByText('0 von 3 Schritten')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Rechnung' })).toBeNull()

    const step = screen.getByRole('button', { name: 'Nächster Schritt' })
    await user.click(step)
    expect(view.container.querySelector('.decompose-cut')).not.toBeNull()
    expect(pieces('copy')).toHaveLength(1)
    expect(live()).toHaveTextContent('Schneide entlang der Höhe ein Dreieck ab.')

    await user.click(step)
    expect(view.container.querySelector('.decompose-cut')).toBeNull()
    expect(live()).toHaveTextContent('Schiebe das Dreieck um g = 6,5 cm nach rechts an die andere Seite.')

    await user.click(step)
    expect(view.container.querySelector('.decompose-outline.is-result')).not.toBeNull()
    const lines = within(screen.getByRole('list', { name: 'Rechnung' })).getAllByRole('listitem')
    expect(lines).toHaveLength(1)
    expect(lines[0]?.querySelector('.katex')).not.toBeNull()
    expect(live()).toHaveTextContent('A = g·h = 6,5·4 = 26 cm².')
    expect(screen.getByText('3 von 3 Schritten')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Von vorn' }))
    expect(screen.getByText('0 von 3 Schritten')).toBeInTheDocument()
    expect(pieces('copy')).toHaveLength(0)
  })

  it('marks M while the copy of the triangle turns and fades the copy at the end', async () => {
    mockReducedMotion(true)
    const { user, view, pieces } = setup(triangle)
    expect(view.container.querySelector('.decompose-center')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Nächster Schritt' }))
    expect(view.container.querySelector('.decompose-center')).toHaveTextContent('M')
    expect(pieces('copy')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Alle zeigen' }))
    expect(view.container.querySelector('.decompose-piece.is-copy.is-faded')).not.toBeNull()
    expect(within(screen.getByRole('list', { name: 'Rechnung' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('shows the last step at once with reduced motion', async () => {
    mockReducedMotion(true)
    const { user, pieces } = setup(rhombus)
    const all = screen.getByRole('button', { name: 'Alle zeigen' })
    await user.click(all)
    expect(screen.getByText('3 von 3 Schritten')).toBeInTheDocument()
    expect(pieces('copy')).toHaveLength(4)
    expect(all).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('button', { name: 'Von vorn' })).toBeInTheDocument()
  })

  it('turns the copy about M with the Web Animations API', async () => {
    const calls = recordAnimations()
    const { user } = setup(triangle)
    expect(calls).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Nächster Schritt' }))
    const turn = calls.mock.calls.find(([keyframes]) => String(keyframes[0]?.transform).includes('rotate(-180deg)'))
    expect(turn).toBeDefined()
    expect(turn?.[1]).toEqual(expect.objectContaining({ duration: DURATION.move, fill: 'none' }))
    expect(String(turn?.[0][1]?.transform)).toContain('rotate(0deg)')
  })

  it('moves the cut-off triangle by g and staggers nothing', async () => {
    const calls = recordAnimations()
    const { user } = setup(parallelogram)
    await user.click(screen.getByRole('button', { name: 'Nächster Schritt' }))
    calls.mockClear()
    await user.click(screen.getByRole('button', { name: 'Nächster Schritt' }))
    // 6,5 cm = 130 SVG units to the right; the piece starts where it was.
    expect(calls).toHaveBeenCalledWith(
      [{ transform: 'translate(-130px, 0px)' }, { transform: 'none' }],
      expect.objectContaining({ duration: DURATION.move, delay: 0 }),
    )
  })

  it('plays the steps one after another and can be stopped', async () => {
    const { user, live } = setup(triangle)
    await user.click(screen.getByRole('button', { name: 'Abspielen' }))
    expect(screen.getByText('1 von 3 Schritten')).toBeInTheDocument()
    expect(live()).toHaveTextContent('Drehe eine Kopie des Dreiecks')
    await user.click(screen.getByRole('button', { name: 'Anhalten' }))
    expect(screen.getByRole('button', { name: 'Abspielen' })).toBeInTheDocument()
  })

  it('uses the label of the widget', () => {
    const { figure } = setup({ ...rhombus, label: 'Raute im Rechteck' })
    expect(figure()?.getAttribute('aria-label')).toMatch(/^Raute im Rechteck\. Eine Raute mit den Diagonalen/)
  })
})
