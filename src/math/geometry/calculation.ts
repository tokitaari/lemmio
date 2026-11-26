import { unwrapGroups, type Expr, type Span } from '../ast'
import { isPlainNumber, parseAt } from '../equations/equation'
import { TermError, type TermErrorInfo } from '../errors'
import { formHint, type FormHint, type FormHintCode } from '../form'
import { toPolynomial } from '../normalize'
import { MAX_INPUT_LENGTH } from '../parser'
import type { Rational } from '../rational'
import { attempt } from './attempt'
import { insertMeasures, isLetter, QUANTITY_SYMBOL, variableNodes } from './formulas'
import type { CalculationKey, Measures, Quantity, Unit } from './types'

/** The quantity in front of the first `=`: a single letter. */
const QUANTITY = /^\s*([A-Za-z])\s*$/
/** A unit typed at the end of a term, e.g. `12 cm²`, `12cm`, `5 m`. */
const UNIT_SUFFIX = /(?<=[\d\s)])\s*[cdm]?m\s*(?:²|\^\s*2)?\s*$/i

const UNIT_MESSAGE = 'Schreibe die Einheit nicht in die Rechnung: Du wählst sie unten aus.'

/** One term of a calculation with its position in the input. */
export interface CalculationTerm {
  expr: Expr
  span: Span
}

/** A calculation (Rechenkette) as typed by the learner, e.g. `A = g · h : 2 = 6 · 4 : 2 = 12`. */
export interface ParsedCalculation {
  /** The letter before the first `=` as typed (`A`, `u`, `U`, …); undefined if the input starts with a term. */
  quantity: { name: string; span: Span } | undefined
  /** The terms after the quantity, in order; the last one is the result. */
  terms: readonly CalculationTerm[]
}

/** Span of `input[start, end)` without surrounding whitespace. */
function trimmedSpan(input: string, start: number, end: number): Span {
  let from = start
  let to = end
  while (from < to && /\s/.test(input.charAt(from))) from++
  while (to > from && /\s/.test(input.charAt(to - 1))) to--
  return { start: from, end: to }
}

/**
 * Throws `unit-in-input` if `source` (starting at `offset` of the input) ends
 * with a unit such as `cm²`.
 */
export function rejectTypedUnit(source: string, offset: number): void {
  const match = UNIT_SUFFIX.exec(source)
  if (!match) return
  const typed = match[0]
  const leading = typed.length - typed.trimStart().length
  throw new TermError('unit-in-input', UNIT_MESSAGE, offset + match.index + leading, typed.trim().length)
}

/**
 * Parses a calculation such as `A = g · h : 2 = 6 · 4 : 2 = 12` or
 * `u = 2 · (a + b) = 16`. A single letter before the first `=` is the
 * quantity; it is read before the term parser, which would turn `A` into `a`.
 * The terms use the term syntax (decimal comma or point) and may contain
 * letters. Units must not be typed.
 *
 * @throws TermError with a German message and the position of the problem.
 */
export function parseCalculation(input: string): ParsedCalculation {
  if (input.trim() === '') {
    throw new TermError('empty', 'Bitte gib deine Rechnung ein, z. B. A = g · h = 6 · 4 = 24.', 0, 0)
  }
  if (input.length > MAX_INPUT_LENGTH) {
    throw new TermError(
      'too-long',
      `Die Rechnung ist zu lang (höchstens ${MAX_INPUT_LENGTH} Zeichen).`,
      0,
      input.length,
    )
  }
  const pieces: { start: number; end: number }[] = []
  for (let from = 0; ; ) {
    const next = input.indexOf('=', from)
    pieces.push({ start: from, end: next < 0 ? input.length : next })
    if (next < 0) break
    from = next + 1
  }

  let quantity: ParsedCalculation['quantity']
  const head = pieces[0]
  if (head && pieces.length > 1) {
    const match = QUANTITY.exec(input.slice(head.start, head.end))
    if (match) quantity = { name: match[1] ?? '', span: trimmedSpan(input, head.start, head.end) }
  }

  const terms: CalculationTerm[] = []
  pieces.forEach((piece, i) => {
    if (i === 0 && quantity) return
    const source = input.slice(piece.start, piece.end)
    if (source.trim() === '') {
      if (i === 0) throw new TermError('missing-operand', 'Vor dem Gleichheitszeichen fehlt etwas.', piece.end)
      throw new TermError('missing-operand', 'Nach dem Gleichheitszeichen fehlt ein Term.', piece.start - 1)
    }
    rejectTypedUnit(source, piece.start)
    terms.push({ expr: parseAt(source, piece.start), span: trimmedSpan(input, piece.start, piece.end) })
  })
  return { quantity, terms }
}

