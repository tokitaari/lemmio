// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import type { Vec } from '../math'
import {
  buildDecompose,
  DECOMPOSE_MAX_WIDTH,
  decomposeFrame,
  decomposeLatex,
  decomposeLines,
  decomposeProblems,
  decomposeStepTotal,
  describeDecomposeFrame,
  type DecomposeModel,
  type DecomposePiece,
} from './decompose'
import type { DecomposeWidget } from './types'

const PARALLELOGRAM: DecomposeWidget = { kind: 'decompose', shape: 'parallelogram', measures: { g: 6.5, h: 4 }, offset: 2 }
const TRIANGLE: DecomposeWidget = { kind: 'decompose', shape: 'triangle', measures: { g: 5, h: 4 }, offset: 7 }
const TRAPEZOID: DecomposeWidget = { kind: 'decompose', shape: 'trapezoid', measures: { a: 6, c: 3, h: 3 } }
const RHOMBUS: DecomposeWidget = { kind: 'decompose', shape: 'rhombus', measures: { e: 6, f: 4 } }
const ALL = [PARALLELOGRAM, TRIANGLE, TRAPEZOID, RHOMBUS]

/** Area of a polygon (shoelace). */
function area(points: readonly Vec[]): number {
  let sum = 0
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length] ?? p
    sum += p[0] * q[1] - q[0] * p[1]
  })
  return Math.abs(sum) / 2
}

const piecesArea = (pieces: readonly DecomposePiece[]) => pieces.reduce((sum, p) => sum + area(p.points), 0)

function sameSet(a: readonly Vec[], b: readonly Vec[]): boolean {
  const key = (p: Vec) => `${p[0].toFixed(6)}|${p[1].toFixed(6)}`
  return a.length === b.length && [...a.map(key)].sort().join() === [...b.map(key)].sort().join()
}

function last(model: DecomposeModel) {
  return decomposeFrame(model, decomposeStepTotal(model))
}

describe('decompose checks', () => {
  it('accepts the four shapes', () => {
    for (const widget of ALL) expect(decomposeProblems(widget)).toEqual([])
    expect(decomposeProblems({ ...TRIANGLE, offset: -2 })).toEqual([])
    expect(decomposeProblems({ ...PARALLELOGRAM, offset: undefined })).toEqual([])
  })

  it('needs exactly the lengths of the area formula', () => {
    expect(decomposeProblems({ kind: 'decompose', shape: 'triangle', measures: { g: 6 } })).toEqual(['decompose: missing length h'])
    expect(decomposeProblems({ kind: 'decompose', shape: 'rhombus', measures: { e: 6, f: 4, a: 3 } })).toEqual([
      'decompose: the area formula of a rhombus has no length a',
    ])
  })

  it('needs lengths whole or ending in ,5 within 1…12 cm', () => {
    expect(decomposeProblems({ ...RHOMBUS, measures: { e: 6.25, f: 4 } })).toEqual(['decompose: e must be whole or end in ,5'])
    expect(decomposeProblems({ ...RHOMBUS, measures: { e: 13, f: 4 } })).toEqual(['decompose: e must lie within 1…12 cm'])
  })

  it('needs a trapezoid with c < a', () => {
    expect(decomposeProblems({ ...TRAPEZOID, measures: { a: 4, c: 4, h: 3 } })).toEqual(['decompose: c must be shorter than a'])
  })

  it('checks the offset', () => {
    expect(decomposeProblems({ ...RHOMBUS, offset: 1 })).toEqual(['decompose: a rhombus has no offset'])
    expect(decomposeProblems({ ...TRIANGLE, offset: 0.3 })).toEqual(['decompose: offset must be a multiple of 0,5 in -6…12'])
    const parallelogram = 'decompose: a parallelogram needs 0 < offset ≤ g, so that the height lies inside and a triangle can be cut off'
    expect(decomposeProblems({ ...PARALLELOGRAM, offset: 0 })).toEqual([parallelogram])
    expect(decomposeProblems({ ...PARALLELOGRAM, offset: 7 })).toEqual([parallelogram])
    expect(decomposeProblems({ ...PARALLELOGRAM, offset: 6.5 })).toEqual([])
  })

  it('keeps every frame narrow enough for a small screen', () => {
    const [problem] = decomposeProblems({ ...TRAPEZOID, measures: { a: 12, c: 8, h: 3 } })
    expect(problem).toMatch(/^decompose: the figure grows to [\d.]+ cm, at most 16 cm fit$/)
    for (const widget of ALL) {
      const { bounds } = buildDecompose(widget)
      expect(bounds.maxX - bounds.minX).toBeLessThanOrEqual(DECOMPOSE_MAX_WIDTH)
    }
  })
})

