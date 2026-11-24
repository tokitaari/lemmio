import type { Expr } from '../ast'
import { parseAt } from '../equations/equation'
import { TermError, toErrorInfo, type TermErrorInfo } from '../errors'
import { toPolynomial } from '../normalize'
import { MAX_INPUT_LENGTH } from '../parser'
import type { Polynomial } from '../polynomial'
import type { Rational } from '../rational'
import { FUNCTION_VARIABLE, type Point } from './types'

const FUNCTION_HINT = 'Schreibe die Funktionsgleichung so: f(x) = 2x + 3.'
const POINT_HINT = 'Schreibe den Punkt so: P(2|5).'
const VALUE_HINT = 'Schreibe den Funktionswert so: f(2) = 5.'

/** `f(x) =` (any letter as name, any letter as variable) or `y =`, the whole text up to and including `=`. */
const FUNCTION_PREFIX = /^\s*([a-zA-Z])\s*\(\s*([a-zA-Z])\s*\)\s*=$/
const Y_PREFIX = /^\s*[yY]\s*=$/
/** Optional label such as `P`, `S`, `P1` or `P₁`, then the opening bracket. */
const POINT_START = /^\s*([A-Za-z][0-9₀-₉]*)?\s*\(/
const VALUE_START = /^\s*([a-zA-Z])\s*\(/

function checkLength(input: string, what: string): void {
  if (input.length > MAX_INPUT_LENGTH) {
    throw new TermError('too-long', `${what} ist zu lang (höchstens ${MAX_INPUT_LENGTH} Zeichen).`, 0, input.length)
  }
}

/** First variable other than x, with its position. */
function foreignVariable(expr: Expr): { name: string; position: number } | undefined {
  switch (expr.type) {
    case 'num':
      return undefined
    case 'var':
      return expr.name === FUNCTION_VARIABLE ? undefined : { name: expr.name, position: expr.span?.start ?? 0 }
    case 'add':
      return firstOf(expr.terms)
    case 'mul':
      return firstOf(expr.factors)
    case 'neg':
      return foreignVariable(expr.arg)
    case 'div':
      return firstOf([expr.num, expr.den])
    case 'pow':
      return foreignVariable(expr.base)
    case 'group':
      return foreignVariable(expr.body)
  }
}

function firstOf(exprs: readonly Expr[]): { name: string; position: number } | undefined {
  for (const e of exprs) {
    const found = foreignVariable(e)
    if (found) return found
  }
  return undefined
}

/** The value of a term without variables; otherwise a TermError with `code` and `message`. */
function constantOf(
  expr: Expr,
  offset: number,
  code: 'invalid-point' | 'invalid-function-value',
  message: string,
): Rational {
  const value = toPolynomial(expr).constantValue()
  if (value === undefined) {
    const start = expr.span?.start ?? offset
    const end = expr.span?.end ?? offset + 1
    throw new TermError(code, message, start, Math.max(1, end - start))
  }
  return value
}

/** A function equation as typed by the learner. */
export interface ParsedFunction {
  /** Name from the prefix `f(x) =` (lowercase); undefined for `y =` or no prefix. */
  name: string | undefined
  /** The right-hand side, a term in x. */
  expr: Expr
}

/**
 * Parses a function equation such as `f(x) = 2x - 3`. The prefix is optional
 * and may also be `y =`, so `2x - 3` alone is accepted. The right-hand side
 * uses the term syntax of `parse` and may only contain the variable x.
 *
 * @throws TermError with a German message and the position of the problem.
 */
export function parseFunction(input: string): ParsedFunction {
  if (input.trim() === '') throw new TermError('empty', 'Bitte gib eine Funktionsgleichung ein.', 0, 0)
  checkLength(input, 'Die Funktionsgleichung')
  const equals = input.indexOf('=')
  let name: string | undefined
  let start = 0
  if (equals >= 0) {
    const second = input.indexOf('=', equals + 1)
    if (second >= 0) {
      throw new TermError('multiple-equals', 'In einer Funktionsgleichung steht genau ein Gleichheitszeichen.', second)
    }
    const prefix = input.slice(0, equals + 1)
    const match = FUNCTION_PREFIX.exec(prefix)
    if (match) {
      const variable = match[2] ?? ''
      if (variable.toLowerCase() !== FUNCTION_VARIABLE) {
        const position = prefix.indexOf(variable, prefix.indexOf('('))
        throw new TermError(
          'wrong-variable',
          `Die Variable heißt x, also ${(match[1] ?? 'f').toLowerCase()}(x) = …`,
          position,
        )
      }
      name = (match[1] ?? '').toLowerCase()
    } else if (!Y_PREFIX.test(prefix)) {
      throw new TermError('invalid-function', FUNCTION_HINT, 0, Math.max(1, equals))
    }
    if (input.slice(equals + 1).trim() === '') {
      throw new TermError('missing-operand', 'Rechts vom Gleichheitszeichen fehlt ein Term.', equals)
    }
    start = equals + 1
  }
  const expr = parseAt(input.slice(start), start)
  const foreign = foreignVariable(expr)
  if (foreign) {
    throw new TermError(
      'wrong-variable',
      `In der Funktionsgleichung kommt nur die Variable x vor, nicht „${foreign.name}“.`,
      foreign.position,
    )
  }
  return { name, expr }
}

export type ReadFunctionResult =
  | ({ ok: true; polynomial: Polynomial } & ParsedFunction)
  | { ok: false; error: TermErrorInfo }

/** Parses and evaluates a function equation without throwing. */
export function readFunction(input: string): ReadFunctionResult {
  try {
    const parsed = parseFunction(input)
    return { ok: true, ...parsed, polynomial: toPolynomial(parsed.expr) }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}

/** A point as typed by the learner. */
export interface ParsedPoint {
  /** Label such as "P" or "S"; undefined for `(2|5)`. Not checked. */
  label: string | undefined
  point: Point
  /** The coordinates as typed, for the form check. */
  xExpr: Expr
  yExpr: Expr
}

/**
 * Parses a point such as `P(2|5)`, `S(-1 | 3)`, `(2|5)` or `P(2;5)`. The
 * coordinates use the term syntax and must not contain variables. A comma is
 * a decimal comma, so `P(2,5|1)` is the point (2.5|1).
 *
 * @throws TermError with a German message and the position of the problem.
 */
export function parsePoint(input: string): ParsedPoint {
  if (input.trim() === '') throw new TermError('empty', 'Bitte gib einen Punkt ein, z. B. P(2|5).', 0, 0)
  checkLength(input, 'Der Punkt')
  const start = POINT_START.exec(input)
  if (!start) throw new TermError('invalid-point', POINT_HINT, 0, input.length)
  const open = start[0].length - 1
  const close = input.lastIndexOf(')')
  if (close < open) {
    throw new TermError('missing-closing-bracket', 'Es fehlt die schließende Klammer des Punkts.', open)
  }
  if (input.slice(close + 1).trim() !== '') {
    throw new TermError('invalid-point', POINT_HINT, close + 1, input.length - close - 1)
  }
  const inner = input.slice(open + 1, close)
  if (inner.trim() === '') {
    throw new TermError('invalid-point', 'Im Punkt fehlen die Koordinaten, z. B. P(2|5).', open, close - open + 1)
  }
  const separators: number[] = []
  for (let i = 0; i < inner.length; i++) {
    if (inner.charAt(i) === '|' || inner.charAt(i) === ';') separators.push(i)
  }
  const [sep, extra] = separators
  if (sep === undefined) {
    const comma = inner.indexOf(',')
    if (comma >= 0) {
      throw new TermError(
        'comma-separator',
        'Trenne die Koordinaten mit | oder ;, z. B. P(2|5). Das Komma ist ein Dezimalkomma.',
        open + 1 + comma,
      )
    }
    throw new TermError(
      'missing-separator',
      'Zwischen den Koordinaten fehlt der Trennstrich, z. B. P(2|5).',
      open + 1,
      inner.length,
    )
  }
  if (extra !== undefined) {
    throw new TermError('invalid-point', 'Ein Punkt hat genau zwei Koordinaten, z. B. P(2|5).', open + 1 + extra)
  }
  const xSource = inner.slice(0, sep)
  const ySource = inner.slice(sep + 1)
  const sepPosition = open + 1 + sep
  if (xSource.trim() === '') {
    throw new TermError('missing-operand', 'Vor dem Trennstrich fehlt die x-Koordinate.', sepPosition)
  }
  if (ySource.trim() === '') {
    throw new TermError('missing-operand', 'Nach dem Trennstrich fehlt die y-Koordinate.', sepPosition)
  }
  const xExpr = parseAt(xSource, open + 1)
  const yExpr = parseAt(ySource, sepPosition + 1)
  const message = 'Die Koordinaten eines Punkts sind Zahlen, z. B. P(2|5).'
  return {
    label: start[1],
    point: {
      x: constantOf(xExpr, open + 1, 'invalid-point', message),
      y: constantOf(yExpr, sepPosition + 1, 'invalid-point', message),
    },
    xExpr,
    yExpr,
  }
}

export type ReadPointResult = ({ ok: true } & ParsedPoint) | { ok: false; error: TermErrorInfo }

/** Parses a point without throwing. */
export function readPoint(input: string): ReadPointResult {
  try {
    return { ok: true, ...parsePoint(input) }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}

/** A function value as typed by the learner, e.g. `f(2) = 2·2 + 1 = 5`. */
export interface ParsedFunctionValue {
  /** Lowercase name of the function. */
  name: string
  argument: Rational
  argumentExpr: Expr
  /** Every term after an `=`, in order; the last one is the result. */
  values: readonly { expr: Expr; value: Rational }[]
}

/**
 * Parses a function value such as `f(2) = 5` or a chain such as
 * `f(2) = 2·2 + 1 = 5`. Argument and values use the term syntax and must not
 * contain variables.
 *
 * @throws TermError with a German message and the position of the problem.
 */
export function parseFunctionValue(input: string): ParsedFunctionValue {
  if (input.trim() === '') throw new TermError('empty', 'Bitte gib den Funktionswert an, z. B. f(2) = 5.', 0, 0)
  checkLength(input, 'Die Rechnung')
  const start = VALUE_START.exec(input)
  if (!start) throw new TermError('invalid-function-value', VALUE_HINT, 0, input.length)
  const open = start[0].length - 1
  let close = -1
  let depth = 0
  for (let i = open; i < input.length; i++) {
    const ch = input.charAt(i)
    if (ch === '(') depth++
    else if (ch === ')' && --depth === 0) {
      close = i
      break
    }
  }
  if (close < 0) throw new TermError('missing-closing-bracket', 'Es fehlt eine schließende Klammer.', open)
  const argumentSource = input.slice(open + 1, close)
  if (argumentSource.trim() === '') {
    throw new TermError('invalid-function-value', 'In die Klammer gehört eine Zahl, z. B. f(2).', open, 2)
  }
  const argumentExpr = parseAt(argumentSource, open + 1)
  const argument = constantOf(
    argumentExpr,
    open + 1,
    'invalid-function-value',
    'In die Klammer gehört eine Zahl, z. B. f(2).',
  )

  const equals = input.indexOf('=', close + 1)
  if (equals < 0 || input.slice(close + 1, equals).trim() !== '') {
    throw new TermError('missing-equals', `Nach ${input.slice(0, close + 1).trim()} fehlt „= …“.`, close + 1, 0)
  }
  const values: { expr: Expr; value: Rational }[] = []
  let from = equals
  while (from >= 0) {
    const next = input.indexOf('=', from + 1)
    const source = input.slice(from + 1, next < 0 ? input.length : next)
    if (source.trim() === '') {
      throw new TermError('missing-operand', 'Nach dem Gleichheitszeichen fehlt eine Zahl.', from)
    }
    const expr = parseAt(source, from + 1)
    const value = constantOf(
      expr,
      from + 1,
      'invalid-function-value',
      'Setze für x eine Zahl ein: Hier darf keine Variable mehr stehen.',
    )
    values.push({ expr, value })
    from = next
  }
  return { name: (start[1] ?? '').toLowerCase(), argument, argumentExpr, values }
}

export type ReadFunctionValueResult = ({ ok: true } & ParsedFunctionValue) | { ok: false; error: TermErrorInfo }

/** Parses a function value without throwing. */
export function readFunctionValue(input: string): ReadFunctionValueResult {
  try {
    return { ok: true, ...parseFunctionValue(input) }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}
