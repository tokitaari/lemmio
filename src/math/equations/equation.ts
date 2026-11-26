import { unwrapGroups, type Expr } from '../ast'
import { TermError, toErrorInfo, type TermErrorInfo } from '../errors'
import { toPolynomial } from '../normalize'
import { MAX_INPUT_LENGTH, parse } from '../parser'
import type { Polynomial } from '../polynomial'
import { toLatex, toText, type PrintOptions } from '../printer'
import { Rational } from '../rational'
import type { Equation, SolutionSet } from './types'

/**
 * Parses `source` as if it started at `offset` of the original input, so
 * spans and error positions refer to the whole input line.
 */
export function parseAt(source: string, offset: number): Expr {
  return parse(' '.repeat(offset) + source)
}

/**
 * Parses an equation such as `3x + 5 = x + 9`. Both sides use the term syntax
 * of `parse`.
 *
 * @throws TermError with a German message and the position of the problem.
 */
export function parseEquation(input: string): Equation {
  if (input.trim() === '') throw new TermError('empty', 'Bitte gib eine Gleichung ein.', 0, 0)
  if (input.length > MAX_INPUT_LENGTH) {
    throw new TermError(
      'too-long',
      `Die Gleichung ist zu lang (höchstens ${MAX_INPUT_LENGTH} Zeichen).`,
      0,
      input.length,
    )
  }
  const equals = input.indexOf('=')
  if (equals < 0) {
    throw new TermError(
      'missing-equals',
      'Das ist noch keine Gleichung: Es fehlt das Gleichheitszeichen.',
      0,
      input.length,
    )
  }
  const second = input.indexOf('=', equals + 1)
  if (second >= 0) {
    throw new TermError('multiple-equals', 'In einer Zeile steht genau ein Gleichheitszeichen.', second)
  }
  const left = input.slice(0, equals)
  const right = input.slice(equals + 1)
  if (left.trim() === '') {
    throw new TermError('missing-operand', 'Links vom Gleichheitszeichen fehlt ein Term.', equals)
  }
  if (right.trim() === '') {
    throw new TermError('missing-operand', 'Rechts vom Gleichheitszeichen fehlt ein Term.', equals)
  }
  return { left: parse(left), right: parseAt(right, equals + 1) }
}

/** Canonical polynomials of both sides. */
export interface Sides {
  left: Polynomial
  right: Polynomial
}

/** @throws TermError if a side divides by a term or by zero. */
export function sidePolynomials(equation: Equation): Sides {
  return { left: toPolynomial(equation.left), right: toPolynomial(equation.right) }
}

export type ReadEquationResult =
  | ({ ok: true; equation: Equation } & Sides)
  | { ok: false; error: TermErrorInfo }

/** Parses and evaluates a line of learner input without throwing. */
export function readEquation(input: string): ReadEquationResult {
  try {
    const equation = parseEquation(input)
    return { ok: true, equation, ...sidePolynomials(equation) }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}

/** `slope · variable + constant`; `variable` is undefined for a constant. */
export interface LinearParts {
  variable: string | undefined
  slope: Rational
  constant: Rational
}

/** Splits a polynomial of degree ≤ 1 in at most one variable; otherwise undefined. */
export function linearParts(poly: Polynomial): LinearParts | undefined {
  const variables = poly.variables()
  if (variables.length > 1 || poly.degree() > 1) return undefined
  let slope = Rational.ZERO
  let constant = Rational.ZERO
  for (const term of poly.terms()) {
    if (term.mono.length === 0) constant = term.coef
    else slope = term.coef
  }
  return { variable: variables[0], slope, constant }
}

/**
 * Solution set of an equation over ℚ. Returns undefined if the equation is
 * not linear in a single variable (terms that cancel, such as x² on both
 * sides, do not count).
 */
export function solveEquation(equation: Equation): SolutionSet | undefined {
  const { left, right } = sidePolynomials(equation)
  const parts = linearParts(left.sub(right))
  if (!parts) return undefined
  if (!parts.slope.isZero()) return { kind: 'single', value: parts.constant.neg().div(parts.slope) }
  return parts.constant.isZero() ? { kind: 'all' } : { kind: 'empty' }
}

export function equalSolutionSets(a: SolutionSet, b: SolutionSet): boolean {
  if (a.kind === 'single' && b.kind === 'single') return a.value.equals(b.value)
  return a.kind === b.kind
}

/** True if both equations are linear in one variable and have the same solutions. */
export function haveSameSolutions(a: Equation, b: Equation): boolean {
  const first = solveEquation(a)
  const second = solveEquation(b)
  return first !== undefined && second !== undefined && equalSolutionSets(first, second)
}

/**
 * How far an equation is solved, judged by how it is written:
 * - `solved`: `x = c` with a plain number c
 * - `solved-swapped`: `c = x`
 * - `statement`: two plain numbers, e.g. `0 = 5` or `3 = 3`
 * - `open`: anything else, e.g. `2x = 6` or `x = 6 : 2`
 */
export type EquationForm = 'solved' | 'solved-swapped' | 'statement' | 'open'

export function equationForm(equation: Equation): EquationForm {
  const left = unwrapGroups(equation.left)
  const right = unwrapGroups(equation.right)
  if (left.type === 'var' && isPlainNumber(right)) return 'solved'
  if (right.type === 'var' && isPlainNumber(left)) return 'solved-swapped'
  if (isPlainNumber(left) && isPlainNumber(right)) return 'statement'
  return 'open'
}

/**
 * A number, optionally with a sign or in brackets; fractions must be reduced
 * and not whole. Also used for coordinates and function values.
 */
export function isPlainNumber(e: Expr): boolean {
  switch (e.type) {
    case 'group':
      return isPlainNumber(e.body)
    case 'neg':
      return isUnsignedNumber(e.arg)
    default:
      return isUnsignedNumber(e)
  }
}

function isUnsignedNumber(e: Expr): boolean {
  if (e.type === 'num') return true
  if (e.type !== 'div' || e.num.type !== 'num' || e.den.type !== 'num') return false
  if (e.den.value.isZero()) return false
  const quotient = e.num.value.div(e.den.value)
  return !quotient.isInteger() && e.den.value.isInteger() && quotient.den === e.den.value.num
}

/** Display text such as `3x + 5 = x + 9`; can be read back with `parseEquation`. */
export function equationToText(equation: Equation, options?: PrintOptions): string {
  return `${toText(equation.left, options)} = ${toText(equation.right, options)}`
}

/** LaTeX for KaTeX. */
export function equationToLatex(equation: Equation, options?: PrintOptions): string {
  return `${toLatex(equation.left, options)} = ${toLatex(equation.right, options)}`
}
