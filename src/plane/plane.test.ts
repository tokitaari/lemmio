import { describe, expect, it } from 'vitest'
import { Rational } from '../math'
import {
  axisTicks,
  clientToPlane,
  clipLine,
  DEFAULT_WINDOW,
  describeWindow,
  dragHint,
  formatNumber,
  fromView,
  gridLines,
  gridPointsOnLine,
  isOnLine,
  labelStep,
  lineLabelAnchor,
  lineText,
  lineTrack,
  movePoint,
  placeAt,
  planeFrame,
  planeKey,
  planeWindowProblems,
  pointAnnouncement,
  pointLabelText,
  pointProblems,
  pointValueRange,
  snapPoint,
  toView,
  type PlaneLine,
  type PlaneWindow,
  type PointDrag,
} from './plane'

const W = DEFAULT_WINDOW
const small: PlaneWindow = { x: [-4, 4], y: [-4, 4] }
const f: PlaneLine = { kind: 'function', m: 2, n: -3 }
const free: PointDrag = { kind: 'free' }
const vertical: PointDrag = { kind: 'vertical' }
const horizontal: PointDrag = { kind: 'horizontal' }
const onF: PointDrag = { kind: 'on-line', line: f }
const onFLimited: PointDrag = { kind: 'on-line', line: f, range: [0, 3] }

describe('window', () => {
  it('is −8…8 by default and accepts windows that show both axes', () => {
    expect(W).toEqual({ x: [-8, 8], y: [-8, 8] })
    expect(planeWindowProblems(W)).toEqual([])
    expect(planeWindowProblems({ x: [0, 10], y: [-2, 8] })).toEqual([])
    expect(planeWindowProblems({ x: [-20, 0], y: [-10, 10] })).toEqual([])
  })

  it('rejects windows without an axis, with a bad span or with fractions', () => {
    expect(planeWindowProblems({ x: [1, 9], y: [-8, 8] })).toEqual([
      'x-Bereich: 0 muss im Fenster liegen, damit die Achse sichtbar ist.',
    ])
    expect(planeWindowProblems({ x: [-8, 8], y: [-1, 1] })).toEqual(['y-Bereich: Spannweite 2, erlaubt sind 4 bis 20.'])
    expect(planeWindowProblems({ x: [-15, 15], y: [-8, 8] })).toHaveLength(1)
    expect(planeWindowProblems({ x: [-0.5, 8], y: [-8, 8] })).toEqual(['x-Bereich: Grenzen müssen ganze Zahlen sein.'])
  })
})

