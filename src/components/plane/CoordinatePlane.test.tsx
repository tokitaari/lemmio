import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GridPoint } from '../../plane'
import CoordinatePlane, { type CoordinatePlaneProps, type PlanePointItem } from './CoordinatePlane'

afterEach(() => {
  vi.restoreAllMocks()
})

type HarnessProps = Omit<CoordinatePlaneProps, 'points' | 'onPointChange'> & {
  initial: PlanePointItem[]
  onChange?: (id: string, p: GridPoint) => void
}

/** Holds the points like a widget does. */
function Harness({ initial, onChange, ...props }: HarnessProps) {
  const [points, setPoints] = useState(initial)
  return (
    <CoordinatePlane
      {...props}
      points={points}
      onPointChange={(id, p) => {
        onChange?.(id, p)
        setPoints((current) => current.map((q) => (q.id === id ? { ...q, ...p } : q)))
      }}
    />
  )
}

function setup(props: HarnessProps) {
  const user = userEvent.setup()
  const view = render(<Harness {...props} />)
  const live = () => view.container.querySelector('[aria-live="polite"]')
  const slider = (name: string) => screen.getByRole('slider', { name: `Punkt ${name}` })
  return { user, view, live, slider }
}

// The default window has the viewBox −168 −182 350 350; rendered at 350 px, one grid unit is 20 px.
const clientX = (x: number) => 168 + 20 * x
const clientY = (y: number) => 182 - 20 * y

function mockSize(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) throw new Error('missing svg')
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 350,
    bottom: 350,
    width: 350,
    height: 350,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('drawing', () => {
  it('names the plane, its lines and its points', () => {
    render(
      <CoordinatePlane
        label="Gerade f"
        lines={[
          { id: 'f', line: { kind: 'function', m: 2, n: -3 }, label: 'f' },
          { id: 'h', line: { kind: 'vertical', x: 4 }, tone: 'muted', dashed: true },
          { id: 'out', line: { kind: 'function', m: 0, n: 9 } },
        ]}
        points={[
          { id: 'a', label: 'A', x: 0, y: -3, showCoordinates: true },
          { id: 'p', label: 'P', x: 1, y: -1, drag: { kind: 'free' } },
        ]}
      />,
    )
    expect(screen.getByRole('group', { name: 'Gerade f. Koordinatensystem, x von −8 bis 8, y von −8 bis 8' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x − 3' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade x = 4' })).toBeInTheDocument()
    // Lines outside the window are not drawn.
    expect(screen.queryByRole('img', { name: 'Gerade y = 9' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Punkt A: x = 0, y = −3' })).toBeInTheDocument()
    expect(screen.getByText('A(0|−3)')).toBeInTheDocument()

    const p = screen.getByRole('slider', { name: 'Punkt P' })
    expect(p).toHaveAttribute('aria-roledescription', 'verschiebbarer Punkt')
    expect(p).toHaveAttribute('aria-valuetext', 'x = 1, y = −1')
    expect(p).toHaveAttribute('aria-valuenow', '1')
    expect(p).toHaveAttribute('aria-valuemin', '-8')
    expect(p).toHaveAttribute('aria-valuemax', '8')
    expect(p).not.toHaveAttribute('aria-orientation')
    expect(p).toHaveAccessibleDescription(/^Pfeiltasten verschieben den Punkt um ein Kästchen/)
  })

  it('labels every second number of the default window and every number of a small one', () => {
    const { container, rerender } = render(<CoordinatePlane />)
    const numbers = () => [...container.querySelectorAll('.plane-number')].map((n) => n.textContent)
    expect(numbers()).toContain('−8')
    expect(numbers()).not.toContain('−7')
    expect(numbers()).toContain('0')
    rerender(<CoordinatePlane window={{ x: [-4, 4], y: [-4, 4] }} />)
    expect(numbers()).toContain('−3')
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-88 -102 190 190')
  })

  it('draws a plain grid without axes and numbers for geometry', () => {
    const { container } = render(<CoordinatePlane axes={false} window={{ x: [0, 12], y: [0, 10] }} label="Figur" />)
    expect(
      screen.getByRole('group', { name: /^Figur\. Gitter, 12 mal 10 Kästchen, ein Kästchen 1 cm/ }),
    ).toBeInTheDocument()
    expect(container.querySelector('.plane-axes')).toBeNull()
    expect(container.querySelectorAll('.plane-number')).toHaveLength(0)
    expect(container.querySelectorAll('.plane-grid line')).toHaveLength(13 + 11)
    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '-8 -208 256 216')
  })

  it('draws polygons below lines and points with their description', () => {
    const { container } = render(
      <CoordinatePlane
        axes={false}
        window={{ x: [0, 12], y: [0, 10] }}
        lines={[{ id: 'ab', line: { kind: 'function', m: 0, n: 2 } }]}
        polygons={[
          { id: 'abc', points: [{ x: 2, y: 2 }, { x: 8, y: 2 }, { x: 4, y: 7 }], description: 'Dreieck ABC' },
          { id: 'own', points: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }], description: 'Deine Figur', tone: 'danger', dashed: true, filled: false },
        ]}
        points={[{ id: 'f', label: 'F', x: 4, y: 2, drag: { kind: 'free' } }]}
      />,
    )
    const triangle = screen.getByRole('img', { name: 'Dreieck ABC' })
    expect(triangle).toHaveClass('plane-polygon', 'plane-tone-accent', 'is-filled')
    expect(triangle.querySelector('polygon')).toHaveAttribute('points', '40,-40 160,-40 80,-140')
    const own = screen.getByRole('img', { name: 'Deine Figur' })
    expect(own).toHaveClass('plane-tone-danger', 'is-dashed')
    expect(own).not.toHaveClass('is-filled')
    // Order in the SVG: polygons, then lines, then points.
    const order = [...container.querySelectorAll('.plane-polygon, .plane-line, .plane-point')].map((el) => el.classList[0])
    expect(order).toEqual(['plane-polygon', 'plane-polygon', 'plane-line', 'plane-point'])
  })

  it('passes the geometry to an overlay', () => {
    const { container } = render(
      <CoordinatePlane
        overlay={({ toView }) => {
          const p = toView({ x: 2, y: 1 })
          return <circle data-testid="mark" cx={p.x} cy={p.y} r={3} />
        }}
      />,
    )
    const mark = container.querySelector('[data-testid="mark"]')
    expect(mark).toHaveAttribute('cx', '40')
    expect(mark).toHaveAttribute('cy', '-20')
  })
})