/**
 * Throws `unknown-letter` for the first letter of `expr` that is not one of
 * the lengths of the figure. The message quotes the letter as typed.
 */
export function rejectUnknownLetters(input: string, expr: Expr, measures: Measures, allowed?: string): void {
  for (const node of variableNodes(expr)) {
    if (node.name === allowed || (isLetter(node.name) && measures[node.name])) continue
    const position = node.span?.start ?? 0
    const typed = input.charAt(position) || node.name
    throw new TermError('unknown-letter', `In dieser Figur gibt es keine Größe „${typed}“.`, position)
  }
}

/**
 * Values of the terms of a calculation with the lengths of the figure
 * inserted.
 *
 * @throws TermError for letters the figure does not have and for a division by 0.
 */
export function calculationValues(input: string, parsed: ParsedCalculation, measures: Measures): Rational[] {
  return parsed.terms.map((term) => {
    rejectUnknownLetters(input, term.expr, measures)
    const value = toPolynomial(insertMeasures(term.expr, measures)).constantValue()
    if (value === undefined) {
      throw new TermError('unknown-letter', 'Setze für jede Größe ihre Länge ein.', term.span.start)
    }
    return value
  })
}

/**
 * How far a result is worked out:
 * - `number`: a single number such as `12`, `7,5` or `7.5`
 * - `fraction`: a reduced fraction such as `15/2`
 * - `unevaluated`: anything else, e.g. `6 · 4 : 2` or `g · h`
 */
export type ResultForm = 'number' | 'fraction' | 'unevaluated'

export function resultForm(expr: Expr): ResultForm {
  const outer = unwrapGroups(expr)
  const body = outer.type === 'neg' ? unwrapGroups(outer.arg) : outer
  if (body.type === 'num') return 'number'
  return isPlainNumber(expr) ? 'fraction' : 'unevaluated'
}

export type CalculationCheckResult =
  | { kind: 'correct' }
  /**
   * Final. `value`: all terms equal the expected result; `unit`: the chosen
   * unit is right; `result`: the last term is right; `consistent`: all terms
   * are equal to each other (calculation right, but wrong formula);
   * `at`: the first term that is not the expected result.
   */
  | {
      kind: 'wrong'
      value: boolean
      unit: boolean
      result: boolean
      consistent: boolean
      at?: { index: number; span: Span }
    }
  /** Right value and unit, but not yet in the required form; `span` points to the term concerned. */
  | { kind: 'wrong-form'; hint: FormHint; span?: Span }
  /** Readable, but no unit chosen yet. */
  | { kind: 'missing-unit' }
  | { kind: 'invalid'; error: TermErrorInfo }