describe('decompose frames', () => {
  it('has the start and three steps for every shape', () => {
    for (const widget of ALL) {
      const model = buildDecompose(widget)
      expect(model.frames).toHaveLength(4)
      expect(decomposeStepTotal(model)).toBe(3)
    }
  })

  it('cuts the parallelogram at the height and moves the triangle by g to a rectangle', () => {
    const model = buildDecompose(PARALLELOGRAM)
    const [start, cut, moved, rectangle] = model.frames
    expect(start?.pieces.map((p) => p.id)).toEqual(['whole'])
    expect(cut?.cut).toEqual([
      [2, 4],
      [2, 0],
    ])
    const part = cut?.pieces.find((p) => p.id === 'part')
    expect(part?.points).toEqual([
      [0, 0],
      [2, 0],
      [2, 4],
    ])
    expect(part?.enter).toEqual({ kind: 'appear' })
    const after = moved?.pieces.find((p) => p.id === 'part')
    expect(after?.enter).toEqual({ kind: 'translate', by: [6.5, 0] })
    expect(after?.points).toEqual([
      [6.5, 0],
      [8.5, 0],
      [8.5, 4],
    ])
    // The area stays: the pieces fill the rectangle 6,5 × 4.
    expect(piecesArea(rectangle?.pieces ?? [])).toBeCloseTo(26)
    expect(rectangle?.outlines).toEqual([
      {
        id: 'result',
        kind: 'result',
        appears: true,
        points: [
          [2, 0],
          [8.5, 0],
          [8.5, 4],
          [2, 4],
        ],
      },
    ])
    expect(decomposeLines(model, 3).map((l) => l.text)).toEqual(['A = g·h = 6,5·4 = 26 cm²'])
  })

  it('drops the foot as an extra vertex when it is B', () => {
    const model = buildDecompose({ ...PARALLELOGRAM, offset: 6.5 })
    expect(decomposeFrame(model, 1).pieces.find((p) => p.id === 'rest')?.points).toHaveLength(3)
  })

  it('turns a copy of the triangle and of the trapezoid by 180° about the midpoint of BC', () => {
    for (const widget of [TRIANGLE, TRAPEZOID]) {
      const model = buildDecompose(widget)
      const original = model.frames[0]?.pieces[0]
      const turned = model.frames[1]
      const copy = turned?.pieces.find((p) => p.id === 'copy')
      const [, b, c] = original?.points ?? []
      if (!original || !copy || !b || !c || !turned?.center) throw new Error('missing piece')
      expect(turned.center).toEqual([(b[0] + c[0]) / 2, (b[1] + c[1]) / 2])
      expect(copy.enter).toEqual({ kind: 'rotate', about: turned.center })
      const m = turned.center
      expect(sameSet(copy.points, original.points.map((p): Vec => [2 * m[0] - p[0], 2 * m[1] - p[1]]))).toBe(true)
      // Together twice the area, and exactly the outlined parallelogram.
      const together = model.frames[2]
      const outline = together?.outlines[0]
      expect(outline?.kind).toBe('result')
      expect(piecesArea(together?.pieces ?? [])).toBeCloseTo(2 * area(original.points))
      expect(area(outline?.points ?? [])).toBeCloseTo(2 * area(original.points))
      expect(last(model).pieces.find((p) => p.id === 'copy')?.faded).toBe(true)
    }
  })

  it('writes the doubled area first, then the half', () => {
    expect(decomposeLines(buildDecompose(TRIANGLE), 3).map((l) => l.text)).toEqual([
      'Parallelogramm: g·h = 5·4 = 20 cm²',
      'A = g·h/2 = 5·4/2 = 10 cm²',
    ])
    expect(decomposeLines(buildDecompose(TRAPEZOID), 3).map((l) => l.text)).toEqual([
      'Parallelogramm: (a + c)·h = (6 + 3)·3 = 9·3 = 27 cm²',
      'A = (a + c)·h/2 = (6 + 3)·3/2 = 9·3/2 = 13,5 cm²',
    ])
    expect(decomposeLines(buildDecompose(TRIANGLE), 1)).toEqual([])
  })

  it('labels a and c side by side below the base of the doubled trapezoid', () => {
    const labels = decomposeFrame(buildDecompose(TRAPEZOID), 2).figure.labels
    expect(labels.map((l) => l.letter)).toEqual(['a', 'c', 'h'])
    expect(labels.slice(0, 2).map((l) => [l.from, l.to])).toEqual([
      [
        [0, 0],
        [6, 0],
      ],
      [
        [6, 0],
        [9, 0],
      ],
    ])
    const height = labels[2]
    expect(height?.kind).toBe('height')
    expect(height?.to[0]).toBeCloseTo(1.5)
    expect(height?.to[1]).toBeCloseTo(0)
  })

  it('fills the rectangle e × f with the rhombus and four turned copies', () => {
    const model = buildDecompose(RHOMBUS)
    const rhombus = model.frames[0]?.pieces[0]?.points ?? []
    expect(model.frames[1]?.outlines).toEqual([
      {
        id: 'guide',
        kind: 'guide',
        appears: true,
        points: [
          [0, -2],
          [6, -2],
          [6, 2],
          [0, 2],
        ],
      },
    ])
    const corners = model.frames[2]?.pieces.filter((p) => p.tone === 'copy') ?? []
    expect(corners.map((p) => p.order)).toEqual([0, 1, 2, 3])
    expect(corners.every((p) => p.enter?.kind === 'rotate')).toBe(true)
    // The bottom left corner: the triangle A, B, M turned about the midpoint of AB.
    expect(sameSet(corners[0]?.points ?? [], [[0, 0], [3, -2], [0, -2]])).toBe(true)
    expect(piecesArea(last(model).pieces)).toBeCloseTo(24)
    expect(area(rhombus)).toBeCloseTo(12)
    expect(decomposeLines(model, 3).map((l) => l.text)).toEqual(['Rechteck: e·f = 6·4 = 24 cm²', 'A = e·f/2 = 6·4/2 = 12 cm²'])
  })

  it('holds every frame in its bounds', () => {
    for (const widget of ALL) {
      const model = buildDecompose(widget)
      for (const f of model.frames) {
        for (const p of [...f.pieces.flatMap((piece) => piece.points), ...f.outlines.flatMap((o) => o.points)]) {
          expect(p[0]).toBeGreaterThanOrEqual(model.bounds.minX)
          expect(p[0]).toBeLessThanOrEqual(model.bounds.maxX)
          expect(p[1]).toBeGreaterThanOrEqual(model.bounds.minY)
          expect(p[1]).toBeLessThanOrEqual(model.bounds.maxY)
        }
      }
    }
  })
})

