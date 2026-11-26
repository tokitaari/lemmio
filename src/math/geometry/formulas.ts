import { add, num, times, v, type Expr, type VarNode } from '../ast'
import { toPolynomial } from '../normalize'
import { toLatex, toText, type PrintOptions } from '../printer'
import { Rational } from '../rational'
import type { Letter, Measures, Quantity, ShapeKind, Unit } from './types'

/** Geometry prints numbers with a decimal comma, e.g. `6,5`. */
export const DECIMAL: PrintOptions = { numbers: 'decimal' }

const LETTERS: readonly Letter[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

export function isLetter(name: string): name is Letter {
  return (LETTERS as readonly string[]).includes(name)
}

/** Symbol of the quantity on the left of a calculation. */
export const QUANTITY_SYMBOL: Readonly<Record<Quantity, string>> = { area: 'A', perimeter: 'u' }

export const QUANTITY_UNIT: Readonly<Record<Quantity, Unit>> = { area: 'cm²', perimeter: 'cm' }

/** `expr : 2`, printed as `g·h/2` and `\frac{g \cdot h}{2}`. */
function half(expr: Expr): Expr {
  return { type: 'div', num: expr, den: num(2) }
}

/**
 * Area formula: parallelogram `g·h`, triangle `g·h/2`, rhombus `e·f/2`,
 * trapezoid `(a + c)·h/2`.
 */
export function areaFormula(shape: ShapeKind): Expr {
  switch (shape) {
    case 'parallelogram':
      return times(v('g'), v('h'))
    case 'triangle':
      return half(times(v('g'), v('h')))
    case 'rhombus':
      return half(times(v('e'), v('f')))
    case 'trapezoid':
      return half(times(add(v('a'), v('c')), v('h')))
  }
}

/**
 * Perimeter formula: parallelogram `2·(a + b)`, triangle `a + b + c`,
 * rhombus `4·a`, trapezoid `a + b + c + d`.
 */
export function perimeterFormula(shape: ShapeKind): Expr {
  switch (shape) {
    case 'parallelogram':
      return times(num(2), add(v('a'), v('b')))
    case 'triangle':
      return add(v('a'), v('b'), v('c'))
    case 'rhombus':
      return times(num(4), v('a'))
    case 'trapezoid':
      return add(v('a'), v('b'), v('c'), v('d'))
  }
}

export function formulaFor(shape: ShapeKind, quantity: Quantity): Expr {
  return quantity === 'area' ? areaFormula(shape) : perimeterFormula(shape)
}

/** All variable nodes of an expression, in reading order. */
export function variableNodes(expr: Expr): VarNode[] {
  switch (expr.type) {
    case 'num':
      return []
    case 'var':
      return [expr]
    case 'add':
      return expr.terms.flatMap(variableNodes)
    case 'mul':
      return expr.factors.flatMap(variableNodes)
    case 'neg':
      return variableNodes(expr.arg)
    case 'div':
      return [...variableNodes(expr.num), ...variableNodes(expr.den)]
    case 'pow':
      return variableNodes(expr.base)
    case 'group':
      return variableNodes(expr.body)
  }
}

/** The letters of a formula, each once, in reading order. */
export function formulaLetters(expr: Expr): Letter[] {
  const letters: Letter[] = []
  for (const node of variableNodes(expr)) {
    if (isLetter(node.name) && !letters.includes(node.name)) letters.push(node.name)
  }
  return letters
}

/** Replaces every letter that has a length (except `keep`) by its number. */
export function insertMeasures(expr: Expr, measures: Measures, keep?: Letter): Expr {
  const insert = (e: Expr) => insertMeasures(e, measures, keep)
  switch (expr.type) {
    case 'num':
      return expr
    case 'var': {
      const value = isLetter(expr.name) && expr.name !== keep ? measures[expr.name] : undefined
      return value ? num(value) : expr
    }
    case 'add':
      return { ...expr, terms: expr.terms.map(insert) }
    case 'mul':
      return { ...expr, factors: expr.factors.map(insert) }
    case 'neg':
      return { ...expr, arg: insert(expr.arg) }
    case 'div':
      return { ...expr, num: insert(expr.num), den: insert(expr.den) }
    case 'pow':
      return { ...expr, base: insert(expr.base) }
    case 'group':
      return { ...expr, body: insert(expr.body) }
  }
}

/**
 * Value of a formula with all letters inserted.
 *
 * @throws RangeError if a letter has no length.
 */
export function evaluateFormula(expr: Expr, measures: Measures): Rational {
  const value = toPolynomial(insertMeasures(expr, measures)).constantValue()
  if (value === undefined) throw new RangeError(`Missing lengths for ${toText(expr)}`)
  return value
}

/**
 * Works out the sums inside products and quotients, e.g. `(4 + 6)·3/2` →
 * `10·3/2` and `2·(5 + 3)` → `2·8`; a sum on its own (`5 + 4 + 3`) stays.
 */
export function evaluateInnerSums(expr: Expr, top = true): Expr {
  const inner = (e: Expr) => evaluateInnerSums(e, false)
  switch (expr.type) {
    case 'add': {
      const value = toPolynomial(expr).constantValue()
      return !top && value !== undefined ? num(value) : expr
    }
    case 'group': {
      const body = inner(expr.body)
      return body.type === 'num' ? body : { ...expr, body }
    }
    case 'mul':
      return { ...expr, factors: expr.factors.map(inner) }
    case 'div':
      return { ...expr, num: inner(expr.num), den: inner(expr.den) }
    default:
      return expr
  }
}

/**
 * The chain of a worked calculation: formula, numbers inserted, inner sums
 * worked out (if there are any), result. E.g. `(a + c)·h/2`, `(4 + 6)·3/2`,
 * `10·3/2`, `15`.
 */
export function calculationChain(formula: Expr, measures: Measures): Expr[] {
  const inserted = insertMeasures(formula, measures)
  const chain = [formula, inserted, evaluateInnerSums(inserted), num(evaluateFormula(formula, measures))]
  return chain.filter((e, i) => {
    const previous = chain[i - 1]
    return previous === undefined || toText(previous, DECIMAL) !== toText(e, DECIMAL)
  })
}

/** `A = g·h/2 = 6·4/2 = 12`; can be read back with `parseCalculation`. */
export function calculationToText(quantity: Quantity, chain: readonly Expr[]): string {
  return [QUANTITY_SYMBOL[quantity], ...chain.map((e) => toText(e, DECIMAL))].join(' = ')
}

export function calculationToLatex(quantity: Quantity, chain: readonly Expr[]): string {
  return [QUANTITY_SYMBOL[quantity], ...chain.map((e) => toLatex(e, DECIMAL))].join(' = ')
}

/** A length or area as text with decimal comma, e.g. `6,5`. */
export function numberText(value: Rational): string {
  return toText(num(value), DECIMAL)
}

export function numberLatex(value: Rational): string {
  return toLatex(num(value), DECIMAL)
}

export function unitToLatex(unit: Unit): string {
  return unit === 'cm' ? '\\text{cm}' : '\\text{cm}^{2}'
}

/** `6,5 cm`, `12 cm²` */
export function withUnit(value: Rational, unit: Unit): string {
  return `${numberText(value)} ${unit}`
}

export function withUnitLatex(value: Rational, unit: Unit): string {
  return `${numberLatex(value)}\\,${unitToLatex(unit)}`
}

/**
 * A length such as 6.5 as an exact number.
 *
 * @throws RangeError for numbers with more than two decimals.
 */
export function length(value: number | Rational): Rational {
  if (value instanceof Rational) return value
  const hundredths = Math.round(value * 100)
  if (Math.abs(value * 100 - hundredths) > 1e-9) {
    throw new RangeError(`Not a length with at most two decimals: ${value}`)
  }
  return Rational.of(hundredths, 100)
}
