import type { Expr } from '../ast'
import type { EquationTask } from '../equations/types'
import type { Rational } from '../rational'
import type { Rng } from '../random'
import type { SubtopicId } from '../tasks/types'

/** The variable of every linear function in Lemmio. */
export const FUNCTION_VARIABLE = 'x'

/** `name(x) = m·x + n`, e.g. f(x) = 2x - 3. Generated functions have integer m and n. */
export interface LinearFunction {
  /** Lowercase letter, usually "f" or "g". */
  name: string
  /** Slope (Steigung). */
  m: Rational
  /** y-intercept (y-Achsenabschnitt). */
  n: Rational
}

/** A point P(x|y) of the coordinate plane. */
export interface Point {
  x: Rational
  y: Rational
}

/** A line through two points: the graph of a linear function, a vertical line, or no line at all. */
export type LineThroughPoints =
  | { kind: 'function'; m: Rational; n: Rational }
  | { kind: 'vertical'; x: Rational }
  | { kind: 'same-point' }

/** Zeros of a linear function: exactly one, none (f(x) = n with n ≠ 0) or every x (f(x) = 0). */
export type FunctionZero = { kind: 'single'; x: Rational } | { kind: 'none' } | { kind: 'all' }

/** Intersection of two graphs: one point, none (parallel) or all points (identical). */
export type Intersection = { kind: 'point'; point: Point } | { kind: 'parallel' } | { kind: 'identical' }

/** One line of a worked solution, e.g. `m = (7 - 3)/(4 - 2) = 2`; `text` can be shown without KaTeX. */
export interface FunctionSolutionLine {
  text: string
  latex: string
  /** German explanation. */
  note?: string
}

interface TaskBase {
  topic: SubtopicId
  /** Generator variant, e.g. "two-points"; useful for tests and later statistics. */
  variant: string
  /** Identity of the exercise; used to avoid repetitions. */
  key: string
  /** German instruction in plain text, including the given data (e.g. P(1|3)). */
  instruction: string
  /** Worked solution. */
  steps: FunctionSolutionLine[]
}

/**
 * Exercise about linear functions. `kind` says what is given and what the
 * learner answers:
 * - `read-equation`: the graph of `fn` is shown; answer `f(x) = …`
 * - `draw-graph`: the equation of `fn` is shown; answer two points of the graph
 * - `from-point-slope`: slope `fn.m` and `point`; answer `f(x) = …`
 * - `from-two-points`: `points`; answer `f(x) = …`
 * - `point-test`: does `point` lie on the graph of `fn`? answer yes/no and `f(a) = …`
 * - `zero`: zero of `fn`; answer `N(z|0)`, `x = z` or "keine Nullstelle"
 * - `intersection`: intersection of the graphs of `fn` and `other`; answer
 *   `S(x|y)`, "parallel" or "identisch"
 *
 * Wherever an equation is solved, `equation` is the same task as in the
 * practice of linear equations, so it can be solved line by line.
 */
export type FunctionTask =
  | (TaskBase & { kind: 'read-equation'; fn: LinearFunction })
  | (TaskBase & { kind: 'draw-graph'; fn: LinearFunction })
  | (TaskBase & { kind: 'from-point-slope'; fn: LinearFunction; point: Point; equation: EquationTask })
  | (TaskBase & {
      kind: 'from-two-points'
      fn: LinearFunction
      points: readonly [Point, Point]
      equation: EquationTask
    })
  | (TaskBase & {
      kind: 'point-test'
      fn: LinearFunction
      point: Point
      /** f(point.x). */
      value: Rational
      onGraph: boolean
    })
  | (TaskBase & { kind: 'zero'; fn: LinearFunction; zero: FunctionZero; equation: EquationTask })
  | (TaskBase & {
      kind: 'intersection'
      fn: LinearFunction
      other: LinearFunction
      /** Right-hand side of `other` as shown in the task; may differ from mx + n (case "identical"). */
      otherExpr: Expr
      intersection: Intersection
      equation: EquationTask
    })

export type FunctionTaskKind = FunctionTask['kind']

export type FunctionTaskGenerator = (rng: Rng) => FunctionTask