describe('frame', () => {
  it('uses the same scale on both axes and leaves room for arrows and axis names', () => {
    expect(planeFrame(W).view).toEqual({ x: -168, y: -182, width: 350, height: 350 })
    // A flat window gives a flat picture, not a stretched one.
    const wide = planeFrame({ x: [-8, 8], y: [-4, 4] }).view
    expect(wide.width).toBe(350)
    expect(wide.height).toBe(190)
  })

  it('makes room for the numbers when an axis lies on the edge of the window', () => {
    expect(planeFrame({ x: [0, 10], y: [0, 10] }).view).toEqual({ x: -28, y: -222, width: 250, height: 250 })
  })

  it('converts between grid units, SVG units and client pixels', () => {
    expect(toView({ x: 2, y: -3 })).toEqual({ x: 40, y: 60 })
    expect(toView({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 })
    expect(Object.is(toView({ x: 0, y: 0 }).y, 0)).toBe(true)
    expect(fromView(40, 60)).toEqual({ x: 2, y: -3 })
    const frame = planeFrame(W)
    const expectAt = (p: { x: number; y: number } | null, x: number, y: number) => {
      expect(p?.x).toBeCloseTo(x, 9)
      expect(p?.y).toBeCloseTo(y, 9)
    }
    expectAt(clientToPlane(frame, { left: 0, top: 0, width: 350, height: 350 }, 208, 242), 2, -3)
    // Rendered at half size and moved on the page.
    expectAt(clientToPlane(frame, { left: 10, top: 20, width: 175, height: 175 }, 10 + 104, 20 + 121), 2, -3)
    expect(clientToPlane(frame, { left: 0, top: 0, width: 0, height: 0 }, 1, 1)).toBeNull()
  })
})

describe('grid and axes', () => {
  it('has a grid line at every integer of the window', () => {
    const lines = gridLines({ x: [-2, 3], y: [0, 4] })
    expect(lines.x).toEqual([-2, -1, 0, 1, 2, 3])
    expect(lines.y).toEqual([0, 1, 2, 3, 4])
  })

  it('labels every integer of small spans and every second one of larger spans', () => {
    expect(labelStep([-5, 5])).toBe(1)
    expect(labelStep([-6, 5])).toBe(2)
    const ticks = axisTicks(W, 'x')
    expect(ticks).toHaveLength(16)
    expect(ticks.find((t) => t.value === 0)).toBeUndefined()
    expect(ticks.filter((t) => t.label !== null).map((t) => t.label)).toEqual(['−8', '−6', '−4', '−2', '2', '4', '6', '8'])
    expect(axisTicks(small, 'y').every((t) => t.label !== null)).toBe(true)
  })
})

describe('lines', () => {
  it('clips a line to the window from edge to edge', () => {
    expect(clipLine(f, W)).toEqual({ from: { x: -2.5, y: -8 }, to: { x: 5.5, y: 8 } })
    expect(clipLine({ kind: 'function', m: Rational.of(-1, 2), n: 0 }, W)).toEqual({ from: { x: -8, y: 4 }, to: { x: 8, y: -4 } })
    expect(clipLine({ kind: 'function', m: 0, n: 3 }, W)).toEqual({ from: { x: -8, y: 3 }, to: { x: 8, y: 3 } })
    expect(clipLine({ kind: 'vertical', x: 4 }, W)).toEqual({ from: { x: 4, y: -8 }, to: { x: 4, y: 8 } })
  })

  it('returns null for lines that miss the window or only touch a corner', () => {
    expect(clipLine({ kind: 'function', m: 0, n: 9 }, W)).toBeNull()
    expect(clipLine({ kind: 'vertical', x: -9 }, W)).toBeNull()
    expect(clipLine({ kind: 'function', m: 1, n: 16 }, W)).toBeNull()
    expect(clipLine({ kind: 'function', m: 1, n: 20 }, W)).toBeNull()
  })

  it('puts the name near the right end, above a rising line and inside the window', () => {
    const segment = clipLine(f, W)
    if (!segment) throw new Error('missing segment')
    const anchor = lineLabelAnchor(segment, W)
    expect(anchor.x).toBeGreaterThan(3)
    expect(anchor.x).toBeLessThan(8)
    expect(anchor.y).toBeLessThan(8)
    expect(anchor.y).toBeGreaterThan(2 * anchor.x - 3)
    const flat = clipLine({ kind: 'function', m: 0, n: 8 }, W)
    if (!flat) throw new Error('missing segment')
    expect(lineLabelAnchor(flat, W).y).toBeLessThanOrEqual(7.65)
  })

  it('finds the grid points on a line, also with a fractional slope', () => {
    expect(gridPointsOnLine({ kind: 'function', m: Rational.of(1, 2), n: 1 }, small)).toEqual([
      { x: -4, y: -1 },
      { x: -2, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 2 },
      { x: 4, y: 3 },
    ])
    const onLine = gridPointsOnLine(f, W)
    expect(onLine[0]).toEqual({ x: -2, y: -7 })
    expect(onLine.at(-1)).toEqual({ x: 5, y: 7 })
    expect(gridPointsOnLine({ kind: 'vertical', x: 2 }, small)).toHaveLength(9)
    expect(gridPointsOnLine({ kind: 'vertical', x: Rational.of(1, 2) }, small)).toEqual([])
    expect(isOnLine(f, { x: 2, y: 1 })).toBe(true)
    expect(isOnLine(f, { x: 2, y: 2 })).toBe(false)
    expect(isOnLine({ kind: 'vertical', x: 2 }, { x: 2, y: -7 })).toBe(true)
  })
})

describe('snapping', () => {
  it('snaps free points to the nearest grid point inside the window', () => {
    expect(snapPoint({ x: 2.4, y: -3.6 }, { x: 0, y: 0 }, free, W)).toEqual({ x: 2, y: -4 })
    expect(snapPoint({ x: 12, y: 3.2 }, { x: 0, y: 0 }, free, W)).toEqual({ x: 8, y: 3 })
    expect(snapPoint({ x: -0.2, y: -0.4 }, { x: 1, y: 1 }, free, W)).toEqual({ x: 0, y: 0 })
    expect(Object.is(snapPoint({ x: -0.2, y: -0.4 }, { x: 1, y: 1 }, free, W).x, 0)).toBe(true)
  })

  it('keeps x of vertical points and y of horizontal points', () => {
    expect(snapPoint({ x: 5, y: 2.6 }, { x: 0, y: 1 }, vertical, W)).toEqual({ x: 0, y: 3 })
    expect(snapPoint({ x: -3.7, y: 6 }, { x: 2, y: 0 }, horizontal, W)).toEqual({ x: -4, y: 0 })
  })

  it('moves points on a line to the nearest grid point of the line', () => {
    expect(snapPoint({ x: 1.2, y: 0 }, { x: 3, y: 3 }, onF, W)).toEqual({ x: 1, y: -1 })
    expect(snapPoint({ x: 20, y: 20 }, { x: 3, y: 3 }, onF, W)).toEqual({ x: 5, y: 7 })
  })

  it('keeps points on a line inside their range', () => {
    expect(lineTrack({ line: f, range: [0, 3] }, W)).toEqual([
      { x: 0, y: -3 },
      { x: 1, y: -1 },
      { x: 2, y: 1 },
      { x: 3, y: 3 },
    ])
    expect(lineTrack({ line: { kind: 'vertical', x: 2 }, range: [6, 9] }, W)).toEqual([
      { x: 2, y: 6 },
      { x: 2, y: 7 },
      { x: 2, y: 8 },
    ])
    expect(snapPoint({ x: 20, y: 20 }, { x: 1, y: -1 }, onFLimited, W)).toEqual({ x: 3, y: 3 })
    expect(snapPoint({ x: -5, y: -13 }, { x: 1, y: -1 }, onFLimited, W)).toEqual({ x: 0, y: -3 })
    expect(pointProblems({ x: 4, y: 5 }, W, onFLimited)).toEqual(['Punkt: liegt außerhalb seines Bereichs auf der Geraden.'])
    expect(pointProblems({ x: 3, y: 3 }, W, onFLimited)).toEqual([])
  })

  it('stays where it is while the nearest grid point is taken', () => {
    expect(snapPoint({ x: 2.4, y: -3.6 }, { x: 0, y: 0 }, free, W, [{ x: 2, y: -4 }])).toEqual({ x: 0, y: 0 })
    expect(snapPoint({ x: 3.4, y: -3.6 }, { x: 0, y: 0 }, free, W, [{ x: 2, y: -4 }])).toEqual({ x: 3, y: -4 })
  })

  it('places a tapped point on the nearest grid point, but not far outside', () => {
    expect(placeAt({ x: 2.4, y: 8.3 }, W)).toEqual({ x: 2, y: 8 })
    expect(placeAt({ x: 2.4, y: 9 }, W)).toBeNull()
  })

  it('checks start positions', () => {
    expect(pointProblems({ x: 1, y: -1 }, W, onF)).toEqual([])
    expect(pointProblems({ x: 1, y: 0 }, W, onF)).toEqual(['Punkt: liegt nicht auf seiner Geraden.'])
    expect(pointProblems({ x: 9, y: 0 }, W, free)).toEqual(['Punkt: liegt außerhalb des Fensters.'])
    expect(pointProblems({ x: 0.5, y: 0 }, W)).toEqual(['Punkt: Koordinaten müssen ganze Zahlen sein.'])
  })
})

describe('keyboard', () => {
  it('maps keys', () => {
    expect(planeKey('ArrowLeft')).toBe('left')
    expect(planeKey('PageDown')).toBe('page-down')
    expect(planeKey('Enter')).toBeUndefined()
  })

  it('moves free points by one unit and to the edges', () => {
    const p = { x: 3, y: 2 }
    expect(movePoint(p, 'right', free, W)).toEqual({ kind: 'moved', point: { x: 4, y: 2 } })
    expect(movePoint(p, 'left', free, W)).toEqual({ kind: 'moved', point: { x: 2, y: 2 } })
    expect(movePoint(p, 'up', free, W)).toEqual({ kind: 'moved', point: { x: 3, y: 3 } })
    expect(movePoint(p, 'down', free, W)).toEqual({ kind: 'moved', point: { x: 3, y: 1 } })
    expect(movePoint(p, 'home', free, W)).toEqual({ kind: 'moved', point: { x: -8, y: 2 } })
    expect(movePoint(p, 'end', free, W)).toEqual({ kind: 'moved', point: { x: 8, y: 2 } })
    expect(movePoint(p, 'page-up', free, W)).toEqual({ kind: 'moved', point: { x: 3, y: 8 } })
    expect(movePoint(p, 'page-down', free, W)).toEqual({ kind: 'moved', point: { x: 3, y: -8 } })
  })

  it('stops at the edge', () => {
    expect(movePoint({ x: 8, y: 0 }, 'right', free, W)).toEqual({ kind: 'edge' })
    expect(movePoint({ x: 8, y: 0 }, 'end', free, W)).toEqual({ kind: 'edge' })
    expect(movePoint({ x: 0, y: -8 }, 'down', free, W)).toEqual({ kind: 'edge' })
  })

  it('skips taken grid points and reports the point that blocks the way', () => {
    expect(movePoint({ x: 0, y: 0 }, 'right', free, W, [{ x: 1, y: 0 }])).toEqual({ kind: 'moved', point: { x: 2, y: 0 } })
    expect(movePoint({ x: 6, y: 0 }, 'right', free, W, [{ x: 7, y: 0 }, { x: 8, y: 0 }])).toEqual({
      kind: 'occupied',
      by: { x: 7, y: 0 },
    })
    expect(movePoint({ x: 3, y: 2 }, 'end', free, W, [{ x: 8, y: 2 }])).toEqual({ kind: 'moved', point: { x: 7, y: 2 } })
    expect(movePoint({ x: 7, y: 2 }, 'end', free, W, [{ x: 8, y: 2 }])).toEqual({ kind: 'occupied', by: { x: 8, y: 2 } })
  })

  it('moves vertical and horizontal points along their axis only', () => {
    const p = { x: 0, y: 1 }
    expect(movePoint(p, 'left', vertical, W)).toEqual({ kind: 'moved', point: { x: 0, y: 0 } })
    expect(movePoint(p, 'right', vertical, W)).toEqual({ kind: 'moved', point: { x: 0, y: 2 } })
    expect(movePoint(p, 'home', vertical, W)).toEqual({ kind: 'moved', point: { x: 0, y: -8 } })
    expect(movePoint(p, 'end', vertical, W)).toEqual({ kind: 'moved', point: { x: 0, y: 8 } })
    expect(movePoint(p, 'page-down', vertical, W)).toEqual({ kind: 'moved', point: { x: 0, y: -8 } })
    const q = { x: 2, y: 0 }
    expect(movePoint(q, 'up', horizontal, W)).toEqual({ kind: 'moved', point: { x: 3, y: 0 } })
    expect(movePoint(q, 'down', horizontal, W)).toEqual({ kind: 'moved', point: { x: 1, y: 0 } })
    expect(movePoint(q, 'home', horizontal, W)).toEqual({ kind: 'moved', point: { x: -8, y: 0 } })
  })

  it('moves points on a line from grid point to grid point', () => {
    const p = { x: 1, y: -1 }
    expect(movePoint(p, 'up', onF, W)).toEqual({ kind: 'moved', point: { x: 2, y: 1 } })
    expect(movePoint(p, 'left', onF, W)).toEqual({ kind: 'moved', point: { x: 0, y: -3 } })
    expect(movePoint(p, 'end', onF, W)).toEqual({ kind: 'moved', point: { x: 5, y: 7 } })
    expect(movePoint(p, 'home', onF, W)).toEqual({ kind: 'moved', point: { x: -2, y: -7 } })
    expect(movePoint({ x: 5, y: 7 }, 'right', onF, W)).toEqual({ kind: 'edge' })
    expect(movePoint({ x: 3, y: 3 }, 'right', onFLimited, W)).toEqual({ kind: 'edge' })
    expect(movePoint(p, 'end', onFLimited, W)).toEqual({ kind: 'moved', point: { x: 3, y: 3 } })
    expect(movePoint(p, 'home', onFLimited, W)).toEqual({ kind: 'moved', point: { x: 0, y: -3 } })
  })

  it('gives the value range of the coordinate a point changes', () => {
    expect(pointValueRange({ x: 3, y: 2 }, free, W)).toEqual({ now: 3, min: -8, max: 8 })
    expect(pointValueRange({ x: 0, y: 2 }, vertical, W)).toEqual({ now: 2, min: -8, max: 8 })
    expect(pointValueRange({ x: 1, y: -1 }, onF, W)).toEqual({ now: 1, min: -2, max: 5 })
    expect(pointValueRange({ x: 1, y: -1 }, onFLimited, W)).toEqual({ now: 1, min: 0, max: 3 })
  })
})

describe('texts', () => {
  it('writes numbers, points and lines with a real minus', () => {
    expect(formatNumber(-3)).toBe('−3')
    expect(formatNumber(-0)).toBe('0')
    expect(pointLabelText('P', { x: 2, y: -3 })).toBe('P(2|−3)')
    expect(pointAnnouncement('P', { x: -2, y: 5 })).toBe('P: x = −2, y = 5')
    expect(lineText(f, 'f')).toBe('f(x) = 2x − 3')
    expect(lineText(f)).toBe('y = 2x − 3')
    expect(lineText({ kind: 'function', m: -1, n: 0 }, 'g')).toBe('g(x) = −x')
    expect(lineText({ kind: 'vertical', x: -4 })).toBe('x = −4')
  })

  it('names the window and explains the keys', () => {
    expect(describeWindow(W)).toBe('Koordinatensystem, x von −8 bis 8, y von −8 bis 8')
    expect(dragHint('free')).toMatch(/^Pfeiltasten/)
    expect(dragHint('on-line')).toMatch(/Geraden/)
  })
})