describe('keyboard', () => {
  it('moves a free point by one unit and to the edges and announces each move', async () => {
    const { user, live, slider } = setup({ initial: [{ id: 'p', label: 'P', x: 1, y: 2, drag: { kind: 'free' } }] })
    act(() => slider('P').focus())
    await user.keyboard('{ArrowRight}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = 2')
    expect(live()).toHaveTextContent('P: x = 2, y = 2')
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = −1')
    await user.keyboard('{Home}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = −8, y = −1')
    await user.keyboard('{PageUp}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = −8, y = 8')
    await user.keyboard('{End}{PageDown}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 8, y = −8')
    expect(slider('P')).toHaveFocus()
  })

  it('says when the edge is reached', async () => {
    const { user, live, slider } = setup({ initial: [{ id: 'p', label: 'P', x: 8, y: 0, drag: { kind: 'free' } }] })
    act(() => slider('P').focus())
    await user.keyboard('{ArrowRight}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 8, y = 0')
    expect(live()).toHaveTextContent('P: Rand erreicht')
  })

  it('skips grid points of other movable points and names the point in the way', async () => {
    const { user, live, slider } = setup({
      initial: [
        { id: 'p', label: 'P', x: 0, y: 0, drag: { kind: 'free' } },
        { id: 'q', label: 'Q', x: 1, y: 0, drag: { kind: 'free' } },
        { id: 'r', label: 'R', x: 8, y: 0, drag: { kind: 'free' } },
      ],
    })
    act(() => slider('P').focus())
    await user.keyboard('{ArrowRight}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = 0')
    await user.keyboard('{End}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 7, y = 0')
    await user.keyboard('{ArrowRight}')
    expect(live()).toHaveTextContent('Dort liegt schon R')
  })

  it('moves vertical points up and down and points on a line along the line', async () => {
    const { user, slider } = setup({
      initial: [
        { id: 'n', label: 'N', x: 0, y: 1, drag: { kind: 'vertical' } },
        { id: 'p', label: 'P', x: 1, y: -1, drag: { kind: 'on-line', line: { kind: 'function', m: 2, n: -3 } } },
      ],
    })
    expect(slider('N')).toHaveAttribute('aria-orientation', 'vertical')
    expect(slider('N')).toHaveAttribute('aria-valuenow', '1')
    act(() => slider('N').focus())
    await user.keyboard('{ArrowUp}{ArrowUp}{ArrowLeft}')
    expect(slider('N')).toHaveAttribute('aria-valuetext', 'x = 0, y = 2')
    await user.keyboard('{End}')
    expect(slider('N')).toHaveAttribute('aria-valuetext', 'x = 0, y = 8')

    expect(slider('P')).toHaveAttribute('aria-orientation', 'horizontal')
    expect(slider('P')).toHaveAttribute('aria-valuemin', '-2')
    expect(slider('P')).toHaveAttribute('aria-valuemax', '5')
    act(() => slider('P').focus())
    await user.keyboard('{ArrowRight}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = 1')
    await user.keyboard('{Home}')
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = −2, y = −7')
  })

  it('adds the text of `describe` to the announcement', async () => {
    const { user, live, slider } = setup({
      initial: [{ id: 'p', label: 'P', x: 0, y: 0, drag: { kind: 'free' } }],
      describe: (_id, p) => `Abstand zur y-Achse: ${Math.abs(p.x)}`,
    })
    act(() => slider('P').focus())
    await user.keyboard('{ArrowLeft}')
    expect(live()).toHaveTextContent('P: x = −1, y = 0. Abstand zur y-Achse: 1')
  })

  it('prevents the default of the keys it uses, so a card deck keeps its card', () => {
    const { slider } = setup({ initial: [{ id: 'p', label: 'P', x: 0, y: 0, drag: { kind: 'free' } }] })
    expect(fireEvent.keyDown(slider('P'), { key: 'ArrowRight' })).toBe(false)
    expect(fireEvent.keyDown(slider('P'), { key: 'Home' })).toBe(false)
    expect(fireEvent.keyDown(slider('P'), { key: 'Enter' })).toBe(true)
    expect(fireEvent.keyDown(slider('P'), { key: 'ArrowLeft', ctrlKey: true })).toBe(true)
  })
})