describe('decompose texts', () => {
  it('describes the start with the numbers', () => {
    expect(decomposeFrame(buildDecompose(PARALLELOGRAM), 0).caption).toBe(
      'Ein Parallelogramm mit der Grundseite g = 6,5 cm und der Höhe h = 4 cm.',
    )
    expect(decomposeFrame(buildDecompose(TRAPEZOID), 0).caption).toBe(
      'Ein Trapez mit den parallelen Seiten a = 6 cm und c = 3 cm und der Höhe h = 3 cm.',
    )
    expect(decomposeFrame(buildDecompose(RHOMBUS), 0).caption).toBe('Eine Raute mit den Diagonalen e = 6 cm und f = 4 cm.')
  })

  it('announces a step with its caption and its new lines', () => {
    const model = buildDecompose(TRIANGLE)
    expect(describeDecomposeFrame(model, 1)).toBe('Drehe eine Kopie des Dreiecks um 180° um den Punkt M in der Mitte einer Seite.')
    expect(describeDecomposeFrame(model, 2)).toBe(
      'Dreieck und Kopie bilden zusammen ein Parallelogramm mit der Grundseite g und der Höhe h. Parallelogramm: g·h = 5·4 = 20 cm².',
    )
    expect(describeDecomposeFrame(buildDecompose(PARALLELOGRAM), 2)).toBe(
      'Schiebe das Dreieck um g = 6,5 cm nach rechts an die andere Seite.',
    )
  })

  it('typesets every calculation line', () => {
    for (const widget of ALL) {
      const latex = decomposeLatex(buildDecompose(widget))
      expect(latex.length).toBeGreaterThan(0)
      for (const line of latex) expect(() => katex.renderToString(line, { strict: 'error' })).not.toThrow()
    }
    expect(decomposeLatex(buildDecompose(TRIANGLE))[0]).toBe('\\text{Parallelogramm: } g \\cdot h = 5 \\cdot 4 = 20\\,\\text{cm}^{2}')
  })
})
