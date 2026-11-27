// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import type { Coordinates, ShapeKind } from '../math'
import {
  buildShapePoints,
  heightOutside,
  moveVertex,
  reachableDoubleAreas,
  shapeArea,
  shapePointsAnnouncement,
  shapePointsLatex,
  shapePointsProblems,
  shapePointsState,
  shapePolygonText,
  shapeTargetHint,
  shapeTargetReached,
  vertexDrag,
} from './shapePoints'
import type { ShapePointsWidget } from './types'

const widget = (shape: ShapeKind, vertices: Coordinates[], target?: number): ShapePointsWidget => ({
  kind: 'shape-points',
  shape,
  vertices,
  ...(target === undefined ? {} : { target }),
})

const PARALLELOGRAM: Coordinates[] = [
  [2, 2],
  [7, 2],
  [9, 5],
  [4, 5],
]
const TRIANGLE: Coordinates[] = [
  [2, 2],
  [8, 2],
  [4, 6],
]
const RHOMBUS: Coordinates[] = [
  [3, 5],
  [6, 3],
  [9, 5],
  [6, 7],
]
const TRAPEZOID: Coordinates[] = [
  [1, 2],
  [9, 2],
  [7, 6],
  [3, 6],
]

const pt = (x: number, y: number) => ({ x, y })

describe('shape-points checks', () => {
  it('accepts the four shapes', () => {
    expect(shapePointsProblems(widget('parallelogram', PARALLELOGRAM))).toEqual([])
    expect(shapePointsProblems(widget('triangle', TRIANGLE, 15))).toEqual([])
    expect(shapePointsProblems(widget('rhombus', RHOMBUS))).toEqual([])
    expect(shapePointsProblems(widget('trapezoid', TRAPEZOID))).toEqual([])
  })

  it('needs the right number of grid points inside the grid', () => {
    expect(shapePointsProblems(widget('triangle', PARALLELOGRAM))).toEqual(['shape-points: a triangle needs 3 vertices'])
    expect(
      shapePointsProblems(
        widget('triangle', [
          [-1, 2],
          [8, 2],
          [4, 6.5],
        ]),
      ),
    ).toEqual(['shape-points: vertices A, C must be grid points of the grid 0…12 × 0…10'])
  })

  it('needs a horizontal base with room below it and the top above it', () => {
    const triangle = (a: Coordinates, b: Coordinates, c: Coordinates) => shapePointsProblems(widget('triangle', [a, b, c]))
    expect(triangle([2, 2], [8, 3], [4, 6])).toEqual(['shape-points: AB must be horizontal with A left of B'])
    expect(triangle([8, 2], [2, 2], [4, 6])).toEqual(['shape-points: AB must be horizontal with A left of B'])
    expect(triangle([2, 0], [8, 0], [4, 4])).toEqual(['shape-points: AB needs y ≥ 1, so its label fits below it'])
    expect(triangle([2, 5], [8, 5], [4, 3])).toEqual(['shape-points: C must lie above AB'])
  })

  it('needs the bindings of each shape', () => {
    expect(
      shapePointsProblems(
        widget('parallelogram', [
          [2, 2],
          [7, 2],
          [8, 5],
          [4, 5],
        ]),
      ),
    ).toEqual(['shape-points: a parallelogram needs C = B + D − A'])
    expect(
      shapePointsProblems(
        widget('trapezoid', [
          [1, 2],
          [9, 2],
          [7, 5],
          [3, 6],
        ]),
      ),
    ).toEqual(['shape-points: CD must be parallel to AB with C right of D'])
    expect(
      shapePointsProblems(
        widget('rhombus', [
          [3, 5],
          [6, 3],
          [8, 5],
          [6, 7],
        ]),
      ),
    ).toEqual(['shape-points: e and f must be even, so that the centre M is a grid point'])
    expect(
      shapePointsProblems(
        widget('rhombus', [
          [3, 5],
          [5, 3],
          [9, 5],
          [5, 7],
        ]),
      ),
    ).toEqual(['shape-points: the diagonals must have the same midpoint M'])
    expect(
      shapePointsProblems(
        widget('rhombus', [
          [3, 5],
          [6, 7],
          [9, 5],
          [6, 3],
        ]),
      ),
    ).toEqual(['shape-points: the diagonal BD must be vertical with B below D'])
  })

  it('needs a target that differs from the start and can be reached', () => {
    expect(shapePointsProblems(widget('triangle', TRIANGLE, 12))).toEqual(['shape-points: target equals the start area'])
    expect(shapePointsProblems(widget('triangle', TRIANGLE, 0.3))).toEqual(['shape-points: target must be a positive multiple of 0,5'])
    // g ≤ 10 and h ≤ 8 with A at (2|2): at most 40 cm².
    expect(shapePointsProblems(widget('triangle', TRIANGLE, 41))).toEqual(['shape-points: target 41 cm² cannot be reached'])
    expect(shapePointsProblems(widget('triangle', TRIANGLE, 40))).toEqual([])
    expect(shapePointsProblems(widget('triangle', TRIANGLE, 0.5))).toEqual([])
    // A rhombus around M(6|5) reaches e·f/2 = 2kl with k ≤ 6, l ≤ 5.
    const rhombus = buildShapePoints(widget('rhombus', RHOMBUS))
    expect(reachableDoubleAreas(rhombus).has(2 * 60)).toBe(true)
    expect(reachableDoubleAreas(rhombus).has(2 * 7)).toBe(false)
  })
})

