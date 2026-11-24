import { num, type Expr } from '../ast'
import { solveEquation } from '../equations/equation'
import { polynomialToExpr } from '../normalize'
import { Polynomial } from '../polynomial'
import { Rational } from '../rational'
import {
  FUNCTION_VARIABLE,
  type FunctionZero,
  type Intersection,
  type LinearFunction,
  type LineThroughPoints,
  type Point,
} from './types'

const toRational = (value: number | Rational): Rational => (value instanceof Rational ? value : Rational.of(value))

/** `name(x) = m·x + n`; numbers must be integers when given as numbers. */
export function linearFunction(name: string, m: number | Rational, n: number | Rational): LinearFunction {
  return { name, m: toRational(m), n: toRational(n) }
}

/** P(x|y); numbers must be integers when given as numbers. */
export function point(x: number | Rational, y: number | Rational): Point {
  return { x: toRational(x), y: toRational(y) }
}

export function equalPoints(a: Point, b: Point): boolean {
  return a.x.equals(b.x) && a.y.equals(b.y)
}

/** `m·x + n` as a polynomial in x. */
export function functionPolynomial(fn: LinearFunction): Polynomial {
  return Polynomial.monomial(fn.m, { [FUNCTION_VARIABLE]: 1 }).add(Polynomial.constant(fn.n))
}

/** Right-hand side `mx + n` in canonical form, e.g. `2x - 3`, `-x`, `5` or `0`. */
export function functionExpr(fn: LinearFunction): Expr {
  return polynomialToExpr(functionPolynomial(fn))
}

/** Function value f(x). */
export function valueAt(fn: LinearFunction, x: Rational): Rational {
  return fn.m.mul(x).add(fn.n)
}

/** Punktprobe: true if P lies on the graph of f. */
export function isOnGraph(fn: LinearFunction, p: Point): boolean {
  return valueAt(fn, p.x).equals(p.y)
}

/** m = (y₂ − y₁) / (x₂ − x₁); undefined if both points have the same x (vertical line or same point). */
export function slopeFromPoints(p: Point, q: Point): Rational | undefined {
  const dx = q.x.sub(p.x)
  return dx.isZero() ? undefined : q.y.sub(p.y).div(dx)
}

/**
 * The line through two points, e.g. two points drawn by the learner. A drawn
 * graph is right if this line is the graph of the expected function, whichever
 * two points were chosen.
 */
export function lineThroughPoints(p: Point, q: Point): LineThroughPoints {
  if (equalPoints(p, q)) return { kind: 'same-point' }
  const m = slopeFromPoints(p, q)
  if (m === undefined) return { kind: 'vertical', x: p.x }
  return { kind: 'function', m, n: p.y.sub(m.mul(p.x)) }
}

/** Zeros of f: the solution of f(x) = 0. */
export function zeroOf(fn: LinearFunction): FunctionZero {
  if (!fn.m.isZero()) return { kind: 'single', x: fn.n.neg().div(fn.m) }
  return fn.n.isZero() ? { kind: 'all' } : { kind: 'none' }
}

/**
 * Intersection of the graphs of f and g, found like in class: set the terms
 * equal, solve the equation (see src/math/equations), insert x into f.
 */
export function intersect(f: LinearFunction, g: LinearFunction): Intersection {
  const solution = solveEquation({ left: functionExpr(f), right: functionExpr(g) })
  // Both sides are linear in x, so the equation is always solvable.
  if (!solution) throw new RangeError('Linear functions always give a linear equation')
  switch (solution.kind) {
    case 'single':
      return { kind: 'point', point: { x: solution.value, y: valueAt(f, solution.value) } }
    case 'empty':
      return { kind: 'parallel' }
    case 'all':
      return { kind: 'identical' }
  }
}

/**
 * Replaces every occurrence of the variable `name` by `value`, e.g. `3x - 1`
 * with x = 2 → `3·2 - 1` and `-x + 4` with x = -2 → `-(-2) + 4`. Used for
 * worked solutions; the printer adds dots and brackets.
 */
export function substitute(expr: Expr, name: string, value: Rational): Expr {
  const replace = (e: Expr): Expr => {
    switch (e.type) {
      case 'num':
        return e
      case 'var':
        return e.name === name ? num(value) : e
      case 'add':
        return { ...e, terms: e.terms.map(replace) }
      case 'neg':
        return { ...e, arg: replace(e.arg) }
      case 'mul':
        return { ...e, factors: e.factors.map(replace) }
      case 'div':
        return { ...e, num: replace(e.num), den: replace(e.den) }
      case 'pow':
        return { ...e, base: replace(e.base) }
      case 'group':
        return { ...e, body: replace(e.body) }
    }
  }
  return replace(expr)
}
