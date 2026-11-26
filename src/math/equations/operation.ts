import type { Expr } from '../ast'
import { TermError, toErrorInfo, type TermErrorCode, type TermErrorInfo } from '../errors'
import { toPolynomial } from '../normalize'
import type { Polynomial } from '../polynomial'
import { toLatex, toText, type PrintOptions } from '../printer'
import { Rational } from '../rational'
import { parseAt, type Sides } from './equation'
import type { Operation } from './types'

/** `+ T`, `− T`, `· c` or `: c`. */
type Arithmetic = Extract<Operation, { operand: Expr }>
type ArithmeticKind = Arithmetic['kind']

const OPERATORS: ReadonlyMap<string, ArithmeticKind> = new Map<string, ArithmeticKind>([
  ['+', 'add'],
  ['-', 'subtract'],
  ['−', 'subtract'], // minus sign
  ['–', 'subtract'], // en dash (auto-correct on phones)
  ['*', 'multiply'],
  ['·', 'multiply'],
  ['⋅', 'multiply'],
  ['×', 'multiply'],
  ['/', 'divide'],
  [':', 'divide'],
  ['÷', 'divide'],
])

const SWAP_SYMBOLS: ReadonlySet<string> = new Set(['⇄', '⇆', '↔', '⇔', '<->', '<=>'])
const SIMPLIFY_WORDS: ReadonlySet<string> = new Set(['t', 'term umformen'])

/** Label of the "Term umformen" key, as printed in worked solutions. */
export const SIMPLIFY_LABEL = 'Term umformen'
/** Symbol of the "swap sides" key. */
export const SWAP_SYMBOL = '⇄'

/** Reasons why a readable operation must not be used. */
export type OperationProblemCode = Extract<
  TermErrorCode,
  'nonlinear-operation' | 'multiply-by-term' | 'multiply-by-zero' | 'division-by-term' | 'division-by-zero'
>

export interface OperationProblem {
  code: OperationProblemCode
  /** German hint for the learner. */
  message: string
}

const PROBLEMS: Record<OperationProblemCode, string> = {
  'nonlinear-operation': 'Addiere oder subtrahiere nur Zahlen und Vielfache der Variablen, z. B. 5 oder 3x.',
  'multiply-by-term':
    'Multipliziere nur mit einer Zahl. Ein Term mit einer Variablen könnte 0 sein, und dann wäre das keine Äquivalenzumformung.',
  'multiply-by-zero': 'Mit 0 darfst du nicht multiplizieren: Aus jeder Gleichung würde 0 = 0.',
  'division-by-term':
    'Teile nur durch eine Zahl. Ein Term mit einer Variablen könnte 0 sein, und durch 0 kann man nicht teilen.',
  'division-by-zero': 'Durch 0 kann man nicht teilen.',
}

const NOT_ALLOWED: ReadonlySet<TermErrorCode> = new Set<TermErrorCode>(
  Object.keys(PROBLEMS) as OperationProblemCode[],
)

function problem(code: OperationProblemCode): OperationProblem {
  return { code, message: PROBLEMS[code] }
}

/**
 * Checks that an operation is an allowed equivalence transformation:
 * `+`/`−` need a linear term, `·`/`:` a number other than 0.
 *
 * @throws TermError if the operand itself cannot be evaluated.
 */
export function operationProblem(operation: Operation): OperationProblem | undefined {
  if (operation.kind === 'simplify' || operation.kind === 'swap') return undefined
  const operand = toPolynomial(operation.operand)
  switch (operation.kind) {
    case 'add':
    case 'subtract':
      return operand.degree() > 1 ? problem('nonlinear-operation') : undefined
    case 'multiply': {
      const factor = operand.constantValue()
      if (factor === undefined) return problem('multiply-by-term')
      return factor.isZero() ? problem('multiply-by-zero') : undefined
    }
    case 'divide': {
      const divisor = operand.constantValue()
      if (divisor === undefined) return problem('division-by-term')
      return divisor.isZero() ? problem('division-by-zero') : undefined
    }
  }
}

/**
 * Parses an operation as written next to an equation: `| + 3x`, `| - 5`,
 * `| · (-2)`, `| : 4`, `⇄` or `Term umformen` (short `T`). The leading bar is
 * optional. The operand uses the term syntax of `parse`; a sum must be put in
 * brackets (`| - (2x + 3)`), because `| - 2x + 3` could mean two things.
 *
 * @throws TermError with a German message and the position of the problem,
 * also for operations that are readable but not allowed (see `operationProblem`).
 */