const QUANTITY_HINTS: Readonly<Record<Quantity, Partial<Record<FormHintCode, string>>>> = {
  area: {
    'missing-quantity': 'Beginne mit der gesuchten Größe: A = …',
    'wrong-quantity': 'Den Flächeninhalt schreibt man mit großem A: A = …',
    'missing-calculation': 'Schreibe die Rechnung dazu, z. B. A = g · h = 6 · 4 = 24.',
    'unevaluated-result': 'Rechne bis zu einer einzelnen Zahl aus, z. B. A = 6 · 4 : 2 = 12.',
  },
  perimeter: {
    'missing-quantity': 'Beginne mit der gesuchten Größe: u = …',
    'wrong-quantity': 'Den Umfang schreibt man mit u: u = …',
    'missing-calculation': 'Schreibe die Rechnung dazu, z. B. u = 2 · (a + b) = 2 · (5 + 3) = 16.',
    'unevaluated-result': 'Rechne bis zu einer einzelnen Zahl aus, z. B. u = 2 · (5 + 3) = 16.',
  },
}

function quantityHint(code: FormHintCode, quantity: Quantity, span?: Span): CalculationCheckResult {
  const message = QUANTITY_HINTS[quantity][code] ?? formHint(code).message
  return { kind: 'wrong-form', hint: { code, message }, ...(span ? { span } : {}) }
}

/** `A` for the area (case matters: `a` is a side), `u` or `U` for the perimeter. */
function isQuantityName(quantity: Quantity, name: string): boolean {
  return quantity === 'area' ? name === QUANTITY_SYMBOL.area : name.toLowerCase() === QUANTITY_SYMBOL.perimeter
}

/**
 * Checks a calculation (acceptance criterion 3) in this order:
 * 1. readable, only letters of the figure, no typed unit (else `invalid`)
 * 2. a unit is chosen (else `missing-unit`, no attempt used)
 * 3. every term equals the expected result and the unit is right (else
 *    `wrong`, final)
 * 4. form (else `wrong-form`, new attempt): quantity in front, the right
 *    quantity, result worked out to a single number, decimal rather than a
 *    fraction, at least one calculation term before the result
 */
export function checkCalculation(
  key: CalculationKey,
  input: string,
  unit: Unit | null | undefined,
): CalculationCheckResult {
  const read = attempt(() => {
    const parsed = parseCalculation(input)
    return { parsed, values: calculationValues(input, parsed, key.measures) }
  })
  if (!read.ok) return { kind: 'invalid', error: read.error }
  if (!unit) return { kind: 'missing-unit' }

  const { parsed, values } = read.value
  const terms = parsed.terms
  const index = values.findIndex((value) => !value.equals(key.value))
  const unitRight = unit === key.unit
  if (index >= 0 || !unitRight) {
    const first = values[0]
    const last = values[values.length - 1]
    const term = terms[index]
    return {
      kind: 'wrong',
      value: index < 0,
      unit: unitRight,
      result: last !== undefined && last.equals(key.value),
      consistent: first !== undefined && values.every((value) => value.equals(first)),
      ...(term ? { at: { index, span: term.span } } : {}),
    }
  }

  if (!parsed.quantity) return quantityHint('missing-quantity', key.quantity)
  if (!isQuantityName(key.quantity, parsed.quantity.name)) {
    return quantityHint('wrong-quantity', key.quantity, parsed.quantity.span)
  }
  const result = terms[terms.length - 1]
  if (!result) return quantityHint('missing-calculation', key.quantity)
  const form = resultForm(result.expr)
  if (form === 'unevaluated') return quantityHint('unevaluated-result', key.quantity, result.span)
  if (form === 'fraction' && key.value.decimalPlaces() !== undefined) {
    return quantityHint('decimal-result', key.quantity, result.span)
  }
  if (!terms.slice(0, -1).some((term) => resultForm(term.expr) === 'unevaluated')) {
    return quantityHint('missing-calculation', key.quantity)
  }
  return { kind: 'correct' }
}

/** Checks the chosen unit alone, e.g. after a Rückwärts task. */
export function checkUnit(expected: Unit, chosen: Unit | null | undefined): 'correct' | 'wrong' | 'missing' {
  if (!chosen) return 'missing'
  return chosen === expected ? 'correct' : 'wrong'
}

