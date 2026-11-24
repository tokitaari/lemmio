import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TARGET_REACHED, type LinePointsWidget } from '../../cards'
import LinePointsView from './LinePointsView'

const widget = (extra: Partial<LinePointsWidget> = {}): LinePointsWidget => ({
  kind: 'line-points',
  points: [
    [0, -3],
    [2, 1],
  ],
  ...extra,
})

function setup(w: LinePointsWidget) {
  const user = userEvent.setup()
  const view = render(<LinePointsView widget={w} />)
  const live = () => view.container.querySelector('.plane [aria-live="polite"]')
  const slider = (name: string) => screen.getByRole('slider', { name: `Punkt ${name}` })
  const table = () => screen.getByRole('table', { name: 'Wertetabelle' })
  return { user, view, live, slider, table }
}

describe('LinePointsView', () => {
  it('draws the line through P and Q with a table of values', () => {
    const { table } = setup(widget())
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x − 3' })).toBeInTheDocument()
    const [xs] = within(table()).getAllByRole('row')
    if (!xs) throw new Error('missing row')
    expect(within(xs).getAllByRole('cell').map((c) => c.textContent)).toEqual(['−2', '−1', '0 (Punkt P)', '1', '2 (Punkt Q)'])
    expect(table().querySelectorAll('.is-marked')).toHaveLength(4)
  })

  it('follows a moved point with the equation, also for a fraction as slope', async () => {
    const { user, live, slider } = setup(widget())
    act(() => slider('Q').focus())
    await user.keyboard('{ArrowUp}')
    expect(slider('Q')).toHaveAttribute('aria-valuetext', 'x = 2, y = 2')
    expect(screen.getByRole('img', { name: 'Gerade f(x) = (5/2)x − 3' })).toBeInTheDocument()
    expect(live()).toHaveTextContent('Q: x = 2, y = 2. Gerade f(x) = (5/2)x − 3')
  })

  it('names a vertical line as no function', async () => {
    const { user, view, slider, table } = setup(
      widget({
        points: [
          [2, 0],
          [3, 1],
        ],
        table: [1, 2],
      }),
    )
    act(() => slider('Q').focus())
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('img', { name: 'Gerade x = 2' })).toBeInTheDocument()
    expect(view.container.querySelector('.line-note')).toHaveTextContent('Senkrechte Gerade: keine Funktion')
    const [, values] = within(table()).getAllByRole('row')
    if (!values) throw new Error('missing row')
    expect(within(values).getAllByRole('cell').map((c) => c.textContent)).toEqual(['–', '–'])
  })

  it('has no table with `table: false`', () => {
    setup(widget({ table: false }))
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('announces when the line lies on the target', async () => {
    const { user, view, slider } = setup(widget({ target: { m: 1, n: -3 } }))
    expect(screen.getByRole('img', { name: 'Gerade y = x − 3' })).toBeInTheDocument()
    act(() => slider('Q').focus())
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(view.container.querySelector('.line-status')).toHaveTextContent(TARGET_REACHED)
    expect(view.container.querySelector('.line-widget > [aria-live="polite"]')).toHaveTextContent(TARGET_REACHED)
  })
})