describe('pointer', () => {
  it('snaps to grid points while dragging and announces the move when released', () => {
    const onChange = vi.fn()
    const { view, live, slider } = setup({
      onChange,
      initial: [
        { id: 'p', label: 'P', x: 1, y: 2, drag: { kind: 'free' } },
        { id: 'q', label: 'Q', x: 3, y: 2, drag: { kind: 'free' } },
      ],
    })
    mockSize(view.container)
    const p = slider('P')
    fireEvent.pointerDown(p, { pointerId: 1, button: 0, clientX: clientX(1), clientY: clientY(2) })
    expect(p).toHaveFocus()
    fireEvent.pointerMove(p, { pointerId: 1, clientX: clientX(2.4), clientY: clientY(2.2) })
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = 2')
    expect(live()?.textContent).toBe('')
    // Q's grid point is taken: P waits until a free one is reached.
    fireEvent.pointerMove(p, { pointerId: 1, clientX: clientX(3.1), clientY: clientY(2) })
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 2, y = 2')
    fireEvent.pointerMove(p, { pointerId: 1, clientX: clientX(3.2), clientY: clientY(3.4) })
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 3, y = 3')
    // Far outside: the point stays at the edge of the window.
    fireEvent.pointerMove(p, { pointerId: 1, clientX: clientX(20), clientY: clientY(3) })
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 8, y = 3')
    fireEvent.pointerUp(p, { pointerId: 1 })
    expect(live()).toHaveTextContent('P: x = 8, y = 3')
    expect(onChange).toHaveBeenCalledTimes(3)
    fireEvent.pointerMove(p, { pointerId: 1, clientX: clientX(0), clientY: clientY(0) })
    expect(slider('P')).toHaveAttribute('aria-valuetext', 'x = 8, y = 3')
  })

  it('keeps x of a vertical point and ignores other buttons and pointers', () => {
    const { view, slider } = setup({ initial: [{ id: 'n', label: 'N', x: 0, y: 1, drag: { kind: 'vertical' } }] })
    mockSize(view.container)
    const n = slider('N')
    fireEvent.pointerDown(n, { pointerId: 1, button: 2, clientX: clientX(0), clientY: clientY(1) })
    fireEvent.pointerMove(n, { pointerId: 1, clientX: clientX(0), clientY: clientY(4) })
    expect(slider('N')).toHaveAttribute('aria-valuetext', 'x = 0, y = 1')
    fireEvent.pointerDown(n, { pointerId: 2, button: 0, clientX: clientX(0), clientY: clientY(1) })
    fireEvent.pointerMove(n, { pointerId: 3, clientX: clientX(0), clientY: clientY(4) })
    expect(slider('N')).toHaveAttribute('aria-valuetext', 'x = 0, y = 1')
    fireEvent.pointerMove(n, { pointerId: 2, clientX: clientX(3), clientY: clientY(-4.4) })
    expect(slider('N')).toHaveAttribute('aria-valuetext', 'x = 0, y = −4')
    fireEvent.pointerCancel(n, { pointerId: 2 })
  })

  it('places a point where the grid is tapped', () => {
    const onPlace = vi.fn()
    const { container } = render(<CoordinatePlane onPlace={onPlace} />)
    mockSize(container)
    const grid = container.querySelector('.plane-place')
    if (!grid) throw new Error('missing grid')
    fireEvent.click(grid, { clientX: clientX(-2.3), clientY: clientY(4.6) })
    expect(onPlace).toHaveBeenCalledWith({ x: -2, y: 5 })
  })

  it('has no tap area without onPlace', () => {
    const { container } = render(<CoordinatePlane />)
    expect(container.querySelector('.plane-place')).toBeNull()
  })
})
