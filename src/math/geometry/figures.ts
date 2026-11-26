import type { FigureLabel, Letter, Measures, ShapeKind, TaskFigure, Vec } from './types'

/** Which vertices (indices into A, B, C, D) a side letter joins. */
const SIDES: Readonly<Record<ShapeKind, Partial<Record<Letter, readonly [number, number]>>>> = {
  parallelogram: { g: [0, 1], a: [0, 1], b: [1, 2] },
  triangle: { g: [0, 1], c: [0, 1], a: [1, 2], b: [2, 0] },
  rhombus: { a: [0, 1] },
  trapezoid: { a: [0, 1], b: [1, 2], c: [3, 2], d: [3, 0] },
}

/** Diagonals of the rhombus: e = AC, f = BD. */
const DIAGONALS: Partial<Record<Letter, readonly [number, number]>> = { e: [0, 2], f: [1, 3] }

/** The vertex from which the height h goes down to the line AB. */
const HEIGHT_TOP: Readonly<Record<ShapeKind, number>> = { parallelogram: 3, triangle: 2, rhombus: 3, trapezoid: 3 }

/** Foot of the perpendicular from p onto the line through a and b. */
export function footOn(p: Vec, a: Vec, b: Vec): Vec {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
  return [a[0] + t * dx, a[1] + t * dy]
}

/**
 * Figure with the vertices and the labelled lengths `labelled` (in this
 * order). `unknown` is labelled as asked for ("h = ?").
 *
 * @throws RangeError if a letter has no length or does not belong to the shape.
 */
export function buildFigure(
  shape: ShapeKind,
  vertices: readonly Vec[],
  labelled: readonly Letter[],
  measures: Measures,
  unknown?: Letter,
): TaskFigure {
  const at = (i: number): Vec => {
    const vertex = vertices[i]
    if (!vertex) throw new RangeError(`A ${shape} has no vertex ${i}`)
    return vertex
  }
  const labels = labelled.map((letter): FigureLabel => {
    const value = measures[letter]
    if (!value) throw new RangeError(`No length for ${letter}`)
    const given = letter !== unknown
    if (letter === 'h') {
      const top = at(HEIGHT_TOP[shape])
      return { letter, value, given, kind: 'height', from: top, to: footOn(top, at(0), at(1)) }
    }
    const diagonal = shape === 'rhombus' ? DIAGONALS[letter] : undefined
    const segment = diagonal ?? SIDES[shape][letter]
    if (!segment) throw new RangeError(`A ${shape} has no length ${letter}`)
    return { letter, value, given, kind: diagonal ? 'diagonal' : 'side', from: at(segment[0]), to: at(segment[1]) }
  })
  return {
    shape,
    vertices,
    labels,
    diagonals: shape === 'rhombus' && labelled.some((letter) => letter === 'e' || letter === 'f'),
  }
}

/** Parallelogram ABCD with base a = AB, height h and the top side shifted by `offset`. */
export function parallelogramVertices(a: number, h: number, offset: number): Vec[] {
  return [
    [0, 0],
    [a, 0],
    [a + offset, h],
    [offset, h],
  ]
}

/** Triangle ABC with base g = AB, height h and apex C above x = offset (outside AB for an obtuse triangle). */
export function triangleVertices(g: number, h: number, offset: number): Vec[] {
  return [
    [0, 0],
    [g, 0],
    [offset, h],
  ]
}

/** Triangle with the sides a = BC, b = CA and c = AB; undefined if there is no such triangle. */
export function triangleFromSides(a: number, b: number, c: number): Vec[] | undefined {
  const x = (b * b + c * c - a * a) / (2 * c)
  const y2 = b * b - x * x
  if (!(y2 > 0)) return undefined
  return [
    [0, 0],
    [c, 0],
    [x, Math.sqrt(y2)],
  ]
}

/** Rhombus with the diagonals e = AC (horizontal) and f = BD (vertical). */
export function rhombusFromDiagonals(e: number, f: number): Vec[] {
  return [
    [0, 0],
    [e / 2, -f / 2],
    [e, 0],
    [e / 2, f / 2],
  ]
}

/** Rhombus with side a and an angle of 60° at A. */
export function rhombusFromSide(a: number): Vec[] {
  const dx = a / 2
  const dy = (a * Math.sqrt(3)) / 2
  return [
    [0, 0],
    [a, 0],
    [a + dx, dy],
    [dx, dy],
  ]
}

/** Trapezoid ABCD with AB ∥ CD: a = AB, c = CD, height h, D above x = offset. */
export function trapezoidVertices(a: number, c: number, h: number, offset: number): Vec[] {
  return [
    [0, 0],
    [a, 0],
    [offset + c, h],
    [offset, h],
  ]
}

/**
 * Trapezoid with the parallel sides a = AB > c = CD and the legs b = BC,
 * d = DA; undefined if there is no such trapezoid.
 */
export function trapezoidFromSides(a: number, b: number, c: number, d: number): Vec[] | undefined {
  const s = a - c
  if (!(s > 0)) return undefined
  const offset = (s * s - b * b + d * d) / (2 * s)
  const h2 = d * d - offset * offset
  if (!(h2 > 0)) return undefined
  return trapezoidVertices(a, c, Math.sqrt(h2), offset)
}