export function parseOperation(input: string): Operation {
  let start = 0
  const skipSpace = () => {
    while (start < input.length && /\s/.test(input.charAt(start))) start++
  }
  skipSpace()
  if (input.charAt(start) === '|') {
    start++
    skipSpace()
  }
  const rest = input.slice(start).trim()
  if (rest === '') {
    throw new TermError('empty', 'Gib an, wie du die Gleichung umformst, z. B. | - 3.', 0, 0)
  }
  if (SWAP_SYMBOLS.has(rest)) return { kind: 'swap' }
  if (SIMPLIFY_WORDS.has(rest.toLowerCase())) return { kind: 'simplify' }

  const sign = input.charAt(start)
  const kind = OPERATORS.get(sign)
  if (!kind) {
    throw new TermError(
      'missing-operation',
      'Beginne die Umformung mit einem Rechenzeichen: +, -, · oder :',
      start,
      rest.length,
    )
  }
  const operandStart = start + 1
  if (input.slice(operandStart).trim() === '') {
    throw new TermError('missing-operand', `Nach „${sign}“ fehlt eine Zahl oder ein Term.`, start)
  }
  const operand = parseAt(input.slice(operandStart), operandStart)
  const position = operand.span?.start ?? operandStart
  const length = operand.span ? operand.span.end - operand.span.start : 1
  if (operand.type === 'add') {
    throw new TermError(
      'ambiguous-operation',
      'Hier ist unklar, was zur Umformung gehört. Setze den ganzen Term in Klammern oder forme in mehreren Schritten um.',
      position,
      length,
    )
  }
  const operation: Operation = { kind, operand }
  const found = operationProblem(operation)
  if (found) throw new TermError(found.code, found.message, position, length)
  return operation
}

export type ReadOperationResult =
  | { ok: true; operation: Operation }
  /**
   * `invalid`: the input cannot be read. `not-allowed`: it is readable, but
   * not an allowed equivalence transformation (e.g. `| · x`, `| : 0`).
   */
  | { ok: false; reason: 'invalid' | 'not-allowed'; error: TermErrorInfo }

/** Parses and validates an operation without throwing. */
export function readOperation(input: string): ReadOperationResult {
  try {
    return { ok: true, operation: parseOperation(input) }
  } catch (e) {
    if (!(e instanceof TermError)) throw e
    return { ok: false, reason: NOT_ALLOWED.has(e.code) ? 'not-allowed' : 'invalid', error: toErrorInfo(e) }
  }
}

function sideTransform(operation: Arithmetic): (side: Polynomial) => Polynomial {
  const operand = toPolynomial(operation.operand)
  switch (operation.kind) {
    case 'add':
      return (side) => side.add(operand)
    case 'subtract':
      return (side) => side.sub(operand)
    case 'multiply':
      return (side) => side.mul(operand)
    case 'divide': {
      const divisor = operand.constantValue()
      if (divisor === undefined || divisor.isZero()) throw new RangeError('Divisor must be a non-zero number')
      const factor = Rational.ONE.div(divisor)
      return (side) => side.scale(factor)
    }
  }
}

/** Both sides after the operation, as canonical polynomials. */
export function transformSides(sides: Sides, operation: Operation): Sides {
  switch (operation.kind) {
    case 'simplify':
      return sides
    case 'swap':
      return { left: sides.right, right: sides.left }
    default: {
      const transform = sideTransform(operation)
      return { left: transform(sides.left), right: transform(sides.right) }
    }
  }
}

/** Operand as printed after the sign: sums and negative terms get brackets. */
function operandWith(print: (e: Expr) => string, operand: Expr): string {
  const text = print(operand)
  return operand.type === 'add' || text.startsWith('-') ? `(${text})` : text
}

const TEXT_SIGNS: Record<ArithmeticKind, string> = { add: '+', subtract: '-', multiply: '·', divide: ':' }
const LATEX_SIGNS: Record<ArithmeticKind, string> = {
  add: '{+}',
  subtract: '{-}',
  multiply: '{\\cdot}',
  divide: '{:}',
}

/** Display text such as `| - 3x`, `| : (-2)`, `| ⇄`; can be read back with `parseOperation`. */
export function operationToText(operation: Operation, options?: PrintOptions): string {
  if (operation.kind === 'swap') return `| ${SWAP_SYMBOL}`
  if (operation.kind === 'simplify') return `| ${SIMPLIFY_LABEL}`
  return `| ${TEXT_SIGNS[operation.kind]} ${operandWith((e) => toText(e, options), operation.operand)}`
}

/** LaTeX for KaTeX, e.g. `\mid\; {-}\, 3x`. */
export function operationToLatex(operation: Operation, options?: PrintOptions): string {
  if (operation.kind === 'swap') return '\\mid\\; \\rightleftarrows'
  if (operation.kind === 'simplify') return `\\mid\\; \\text{${SIMPLIFY_LABEL}}`
  return `\\mid\\; ${LATEX_SIGNS[operation.kind]}\\, ${operandWith((e) => toLatex(e, options), operation.operand)}`
}
