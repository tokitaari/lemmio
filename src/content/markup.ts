import {
  DECIMAL,
  operationToLatex,
  parse,
  pointToLatex,
  readEquation,
  readFunction,
  readFunctionValue,
  readOperation,
  readPoint,
  readSolutionSet,
  readTerm,
  solutionSetToLatex,
  toLatex,
  toPolynomial,
  unitToLatex,
  type Expr,
  type Rational,
  type Unit,
} from '../math'

/**
 * Minimal markup for explanation texts: `$…$` encloses a term in input syntax
 * (the same syntax learners type, e.g. `$(a+b)^2 = a^2+2ab+b^2$`). Terms are
 * parsed and printed with `toLatex`, so prose and exercises use the same
 * typesetting. A term may be a chain joined by ` = ` or ` ≠ `; the content
 * tests check that every such claim is mathematically true.
 *
 * An equation is not a claim but a condition on x, so it is written with the
 * prefix `eq:` (see `equationPieces`): `$eq: 3x + 2 = x + 8$`, with the
 * operation written next to it `$eq: 3x + 2 = x + 8 | - x$`, an operation
 * alone `$eq: | : 2$`, or a solution set `$eq: L = {3}$`. The content tests
 * check that these can be read, not that they are true.
 *
 * Linear functions use the prefix `fn:` (see `readFunctionSegment`): a
 * function equation `$fn: f(x) = 2x - 3$`, a function value
 * `$fn: f(2) = 2·2 - 1 = 3$`, a point `$fn: P(2|3)$` or a value of m or n
 * `$fn: m = (9 - 3)/(4 - 1) = 2$`. The content tests check that these can be
 * read and that the numbers of a chain agree.
 *
 * Geometry uses the prefix `geo:` (see `readGeometrySegment`): a calculation
 * `$geo: A = g · h : 2 = 6 · 4 : 2 = 12 cm²$` with a quantity on the left
 * (A, u or a length a–h) and an optional unit at the end, or an equation in
 * a length, e.g. `$geo: 18 = 4,5h | : 4,5$`. Numbers are typeset with a
 * decimal comma. The content tests check that the numbers of a chain agree
 * and that the unit fits the quantity.
 */
export type Segment =
  | { kind: 'text'; text: string }
  | { kind: 'math'; source: string }
  | { kind: 'equation'; source: string }
  | { kind: 'function'; source: string }
  | { kind: 'geometry'; source: string }

/** Marks an equation segment, e.g. `$eq: 2x = 6$`. */
export const EQUATION_PREFIX = 'eq:'

/** Marks a segment about linear functions, e.g. `$fn: f(x) = 2x - 3$`. */
export const FUNCTION_PREFIX = 'fn:'

/** Marks a segment about areas and perimeters, e.g. `$geo: A = g · h = 6 · 4 = 24 cm²$`. */
export const GEOMETRY_PREFIX = 'geo:'

export function splitMarkup(text: string): Segment[] {
  const parts = text.split('$')
  if (parts.length % 2 === 0) throw new Error(`Unbalanced "$" in: ${text}`)
  return parts
    .map((part, i): Segment => {
      if (i % 2 === 0) return { kind: 'text', text: part }
      const trimmed = part.trimStart()
      if (trimmed.startsWith(EQUATION_PREFIX)) {
        return { kind: 'equation', source: trimmed.slice(EQUATION_PREFIX.length).trim() }
      }
      if (trimmed.startsWith(FUNCTION_PREFIX)) {
        return { kind: 'function', source: trimmed.slice(FUNCTION_PREFIX.length).trim() }
      }
      if (trimmed.startsWith(GEOMETRY_PREFIX)) {
        return { kind: 'geometry', source: trimmed.slice(GEOMETRY_PREFIX.length).trim() }
      }
      return { kind: 'math', source: part }
    })
    .filter((s) => s.kind !== 'text' || s.text !== '')
}

/** LaTeX pieces of a math, equation or function segment; line breaks are allowed only between pieces. */
export function segmentPieces(segment: Exclude<Segment, { kind: 'text' }>): string[] {
  switch (segment.kind) {
    case 'math':
      return chainPieces(segment.source)
    case 'equation':
      return equationPieces(segment.source)
    case 'function':
      return readFunctionSegment(segment.source).pieces
    case 'geometry':
      return readGeometrySegment(segment.source).pieces
  }
}