describe('shape-points: parallelogram', () => {
  const model = buildShapePoints(widget('parallelogram', PARALLELOGRAM))
  const start = model.start

  it('moves B along AB and D freely, while A and C are not movable', () => {
    expect(vertexDrag(model, start, 0)).toBeUndefined()
    expect(vertexDrag(model, start, 2)).toBeUndefined()
    expect(vertexDrag(model, start, 1)).toEqual({ kind: 'horizontal', bounds: { x: [3, 10], y: [0, 10] } })
    expect(vertexDrag(model, start, 3)).toEqual({ kind: 'free', bounds: { x: [0, 7], y: [3, 10] } })
  })

  it('lets C follow, so ABCD stays a parallelogram', () => {
    expect(moveVertex(model, start, 3, pt(6, 7))).toEqual([pt(2, 2), pt(7, 2), pt(11, 7), pt(6, 7)])
    expect(moveVertex(model, start, 1, pt(5, 2))).toEqual([pt(2, 2), pt(5, 2), pt(7, 5), pt(4, 5)])
  })

  it('reads g and h off the grid and inserts them into the formula', () => {
    const state = shapePointsState(model, start)
    expect(state.lengths).toEqual([
      { letter: 'g', text: ' = 5 cm' },
      { letter: 'h', text: ' = 3 cm' },
    ])
    expect(state.text).toBe('A = g·h = 5·3 = 15 cm²')
    expect(state.outside).toBe(false)
    expect(state.reached).toBe(false)
    expect(shapePointsAnnouncement(model, start)).toBe('g = 5 cm, h = 3 cm, A = 15 cm².')
    expect(shapePolygonText('parallelogram', start)).toBe('Parallelogramm ABCD mit A(2|2), B(7|2), C(9|5), D(4|5)')
  })

  it('says when the height lies outside', () => {
    const moved = moveVertex(model, start, 3, pt(0, 3))
    expect(heightOutside('parallelogram', moved)).toBe(true)
    expect(shapePointsAnnouncement(model, moved)).toBe('g = 5 cm, h = 1 cm, A = 5 cm². Die Höhe liegt außerhalb.')
  })
})

describe('shape-points: triangle', () => {
  const model = buildShapePoints(widget('triangle', TRIANGLE, 15))
  const start = model.start

  it('moves B along AB and C above AB', () => {
    expect(vertexDrag(model, start, 1)).toEqual({ kind: 'horizontal', bounds: { x: [3, 12], y: [0, 10] } })
    expect(vertexDrag(model, start, 2)).toEqual({ kind: 'free', bounds: { x: [0, 12], y: [3, 10] } })
  })

  it('reaches the target, also with the apex outside the base', () => {
    expect(shapeTargetHint(15)).toBe('Ziel: Bringe den Flächeninhalt auf 15 cm².')
    const up = moveVertex(model, start, 2, pt(4, 7))
    expect(shapeArea('triangle', up).toNumber()).toBe(15)
    expect(shapePointsState(model, up).reached).toBe(true)
    expect(shapePointsAnnouncement(model, up)).toBe('g = 6 cm, h = 5 cm, A = 15 cm². Geschafft: A = 15 cm².')
    expect(shapeTargetReached(7.5)).toBe('Geschafft: A = 7,5 cm².')
    const outside = moveVertex(model, start, 2, pt(10, 6))
    expect(shapePointsAnnouncement(model, outside)).toBe('g = 6 cm, h = 4 cm, A = 12 cm². Die Höhe liegt außerhalb.')
    // A right triangle: the foot is A, not outside.
    expect(heightOutside('triangle', moveVertex(model, start, 2, pt(2, 6)))).toBe(false)
  })

  it('prints half areas with a decimal comma', () => {
    const state = shapePointsState(model, moveVertex(model, start, 1, pt(7, 2)))
    expect(state.text).toBe('A = g·h/2 = 5·4/2 = 10 cm²')
    expect(shapePointsState(model, moveVertex(model, start, 2, pt(4, 5))).text).toBe('A = g·h/2 = 6·3/2 = 9 cm²')
    expect(shapeArea('triangle', [pt(2, 2), pt(7, 2), pt(4, 5)]).toNumber()).toBe(7.5)
    expect(shapePointsAnnouncement(model, [pt(2, 2), pt(7, 2), pt(4, 5)])).toBe('g = 5 cm, h = 3 cm, A = 7,5 cm².')
  })
})

