// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import type { Coordinates } from '../math'
import {
  buildShear,
  SHEAR_RECTANGLE,
  SHEAR_RIGHT_TRIANGLE,
  shearAnnouncement,
  shearAreaText,
  shearCompare,
  shearDrag,
  shearLatex,
  shearMove,
  shearOffset,
  shearProblems,
  shearState,
  shearStatus,
  shearTrack,
  shearTrackText,
} from './shear'
import type { ShearWidget } from './types'

const PARALLELOGRAM: Coordinates[] = [
  [2, 2],
  [8, 2],
  [10, 6],
  [4, 6],
]
const TRIANGLE: Coordinates[] = [
  [2, 2],
  [8, 2],
  [5, 7],
]

const parallelogram: ShearWidget = { kind: 'shear', shape: 'parallelogram', vertices: PARALLELOGRAM }
const triangle: ShearWidget = { kind: 'shear', shape: 'triangle', vertices: TRIANGLE }
const pt = (x: number, y: number) => ({ x, y })

describe('shear checks', () => {
  it('accepts a parallelogram and a triangle', () => {
    expect(shearProblems(parallelogram)).toEqual([])
    expect(shearProblems(triangle)).toEqual([])
  })

  it('refuses other shapes', () => {
    const rhombus = { kind: 'shear', shape: 'rhombus', vertices: PARALLELOGRAM } as unknown as ShearWidget
    expect(shearProblems(rhombus)).toEqual(['shear: shape must be a parallelogram or a triangle, not "rhombus"'])
  })

  it('checks the vertices like shape-points', () => {
    const wrong: ShearWidget = {
      ...parallelogram,
      vertices: [
        [2, 2],
        [8, 2],
        [9, 6],
        [4, 6],
      ],
    }
    expect(shearProblems(wrong)).toEqual(['shear: a parallelogram needs C = B + D − A'])
    expect(shearProblems({ ...triangle, vertices: PARALLELOGRAM })).toEqual(['shear: a triangle needs 3 vertices'])
  })
})

describe('shear moves', () => {
  it('moves only the top vertex, horizontally, and lets C of a parallelogram follow', () => {
    const model = buildShear(parallelogram)
    expect(model.top).toBe(3)
    // C = D + (6|0) stays inside the grid: D.x within 0…6.
    expect(shearDrag(model, model.start)).toEqual({ kind: 'horizontal', bounds: { x: [0, 6], y: [0, 10] } })
    const moved = shearMove(model, model.start, pt(1, 3))
    expect(moved).toEqual([pt(2, 2), pt(8, 2), pt(7, 6), pt(1, 6)])
    expect(shearOffset(model, moved)).toBe(-1)
  })

  it('lets the apex of a triangle reach the whole row', () => {
    const model = buildShear(triangle)
    expect(model.top).toBe(2)
    expect(shearDrag(model, model.start)).toEqual({ kind: 'horizontal', bounds: { x: [0, 12], y: [0, 10] } })
    expect(shearMove(model, model.start, pt(11, 7))).toEqual([pt(2, 2), pt(8, 2), pt(11, 7)])
  })

  it('keeps base, height and area at every position', () => {
    for (const widget of [parallelogram, triangle]) {
      const model = buildShear(widget)
      const start = shearState(model, model.start)
      const [low, high] = shearDrag(model, model.start).bounds.x
      for (let x = low; x <= high; x++) {
        const state = shearState(model, shearMove(model, model.start, pt(x, 0)))
        expect(state.area.equals(start.area)).toBe(true)
        expect(state.lengths).toEqual(start.lengths)
        expect(state.latex).toBe(start.latex)
      }
    }
  })
})

describe('shear texts', () => {
  it('names the rectangle and the right triangle', () => {
    const p = buildShear(parallelogram)
    expect(shearStatus(p, p.start)).toBeNull()
    expect(shearStatus(p, shearMove(p, p.start, pt(2, 6)))).toBe(SHEAR_RECTANGLE)
    const t = buildShear(triangle)
    expect(shearStatus(t, t.start)).toBeNull()
    expect(shearStatus(t, shearMove(t, t.start, pt(2, 7)))).toBe(SHEAR_RIGHT_TRIANGLE)
    expect(shearStatus(t, shearMove(t, t.start, pt(8, 7)))).toBe(SHEAR_RIGHT_TRIANGLE)
  })

  it('notes a height outside the figure', () => {
    const p = buildShear(parallelogram)
    expect(shearState(p, p.start).outside).toBe(false)
    expect(shearState(p, shearMove(p, p.start, pt(0, 6))).outside).toBe(true)
  })

  it('gives the rectangle for comparison and the parallel', () => {
    const p = buildShear(parallelogram)
    expect(shearCompare(p, p.start)).toEqual([pt(2, 2), pt(8, 2), pt(8, 6), pt(2, 6)])
    expect(shearTrack(p, p.start)).toBe(6)
    expect(shearTrackText(p)).toBe('Parallele zu AB durch D')
    const t = buildShear(triangle)
    expect(shearCompare(t, t.start)).toBeNull()
    expect(shearTrackText(t)).toBe('Parallele zu AB durch C')
  })

  it('announces lengths, area and the status', () => {
    const p = buildShear(parallelogram)
    expect(shearAnnouncement(p, shearMove(p, p.start, pt(3, 6)))).toBe(
      'g = 6 cm, h = 4 cm, A = 24 cm². Der Flächeninhalt bleibt gleich.',
    )
    expect(shearAnnouncement(p, shearMove(p, p.start, pt(2, 6)))).toBe(
      `g = 6 cm, h = 4 cm, A = 24 cm². Der Flächeninhalt bleibt gleich. ${SHEAR_RECTANGLE}`,
    )
    expect(shearAnnouncement(p, shearMove(p, p.start, pt(0, 6)))).toBe(
      'g = 6 cm, h = 4 cm, A = 24 cm². Die Höhe liegt außerhalb. Der Flächeninhalt bleibt gleich.',
    )
    expect(shearAreaText(shearState(p, p.start))).toBe('A = 24 cm², wie am Anfang.')
  })

  it('typesets the calculation', () => {
    const [latex] = shearLatex(buildShear(triangle))
    expect(latex).toBe('A = \\frac{g \\cdot h}{2} = \\frac{6 \\cdot 5}{2} = 15\\,\\text{cm}^{2}')
    expect(() => katex.renderToString(latex ?? '', { strict: 'error' })).not.toThrow()
  })
})
