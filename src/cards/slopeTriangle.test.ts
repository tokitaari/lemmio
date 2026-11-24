// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import {
  buildSlopeTriangle,
  fixedQ,
  rightAngleMark,
  slopeLatex,
  slopeText,
  slopeTriangle,
  slopeTriangleLatex,
  slopeTriangleProblems,
  triangleAnnouncement,
  triangleDescription,
  triangleLabels,
  triangleText,
} from './slopeTriangle'
import type { SlopeTriangleWidget } from './types'
import { DEFAULT_WINDOW } from '../plane'

const widget = (extra: Partial<SlopeTriangleWidget> = {}): SlopeTriangleWidget => ({ kind: 'slope-triangle', m: 2, n: 1, ...extra })

describe('slope triangle: checks', () => {
  it('accepts a triangle that fits into the window', () => {
    expect(slopeTriangleProblems(widget())).toEqual([])
    expect(slopeTriangleProblems(widget({ m: -3, n: 2, at: -1, run: 3, resizable: true }))).toEqual([])
  })

  it('needs whole numbers, a slope other than 0 and a width from 1 to 6', () => {
    expect(slopeTriangleProblems(widget({ m: 1.5 }))).toEqual(['slope-triangle: m and n must be whole numbers'])
    expect(slopeTriangleProblems(widget({ m: 0 }))).toEqual(['slope-triangle: m must not be 0 (a horizontal line has no triangle)'])
    expect(slopeTriangleProblems(widget({ m: 11 }))).toEqual(['slope-triangle: m must stay within −10…10'])
    expect(slopeTriangleProblems(widget({ at: 0.5 }))).toEqual(['slope-triangle: at must be a whole number'])
    expect(slopeTriangleProblems(widget({ run: 7 }))).toEqual(['slope-triangle: run must be a whole number from 1 to 6'])
    expect(slopeTriangleProblems(widget({ run: 0 }))).toEqual(['slope-triangle: run must be a whole number from 1 to 6'])
    expect(slopeTriangleProblems(widget({ name: 'y' }))).toEqual([
      'slope-triangle: name "y" must be a single lower-case letter other than x and y',
    ])
  })

  it('needs both corners inside the window', () => {
    expect(slopeTriangleProblems(widget({ at: 3, run: 4 }))).toEqual([
      'slope-triangle: the triangle from x = 3 to x = 7 does not fit into the window',
    ])
  })
})

describe('slope triangle: model', () => {
  it('lets P of a fixed triangle move only as far as Q stays inside the window', () => {
    const model = buildSlopeTriangle(widget())
    expect(model.start).toEqual({ p: { x: 0, y: 1 }, q: { x: 1, y: 3 } })
    // y = 2x + 1 has grid points from x = −4 to x = 3 in −8…8.
    expect(model.pDrag).toEqual({ kind: 'on-line', line: model.line, range: [-4, 2] })
    expect(model.qDrag).toBeUndefined()
    expect(fixedQ(model, { x: 2, y: 5 })).toEqual({ x: 3, y: 7 })
  })

  it('lets both points of a resizable triangle move along the whole line', () => {
    const model = buildSlopeTriangle(widget({ m: -3, n: 2, at: -1, run: 3, resizable: true }))
    expect(model.start).toEqual({ p: { x: -1, y: 5 }, q: { x: 2, y: -4 } })
    expect(model.pDrag).toEqual({ kind: 'on-line', line: model.line })
    expect(model.qDrag).toEqual({ kind: 'on-line', line: model.line })
  })

  it('starts the triangle at the left point', () => {
    expect(slopeTriangle({ x: 3, y: -1 }, { x: 1, y: 3 })).toEqual({
      left: { x: 1, y: 3 },
      right: { x: 3, y: -1 },
      corner: { x: 3, y: 3 },
      run: 2,
      rise: -4,
    })
    expect(slopeTriangle({ x: 0, y: 1 }, { x: 1, y: 3 })).toMatchObject({ corner: { x: 1, y: 1 }, run: 1, rise: 2 })
  })
})

describe('slope triangle: texts and drawing', () => {
  const falling = slopeTriangle({ x: 3, y: -1 }, { x: 1, y: 3 })
  const rising = slopeTriangle({ x: 0, y: 1 }, { x: 1, y: 3 })

  it('names the legs "rechts" and "hoch", with a negative "hoch" for a falling line', () => {
    expect(triangleText(falling)).toBe('rechts 2, hoch −4')
    expect(triangleDescription(rising)).toBe('Steigungsdreieck: rechts 1, hoch 2')
    expect(slopeText(falling)).toBe('m = hoch : rechts = −4 : 2 = −2')
    expect(triangleAnnouncement(falling)).toBe('rechts 2, hoch −4, m = −2')
    expect(slopeLatex(falling)).toBe('m = \\frac{\\text{hoch}}{\\text{rechts}} = \\frac{-4}{2} = -2')
  })

  it('typesets the start state', () => {
    const latex = slopeTriangleLatex(buildSlopeTriangle(widget({ m: -3, n: 2, run: 2 })))
    expect(latex).toEqual(['f(x) = -3x + 2', 'm = \\frac{\\text{hoch}}{\\text{rechts}} = \\frac{-6}{2} = -3'])
    for (const l of latex) expect(() => katex.renderToString(l, { throwOnError: true, strict: 'error' })).not.toThrow()
  })

  it('puts the labels outside the triangle when there is room', () => {
    const labels = triangleLabels(rising, DEFAULT_WINDOW)
    expect(labels.run.text).toBe('rechts 1')
    expect(labels.run.anchor).toBe('middle')
    expect(labels.run.at.x).toBeCloseTo(0.5)
    expect(labels.run.at.y).toBeCloseTo(0.3)
    expect(labels.rise).toMatchObject({ anchor: 'start', text: 'hoch 2' })
    expect(labels.rise.at.x).toBeCloseTo(1.35)
    expect(labels.rise.at.y).toBeCloseTo(2)
    // Falling: "rechts" above the horizontal leg.
    expect(triangleLabels(falling, DEFAULT_WINDOW).run.at.y).toBeCloseTo(3.7)
  })

  it('moves the labels inside near the bottom and the right edge', () => {
    const low = slopeTriangle({ x: 5, y: -8 }, { x: 7, y: -4 })
    const labels = triangleLabels(low, DEFAULT_WINDOW)
    expect(labels.run.at.y).toBeCloseTo(-7.3)
    expect(labels.rise.anchor).toBe('end')
    expect(labels.rise.at.x).toBeCloseTo(6.65)
  })

  it('marks the right angle inside the triangle', () => {
    const [a, b, c] = rightAngleMark(rising)
    expect(a?.x).toBeCloseTo(0.65)
    expect(a?.y).toBeCloseTo(1)
    expect(b?.y).toBeCloseTo(1.35)
    expect(c?.x).toBeCloseTo(1)
    expect(rightAngleMark(falling)[1]?.y).toBeCloseTo(2.65)
  })
})
