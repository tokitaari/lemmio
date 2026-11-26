import { equalPoints } from '../functions/analysis'
import type { Point } from '../functions/types'
import { Rational } from '../rational'

// Exact analysis of polygons on the grid. Points are Rational, so every
// test (parallel, perpendicular, equal lengths, area) is exact.

const TWO = Rational.of(2)

function minus(p: Point, q: Point): Point {
  return { x: p.x.sub(q.x), y: p.y.sub(q.y) }
}

function plus(p: Point, q: Point): Point {
  return { x: p.x.add(q.x), y: p.y.add(q.y) }
}

/** p + (q − r), e.g. the fourth vertex D = A + (C − B) of a parallelogram ABCD. */
export function translate(p: Point, q: Point, r: Point): Point {
  return plus(p, minus(q, r))
}

/** Cross product of the vectors u and v (z-component). */
export function cross(u: Point, v: Point): Rational {
  return u.x.mul(v.y).sub(u.y.mul(v.x))
}

export function dot(u: Point, v: Point): Rational {
  return u.x.mul(v.x).add(u.y.mul(v.y))
}

/** -1, 0 or 1: whether c lies right of, on or left of the line from a to b. */
function orientation(a: Point, b: Point, c: Point): number {
  return cross(minus(b, a), minus(c, a)).sign()
}

/** Square of the distance between a and b (exact, unlike the distance itself). */
export function squaredDistance(a: Point, b: Point): Rational {
  const d = minus(b, a)
  return dot(d, d)
}

function bigintSqrt(n: bigint): bigint | undefined {
  if (n < 0n) return undefined
  if (n < 2n) return n
  let x = BigInt(Math.floor(Math.sqrt(Number(n))))
  while (x * x > n) x--
  while ((x + 1n) * (x + 1n) <= n) x++
  return x * x === n ? x : undefined
}

/** The distance between a and b if it is a rational number (e.g. on axis-parallel lines), otherwise undefined. */
export function exactDistance(a: Point, b: Point): Rational | undefined {
  const square = squaredDistance(a, b)
  const num = bigintSqrt(square.num)
  const den = bigintSqrt(square.den)
  return num !== undefined && den !== undefined ? Rational.of(num, den) : undefined
}

/** Signed area by the shoelace formula; positive for counterclockwise vertices. */
export function signedArea(polygon: readonly Point[]): Rational {
  let sum = Rational.ZERO
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length]
    if (q) sum = sum.add(cross(p, q))
  })
  return sum.div(TWO)
}

export function polygonArea(polygon: readonly Point[]): Rational {
  return signedArea(polygon).abs()
}

/** True if p lies on the line through a and b (a ≠ b). */
export function isOnLine(p: Point, a: Point, b: Point): boolean {
  return orientation(a, b, p) === 0
}

/** True if the lines AB and CD are parallel; false if one of them is a single point. */
export function areParallel(a: Point, b: Point, c: Point, d: Point): boolean {
  if (equalPoints(a, b) || equalPoints(c, d)) return false
  return cross(minus(b, a), minus(d, c)).isZero()
}

/** True if the lines AB and CD are perpendicular; false if one of them is a single point. */
export function arePerpendicular(a: Point, b: Point, c: Point, d: Point): boolean {
  if (equalPoints(a, b) || equalPoints(c, d)) return false
  return dot(minus(b, a), minus(d, c)).isZero()
}

/** Foot of the perpendicular from p onto the line through a and b (a ≠ b). */
export function footOfPerpendicular(p: Point, a: Point, b: Point): Point {
  const ab = minus(b, a)
  const t = dot(minus(p, a), ab).div(dot(ab, ab))
  return { x: a.x.add(t.mul(ab.x)), y: a.y.add(t.mul(ab.y)) }
}

/** Position of the foot of p on AB: 0 at a, 1 at b; below 0 or above 1 on the extension. */
export function lineParameter(p: Point, a: Point, b: Point): Rational {
  const ab = minus(b, a)
  return dot(minus(p, a), ab).div(dot(ab, ab))
}

/** For a point c on the line AB: true if it lies between a and b (ends included). */
function onSegment(c: Point, a: Point, b: Point): boolean {
  const min = (p: Rational, q: Rational) => (p.compare(q) < 0 ? p : q)
  const max = (p: Rational, q: Rational) => (p.compare(q) > 0 ? p : q)
  return (
    c.x.compare(min(a.x, b.x)) >= 0 &&
    c.x.compare(max(a.x, b.x)) <= 0 &&
    c.y.compare(min(a.y, b.y)) >= 0 &&
    c.y.compare(max(a.y, b.y)) <= 0
  )
}

/** True if the segments AB and CD have a point in common (touching counts). */
export function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  if (o1 * o2 < 0 && o3 * o4 < 0) return true
  return (
    (o1 === 0 && onSegment(c, a, b)) ||
    (o2 === 0 && onSegment(d, a, b)) ||
    (o3 === 0 && onSegment(a, c, d)) ||
    (o4 === 0 && onSegment(b, c, d))
  )
}

/**
 * True for a proper polygon: at least three different vertices, no vertex
 * on the line through its neighbours (not degenerate) and no two
 * non-adjacent sides that meet (not self-intersecting).
 */
export function isSimplePolygon(polygon: readonly Point[]): boolean {
  const n = polygon.length
  if (n < 3) return false
  const at = (i: number): Point => polygon[((i % n) + n) % n] as Point
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) if (equalPoints(at(i), at(j))) return false
    if (orientation(at(i - 1), at(i), at(i + 1)) === 0) return false
  }
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      if (segmentsIntersect(at(i), at(i + 1), at(j), at(j + 1))) return false
    }
  }
  return true
}

/** What a quadrilateral ABCD is; all false for a polygon that is not simple. */
export interface QuadrilateralKind {
  /** AB ∥ CD or BC ∥ AD. */
  trapezoid: boolean
  /** AB ∥ CD and BC ∥ AD. */
  parallelogram: boolean
  /** A parallelogram with four sides of equal length. */
  rhombus: boolean
}

export function classifyQuadrilateral(polygon: readonly Point[]): QuadrilateralKind {
  const [a, b, c, d] = polygon
  if (!a || !b || !c || !d || polygon.length !== 4 || !isSimplePolygon(polygon)) {
    return { trapezoid: false, parallelogram: false, rhombus: false }
  }
  const first = areParallel(a, b, d, c)
  const second = areParallel(b, c, a, d)
  const parallelogram = first && second
  return {
    trapezoid: first || second,
    parallelogram,
    rhombus: parallelogram && squaredDistance(a, b).equals(squaredDistance(b, c)),
  }
}