/**
 * A segment about linear functions, read with the math core: its LaTeX
 * pieces and, for a function value or a value of m or n, the numbers of the
 * chain (they must all be equal; checked by the content tests).
 */
export type FunctionSegment =
  | { kind: 'function' | 'point'; pieces: string[] }
  | { kind: 'value' | 'assignment'; pieces: string[]; values: Rational[] }

const FUNCTION_EQUATION = /^([a-z])\s*\(\s*x\s*\)\s*=|^y\s*=/
const FUNCTION_VALUE = /^[a-z]\s*\(/
/** `f(3)` without a value, e.g. in "Berechne f(3)". */
const BARE_FUNCTION_VALUE = /^([a-z])\s*\(([^()=]*)\)$/
const ASSIGNMENT = /^([mn])\s*=/

/** Pieces `first`, `= term`, `= term`, … of a chain whose parts are terms in input syntax. */
function chainOf(first: string, terms: readonly string[]): string[] {
  return [first, ...terms.map((term) => `= ${fractionTermToLatex(term.trim())}`)]
}

/**
 * Like `termToLatex`, but brackets around the numerator or denominator of a
 * fraction are dropped: `(9 - 3)/(4 - 1)` is typeset as a fraction bar over
 * `9 - 3`, as in school.
 */
function fractionTermToLatex(term: string): string {
  return toLatex(dropFractionBrackets(keepDots(parse(term), term)))
}

function unwrap(e: Expr): Expr {
  return e.type === 'group' ? e.body : e
}

function dropFractionBrackets(e: Expr): Expr {
  switch (e.type) {
    case 'div':
      return { ...e, num: unwrap(dropFractionBrackets(e.num)), den: unwrap(dropFractionBrackets(e.den)) }
    case 'mul':
      return { ...e, factors: e.factors.map(dropFractionBrackets) }
    case 'add':
      return { ...e, terms: e.terms.map(dropFractionBrackets) }
    case 'neg':
      return { ...e, arg: dropFractionBrackets(e.arg) }
    case 'group':
      return { ...e, body: dropFractionBrackets(e.body) }
    case 'pow':
      return { ...e, base: dropFractionBrackets(e.base) }
    default:
      return e
  }
}

/**
 * Reads a segment with the prefix `fn:` (without the prefix): a function
 * equation (`f(x) = 2x - 3`, `y = …`), a function value (`f(2) = 2·2 - 1 = 3`
 * or only `f(2)`), a point (`P(2|3)`, `(2|3)`) or a value of m or n
 * (`m = (9 - 3)/(4 - 1) = 2`). Letters such as m and n cannot be used inside
 * a function equation; write `f(x) = mx + n` as plain text.
 *
 * @throws Error if the source is none of these.
 */
export function readFunctionSegment(source: string): FunctionSegment {
  const text = source.trim()
  const assignment = ASSIGNMENT.exec(text)
  if (assignment) {
    const terms = text.slice(assignment[0].length).split('=')
    const values = terms.map((term) => {
      const read = readTerm(term)
      const value = read.ok ? read.polynomial.constantValue() : undefined
      if (value === undefined) throw new Error(`Not a number: "${term.trim()}" in "${source}"`)
      return value
    })
    return { kind: 'assignment', pieces: chainOf(assignment[1]!, terms), values }
  }
  const equation = FUNCTION_EQUATION.exec(text)
  if (equation) {
    const read = readFunction(text)
    if (!read.ok) throw new Error(`Not a function equation: "${source}" (${read.error.message})`)
    const rhs = text.slice(text.indexOf('=') + 1)
    return { kind: 'function', pieces: chainOf(equation[1] ? `${equation[1]}(x)` : 'y', [rhs]) }
  }
  if (FUNCTION_VALUE.test(text)) {
    const bare = BARE_FUNCTION_VALUE.exec(text)
    if (bare) {
      const read = readTerm(bare[2]!)
      if (!read.ok || read.polynomial.constantValue() === undefined) {
        throw new Error(`Not a function value: "${source}"`)
      }
      return { kind: 'value', pieces: [`${bare[1]}(${termToLatex(bare[2]!.trim())})`], values: [] }
    }
    const read = readFunctionValue(text)
    if (!read.ok) throw new Error(`Not a function value: "${source}" (${read.error.message})`)
    const close = text.indexOf(')')
    const [, ...terms] = text.slice(close + 1).split('=')
    const head = `${read.name}(${termToLatex(text.slice(text.indexOf('(') + 1, close).trim())})`
    return { kind: 'value', pieces: chainOf(head, terms), values: read.values.map((v) => v.value) }
  }
  const point = readPoint(text)
  if (!point.ok) {
    throw new Error(`Not a function equation, function value or point: "${source}" (${point.error.message})`)
  }
  return { kind: 'point', pieces: [pointToLatex(point.point, point.label ?? '')] }
}

/**
 * A segment about areas and perimeters, read with the math core: its LaTeX
 * pieces and, for a calculation, the values of the terms that consist of
 * numbers only (they must all be equal; checked by the content tests).
 */
export interface GeometrySegment {
  kind: 'calculation' | 'equation'
  pieces: string[]
  values: Rational[]
}

/** A quantity on the left of a calculation: area A, perimeter u or a length a–h. */
const GEOMETRY_QUANTITY = /^\s*([Aua-h])\s*$/
const GEOMETRY_UNIT = /\s*(cm²|cm)\s*$/
const LETTER = /[A-Za-zÄÖÜäöüß]/g
const LENGTH_LETTER = /^[a-h]$/

/** Lengths a–h only: other letters (also A, which the parser would read as a) are not allowed in a term. */
function checkGeometryLetters(term: string, source: string): void {
  for (const letter of term.match(LETTER) ?? []) {
    if (!LENGTH_LETTER.test(letter)) throw new Error(`Letter "${letter}" is not a length a–h in "${source}"`)
  }
}

/** LaTeX for a term of a geometry segment: dots as written, numbers with a decimal comma. */
function geometryTermToLatex(term: string, source: string): string {
  checkGeometryLetters(term, source)
  return toLatex(keepDots(parse(term), term), DECIMAL)
}

/**
 * Reads a segment with the prefix `geo:` (without the prefix):
 * - a calculation `A = g · h : 2 = 6 · 4 : 2 = 12 cm²` with the quantity on
 *   the left (A, u or a length a–h), terms with the lengths a–h and numbers
 *   (whole or with a decimal comma), and an optional unit at the end that
 *   must fit the quantity (A: cm², u and lengths: cm)
 * - an equation in lengths, optionally with an operation, e.g.
 *   `24 = 6 · h : 2` or `18 = 4,5h | : 4,5`
 * `:` and `/` are typeset as a fraction bar, as in the formula sheet.
 *
 * @throws Error if the source is neither or uses another letter.
 */
export function readGeometrySegment(source: string): GeometrySegment {
  const text = source.trim()
  const parts = text.split('=')
  const quantity = parts.length > 1 && !text.includes('|') ? GEOMETRY_QUANTITY.exec(parts[0]!) : null
  if (!quantity) return readGeometryEquation(text, source)

  const name = quantity[1]!
  const terms = parts.slice(1)
  const last = terms.length - 1
  const unitMatch = GEOMETRY_UNIT.exec(terms[last]!)
  let unit: Unit | undefined
  if (unitMatch) {
    unit = unitMatch[1] as Unit
    terms[last] = terms[last]!.slice(0, unitMatch.index)
    const expected: Unit = name === 'A' ? 'cm²' : 'cm'
    if (unit !== expected) throw new Error(`The unit of ${name} is ${expected}, not ${unit}, in "${source}"`)
  }
  const values: Rational[] = []
  const pieces = [name]
  for (const term of terms) {
    if (term.trim() === '') throw new Error(`Empty term in "${source}"`)
    const latex = geometryTermToLatex(term.trim(), source)
    const value = toPolynomial(parse(term)).constantValue()
    if (value !== undefined && !/[a-h]/.test(term)) values.push(value)
    pieces.push(`= ${latex}`)
  }
  if (unit) pieces[pieces.length - 1] += `\\,${unitToLatex(unit)}`
  return { kind: 'calculation', pieces, values }
}

function readGeometryEquation(text: string, source: string): GeometrySegment {
  const bar = text.indexOf('|')
  const equation = (bar < 0 ? text : text.slice(0, bar)).trim()
  const operation = bar < 0 ? '' : text.slice(bar)
  const read = readEquation(equation)
  if (!read.ok) throw new Error(`Not a calculation or an equation: "${source}" (${read.error.message})`)
  const equals = equation.indexOf('=')
  const pieces = [
    geometryTermToLatex(equation.slice(0, equals).trim(), source),
    `= ${geometryTermToLatex(equation.slice(equals + 1).trim(), source)}`,
  ]
  if (operation !== '') {
    checkGeometryLetters(operation.slice(1), source)
    const op = readOperation(operation)
    if (!op.ok) throw new Error(`Not an allowed operation: "${source}" (${op.error.message})`)
    pieces.push(operationToLatex(op.operation, DECIMAL))
  }
  return { kind: 'equation', pieces, values: [] }
}

/**
 * LaTeX pieces of an equation segment (without the `eq:` prefix): the left
 * side, `= right side`, then the operation; or the solution set alone. Both
 * sides keep the multiplication dots written in the source.
 *
 * @throws Error if the source is not an equation, an operation or a solution set.
 */
export function equationPieces(source: string): string[] {
  const text = source.trim()
  if (/^L\s*=/.test(text)) {
    const read = readSolutionSet(text)
    if (!read.ok) throw new Error(`Not a solution set: "${source}" (${read.error.message})`)
    return [solutionSetToLatex(read.solutionSet)]
  }
  const bar = text.indexOf('|')
  const equation = (bar < 0 ? text : text.slice(0, bar)).trim()
  const operation = bar < 0 ? '' : text.slice(bar)
  const pieces: string[] = []
  if (equation !== '') {
    const read = readEquation(equation)
    if (!read.ok) throw new Error(`Not an equation: "${source}" (${read.error.message})`)
    const equals = equation.indexOf('=')
    pieces.push(termToLatex(equation.slice(0, equals).trim()), `= ${termToLatex(equation.slice(equals + 1).trim())}`)
  }
  if (operation !== '') {
    const read = readOperation(operation)
    if (!read.ok) throw new Error(`Not an allowed operation: "${source}" (${read.error.message})`)
    pieces.push(operationToLatex(read.operation))
  }
  if (pieces.length === 0) throw new Error(`Empty equation segment: "${source}"`)
  return pieces
}

/** LaTeX for a whole equation segment, e.g. `3x + 2 = x + 8 \mid\; {-}\, x`. */
export function equationToLatexMarkup(source: string): string {
  return equationPieces(source).join(' ')
}

export type Relation = '=' | '≠'

/** A term chain such as `a = b ≠ c`: the terms and the relations between neighbours. */
export interface Chain {
  terms: string[]
  relations: Relation[]
}

export function splitChain(source: string): Chain {
  const tokens = source.split(/\s*(=|≠)\s*/)
  const terms: string[] = []
  const relations: Relation[] = []
  tokens.forEach((token, i) => {
    if (i % 2 === 0) terms.push(token.trim())
    else relations.push(token as Relation)
  })
  return { terms, relations }
}

/**
 * LaTeX pieces of a term chain: the first term, then each relation with the
 * following term, e.g. `x \cdot x`, `\neq 2x`. Line breaks are allowed only
 * between pieces, never inside a term.
 */
export function chainPieces(source: string): string[] {
  const { terms, relations } = splitChain(source)
  return terms.map((term, i) => {
    const latex = termToLatex(term)
    return i === 0 ? latex : `${relations[i - 1] === '≠' ? '\\neq' : '='} ${latex}`
  })
}

/** LaTeX for a whole term chain from the markup, e.g. `x \cdot x \neq 2x`. */
export function chainToLatex(source: string): string {
  return chainPieces(source).join(' ')
}

/**
 * LaTeX for a single term in input syntax. Multiplication dots written in the
 * source (e.g. `3·(-5)`, `a·a`) are kept, because the parser only records the
 * product, not how it was written.
 */
export function termToLatex(term: string): string {
  return toLatex(keepDots(parse(term), term))
}

const DOT = /[·*×]/

function keepDots(e: Expr, source: string): Expr {
  switch (e.type) {
    case 'mul': {
      const factors = e.factors.map((f) => keepDots(f, source))
      const explicit = factors.some((f, i) => {
        const prev = factors[i - 1]
        return prev?.span !== undefined && f.span !== undefined && DOT.test(source.slice(prev.span.end, f.span.start))
      })
      return { ...e, factors, explicit: e.explicit || explicit }
    }
    case 'add':
      return { ...e, terms: e.terms.map((t) => keepDots(t, source)) }
    case 'neg':
      return { ...e, arg: keepDots(e.arg, source) }
    case 'group':
      return { ...e, body: keepDots(e.body, source) }
    case 'pow':
      return { ...e, base: keepDots(e.base, source) }
    case 'div':
      return { ...e, num: keepDots(e.num, source), den: keepDots(e.den, source) }
    default:
      return e
  }
}
