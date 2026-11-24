import { unwrapGroups } from '../ast'
import { isPlainNumber, linearParts, parseEquation } from '../equations/equation'
import { TermError, toErrorInfo, type TermErrorInfo } from '../errors'
import { checkForm, formHint, type FormHint } from '../form'
import { toPolynomial } from '../normalize'
import { Rational } from '../rational'
import { equalPoints, functionPolynomial, lineThroughPoints, valueAt } from './analysis'
import { readFunction, readFunctionValue, readPoint } from './read'
import { FUNCTION_VARIABLE, type FunctionZero, type Intersection, type LinearFunction, type Point } from './types'

type Invalid = { kind: 'invalid'; error: TermErrorInfo }
type WrongForm = { kind: 'wrong-form'; hint: FormHint }

function wrongName(name: string): WrongForm {
  const message = `Die Funktion heißt ${name}: Schreibe ${name}(x) = …`
  return { kind: 'wrong-form', hint: { code: 'wrong-name', message } }
}

export type FunctionCheckResult =
  /** The right function, written as `mx + n`. */
  | { kind: 'correct' }
  /** Not the expected function; `slope`/`intercept` tell whether m and n are right. */
  | { kind: 'wrong'; slope: boolean; intercept: boolean }
  /** The right function, but another name or not simplified (e.g. `2(x + 1)`). */
  | WrongForm
  | Invalid

/**
 * Checks a function equation such as `f(x) = 2x - 3` (also `y = …` or the
 * right-hand side alone): first equivalence to `mx + n`, then the name and the
 * form (summands simplified and combined, order free).
 */
export function checkFunction(expected: LinearFunction, input: string): FunctionCheckResult {
  const read = readFunction(input)
  if (!read.ok) return { kind: 'invalid', error: read.error }
  if (!read.polynomial.equals(functionPolynomial(expected))) {
    const parts = linearParts(read.polynomial)
    return {
      kind: 'wrong',
      slope: parts !== undefined && parts.slope.equals(expected.m),
      intercept: parts !== undefined && parts.constant.equals(expected.n),
    }
  }
  if (read.name !== undefined && read.name !== expected.name) return wrongName(expected.name)
  const hint = checkForm(read.expr, { kind: 'expanded' })
  return hint ? { kind: 'wrong-form', hint } : { kind: 'correct' }
}

export type PointCheckResult =
  | { kind: 'correct' }
  /** Another point; `x`/`y` tell which coordinates are right. */
  | { kind: 'wrong'; x: boolean; y: boolean }
  /** The right point, but a coordinate is not worked out (e.g. `P(2|2·3)`). */
  | WrongForm
  | Invalid

/** Checks a point such as `P(2|5)`; the label is not checked. */
export function checkPoint(expected: Point, input: string): PointCheckResult {
  const read = readPoint(input)
  if (!read.ok) return { kind: 'invalid', error: read.error }
  if (!equalPoints(read.point, expected)) {
    return { kind: 'wrong', x: read.point.x.equals(expected.x), y: read.point.y.equals(expected.y) }
  }
  if (!isPlainNumber(read.xExpr) || !isPlainNumber(read.yExpr)) {
    return { kind: 'wrong-form', hint: formHint('unevaluated-coordinate') }
  }
  return { kind: 'correct' }
}

export type DrawnLineCheckResult =
  | { kind: 'correct' }
  /** Another line; `slope`/`intercept` tell whether m and n are right. */
  | { kind: 'wrong'; slope: boolean; intercept: boolean }
  /** The points lie on a vertical line, which is not the graph of a function. */
  | { kind: 'vertical' }
  /** Both points are the same, so they do not determine a line. */
  | { kind: 'same-point' }

/**
 * Checks a graph drawn through two points (acceptance criterion 3): only the
 * line counts, not which of its points were chosen.
 */
export function checkDrawnLine(expected: LinearFunction, p: Point, q: Point): DrawnLineCheckResult {
  const line = lineThroughPoints(p, q)
  if (line.kind !== 'function') return line.kind === 'vertical' ? { kind: 'vertical' } : { kind: 'same-point' }
  const slope = line.m.equals(expected.m)
  const intercept = line.n.equals(expected.n)
  return slope && intercept ? { kind: 'correct' } : { kind: 'wrong', slope, intercept }
}

export type FunctionValueCheckResult =
  | { kind: 'correct' }
  /**
   * `argument` is false if another x was inserted than asked for; `value` is
   * false if a term of the chain is not f(argument).
   */
  | { kind: 'wrong'; argument: boolean; value: boolean }
  /** Right, but another name or the result is not a single number. */
  | WrongForm
  | Invalid

