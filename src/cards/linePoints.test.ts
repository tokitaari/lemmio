// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { lineEquationText, lineLatex } from './lineCommon'
import { buildLinePoints, lineAnnouncement, linePointsLatex, linePointsProblems, lineThrough, tableCells, verticalNote } from './linePoints'
import type { LinePointsWidget } from './types'

const widget = (extra: Partial<LinePointsWidget> = {}): LinePointsWidget => ({
  kind: 'line-points',
  points: [
    [0, -3],
    [2, 1],
  ],
  ...extra,
})

describe('line points: checks', () => {
  it('accepts two different grid points in the window', () => {
    expect(linePointsProblems(widget())).toEqual([])
    expect(linePointsProblems(widget({ table: false, target: { m: 1, n: 0 } }))).toEqual([])
  })

  it('reports points that are not grid points of the window or the same', () => {
    expect(linePointsProblems(widget({ points: [[0.5, 0], [9, 0]] }))).toEqual([
      'line-points: P must have whole coordinates',
      'line-points: Q(9|0) lies outside the window',
    ])
    expect(linePointsProblems(widget({ points: [[1, 1], [1, 1]] }))).toEqual(['line-points: P and Q must be different points'])
  })

  it('checks the x values of the table', () => {
    expect(linePointsProblems(widget({ table: [] }))).toEqual(['line-points: table needs 1 to 7 x values'])
    expect(linePointsProblems(widget({ table: [1, 2, 3, 4, 5, 6, 7, 8] }))).toEqual(['line-points: table needs 1 to 7 x values'])
    expect(linePointsProblems(widget({ table: [1, 1] }))).toEqual(['line-points: table x values must be different'])
    expect(linePointsProblems(widget({ table: [1.5, 30] }))).toEqual([
      'line-points: table x values must be whole numbers within −20…20',
    ])
  })

  it('needs a target other than the start', () => {
    expect(linePointsProblems(widget({ target: { m: 2, n: -3 } }))).toEqual(['line-points: target equals the start'])
    expect(linePointsProblems(widget({ target: { m: 2, n: 10 } }))).toEqual(['line-points: target n = 10 lies outside the window'])
  })
})

describe('line points: line and table', () => {
  it('builds the model with the default table', () => {
    const model = buildLinePoints(widget())
    expect(model.start).toEqual([
      { x: 0, y: -3 },
      { x: 2, y: 1 },
    ])
    expect(model.table).toEqual([-2, -1, 0, 1, 2])
    expect(buildLinePoints(widget({ table: false })).table).toEqual([])
  })

  it('gives the line through the points, also with a fraction as slope', () => {
    const line = lineThrough({ x: 0, y: -3 }, { x: 2, y: 1 })
    expect(line && lineEquationText(line, 'f')).toBe('f(x) = 2x − 3')
    const half = lineThrough({ x: 0, y: 0 }, { x: 2, y: 1 })
    expect(half && lineEquationText(half, 'f')).toBe('f(x) = (1/2)x')
    expect(half && lineLatex(half, 'f')).toBe('f(x) = \\frac{1}{2}x')
    expect(lineThrough({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull()
  })

  it('fills the table and marks the columns of P and Q', () => {
    const half = lineThrough({ x: 0, y: 0 }, { x: 2, y: 1 })
    if (!half) throw new Error('missing line')
    const cells = tableCells(half, [-2, -1, 0, 1, 2], [
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ])
    expect(cells.map((c) => c.latex)).toEqual(['-1', '-\\frac{1}{2}', '0', '\\frac{1}{2}', '1'])
    expect(cells.map((c) => c.points)).toEqual([[], [], ['P'], [], ['Q']])
  })

  it('names a vertical line as no function', () => {
    const line = lineThrough({ x: 2, y: 0 }, { x: 2, y: 3 })
    if (!line || line.kind !== 'vertical') throw new Error('expected a vertical line')
    expect(tableCells(line, [1, 2], [
      { x: 2, y: 0 },
      { x: 2, y: 3 },
    ]).map((c) => c.value)).toEqual([null, null])
    expect(verticalNote(line)).toBe('Senkrechte Gerade: keine Funktion, denn zu x = 2 gehören viele y-Werte.')
    expect(lineAnnouncement(line, 'f')).toBe('x = 2. Senkrechte Gerade: keine Funktion, denn zu x = 2 gehören viele y-Werte.')
    expect(lineLatex(line, 'f')).toBe('x = 2')
  })

  it('typesets the start state', () => {
    const latex = linePointsLatex(buildLinePoints(widget()))
    expect(latex).toEqual(['f(x) = 2x - 3', '-7', '-5', '-3', '-1', '1'])
    for (const l of latex) expect(() => katex.renderToString(l, { throwOnError: true, strict: 'error' })).not.toThrow()
    expect(lineAnnouncement(lineThrough({ x: 0, y: -3 }, { x: 2, y: 1 }), 'f')).toBe('Gerade f(x) = 2x − 3')
    expect(lineAnnouncement(null, 'f')).toBe('')
  })
})