describe('shape-points: rhombus', () => {
  const model = buildShapePoints(widget('rhombus', RHOMBUS))
  const start = model.start

  it('moves C and D on the diagonals; A and B follow, mirrored at M', () => {
    expect(vertexDrag(model, start, 0)).toBeUndefined()
    expect(vertexDrag(model, start, 1)).toBeUndefined()
    expect(vertexDrag(model, start, 2)).toEqual({ kind: 'horizontal', bounds: { x: [7, 12], y: [0, 10] } })
    expect(vertexDrag(model, start, 3)).toEqual({ kind: 'vertical', bounds: { x: [0, 12], y: [6, 10] } })
    const wider = moveVertex(model, start, 2, pt(10, 5))
    expect(wider).toEqual([pt(2, 5), pt(6, 3), pt(10, 5), pt(6, 7)])
    const taller = moveVertex(model, wider, 3, pt(6, 9))
    expect(taller).toEqual([pt(2, 5), pt(6, 1), pt(10, 5), pt(6, 9)])
    expect(shapePointsState(model, taller).text).toBe('A = e·f/2 = 8·8/2 = 32 cm²')
  })

  it('keeps the mirrored vertex inside the grid', () => {
    const near = buildShapePoints(
      widget('rhombus', [
        [8, 2],
        [10, 1],
        [12, 2],
        [10, 3],
      ]),
    )
    expect(vertexDrag(near, near.start, 2)).toEqual({ kind: 'horizontal', bounds: { x: [11, 12], y: [0, 10] } })
    expect(vertexDrag(near, near.start, 3)).toEqual({ kind: 'vertical', bounds: { x: [0, 12], y: [3, 4] } })
  })
})

describe('shape-points: trapezoid', () => {
  const model = buildShapePoints(widget('trapezoid', TRAPEZOID))
  const start = model.start

  it('moves B and C sideways and D freely; C takes the row of D', () => {
    expect(vertexDrag(model, start, 1)).toEqual({ kind: 'horizontal', bounds: { x: [2, 12], y: [0, 10] } })
    expect(vertexDrag(model, start, 2)).toEqual({ kind: 'horizontal', bounds: { x: [4, 12], y: [0, 10] } })
    expect(vertexDrag(model, start, 3)).toEqual({ kind: 'free', bounds: { x: [0, 6], y: [3, 10] } })
    expect(moveVertex(model, start, 3, pt(2, 8))).toEqual([pt(1, 2), pt(9, 2), pt(7, 8), pt(2, 8)])
    expect(moveVertex(model, start, 2, pt(10, 6))).toEqual([pt(1, 2), pt(9, 2), pt(10, 6), pt(3, 6)])
  })

  it('inserts a, c and h and works out the sum first', () => {
    expect(shapePointsState(model, start).text).toBe('A = (a + c)·h/2 = (8 + 4)·4/2 = 12·4/2 = 24 cm²')
    expect(heightOutside('trapezoid', moveVertex(model, start, 3, pt(0, 6)))).toBe(true)
  })

  it('typesets the start calculation of every shape', () => {
    const models = [
      model,
      buildShapePoints(widget('parallelogram', PARALLELOGRAM)),
      buildShapePoints(widget('triangle', TRIANGLE)),
      buildShapePoints(widget('rhombus', RHOMBUS)),
    ]
    for (const m of models) {
      for (const latex of shapePointsLatex(m)) {
        expect(() => katex.renderToString(latex, { throwOnError: true, strict: 'error' }), latex).not.toThrow()
      }
    }
  })
})
