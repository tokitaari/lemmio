import { num, type Expr } from '../ast'
import { toLatex, toText } from '../printer'
import type { Rational } from '../rational'
import { functionExpr } from './analysis'
import { FUNCTION_VARIABLE, type LinearFunction, type Point } from './types'

/** A number as text, e.g. `-3` or `1/2`. */
export function numberToText(value: Rational): string {
  return toText(num(value))
}

/** A number as LaTeX. */
export function numberToLatex(value: Rational): string {
  return toLatex(num(value))
}

/** `f(x) = 2x - 3`; can be read back with `parseFunction`. */
export function functionToText(fn: LinearFunction): string {
  return functionEquationToText(fn.name, functionExpr(fn))
}

/** LaTeX for KaTeX, e.g. `f(x) = 2x - 3`. */
export function functionToLatex(fn: LinearFunction): string {
  return functionEquationToLatex(fn.name, functionExpr(fn))
}

/** `g(x) = 2(x + 1) - 3` with any right-hand side. */
export function functionEquationToText(name: string, expr: Expr): string {
  return `${name}(${FUNCTION_VARIABLE}) = ${toText(expr)}`
}

export function functionEquationToLatex(name: string, expr: Expr): string {
  return `${name}(${FUNCTION_VARIABLE}) = ${toLatex(expr)}`
}

/** `P(2|-3)`; an empty label gives `(2|-3)`. Can be read back with `parsePoint`. */
export function pointToText(p: Point, label = 'P'): string {
  return `${label}(${numberToText(p.x)}|${numberToText(p.y)})`
}

/** LaTeX for KaTeX, e.g. `P(2 \mid -3)`. */
export function pointToLatex(p: Point, label = 'P'): string {
  return `${label}(${numberToLatex(p.x)} \\mid ${numberToLatex(p.y)})`
}