/**
 * Checks a function value such as `f(2) = 5` or `f(2) = 3·2 - 1 = 5`. If `x`
 * is given, the learner must insert exactly this number (Punktprobe).
 */
export function checkFunctionValue(fn: LinearFunction, input: string, x?: Rational): FunctionValueCheckResult {
  const read = readFunctionValue(input)
  if (!read.ok) return { kind: 'invalid', error: read.error }
  const argument = x === undefined || read.argument.equals(x)
  const expected = valueAt(fn, read.argument)
  const value = read.values.every((v) => v.value.equals(expected))
  if (!argument || !value) return { kind: 'wrong', argument, value }
  if (read.name !== fn.name) return wrongName(fn.name)
  const last = read.values[read.values.length - 1]
  if (!last || !isPlainNumber(last.expr) || !isPlainNumber(read.argumentExpr)) {
    return { kind: 'wrong-form', hint: formHint('unevaluated-value') }
  }
  return { kind: 'correct' }
}

/** The answer to "Berechne die Nullstelle": typed text, or the key "keine Nullstelle". */
export type ZeroAnswer = { kind: 'input'; input: string } | { kind: 'none' }

export type ZeroCheckResult =
  | { kind: 'correct' }
  /** Wrong; `notOnAxis` is true for a point whose y-coordinate is not 0. */
  | { kind: 'wrong'; notOnAxis: boolean }
  | WrongForm
  | Invalid

const ZERO_HINT = 'Gib die Nullstelle als Punkt N(-2|0) oder als x = -2 an.'

/** Reads `N(-2|0)`, `(-2|0)` or `x = -2`. */
function readZeroAnswer(
  input: string,
): { ok: true; point: Point; plain: boolean } | { ok: false; error: TermErrorInfo } {
  if (input.includes('(') && !input.includes('=')) {
    const read = readPoint(input)
    if (!read.ok) return read
    return { ok: true, point: read.point, plain: isPlainNumber(read.xExpr) && isPlainNumber(read.yExpr) }
  }
  try {
    if (input.trim() === '') throw new TermError('empty', ZERO_HINT, 0, 0)
    if (!input.includes('=')) throw new TermError('invalid-point', ZERO_HINT, 0, input.length)
    const equation = parseEquation(input)
    const left = unwrapGroups(equation.left)
    const value = toPolynomial(equation.right).constantValue()
    if (left.type !== 'var' || left.name !== FUNCTION_VARIABLE || value === undefined) {
      throw new TermError('invalid-point', ZERO_HINT, 0, input.length)
    }
    return { ok: true, point: { x: value, y: Rational.ZERO }, plain: isPlainNumber(equation.right) }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}

/** Checks the zero of a function; any point (z|0) counts if every x is a zero. */
export function checkZero(key: { zero: FunctionZero }, answer: ZeroAnswer): ZeroCheckResult {
  if (answer.kind === 'none') {
    return key.zero.kind === 'none' ? { kind: 'correct' } : { kind: 'wrong', notOnAxis: false }
  }
  const read = readZeroAnswer(answer.input)
  if (!read.ok) return { kind: 'invalid', error: read.error }
  const notOnAxis = !read.point.y.isZero()
  const right =
    !notOnAxis && (key.zero.kind === 'all' || (key.zero.kind === 'single' && read.point.x.equals(key.zero.x)))
  if (!right) return { kind: 'wrong', notOnAxis }
  return read.plain ? { kind: 'correct' } : { kind: 'wrong-form', hint: formHint('unevaluated-value') }
}

/** The answer to "Bestimme den Schnittpunkt": typed point, or one of the keys. */
export type IntersectionAnswer = { kind: 'point'; input: string } | { kind: 'parallel' } | { kind: 'identical' }

export type IntersectionCheckResult = PointCheckResult

/** Checks the intersection of two graphs (acceptance criterion 4, last line). */
export function checkIntersection(
  key: { intersection: Intersection },
  answer: IntersectionAnswer,
): IntersectionCheckResult {
  const expected = key.intersection
  if (answer.kind !== 'point') {
    return answer.kind === expected.kind ? { kind: 'correct' } : { kind: 'wrong', x: false, y: false }
  }
  if (expected.kind === 'point') return checkPoint(expected.point, answer.input)
  const read = readPoint(answer.input)
  return read.ok ? { kind: 'wrong', x: false, y: false } : { kind: 'invalid', error: read.error }
}
