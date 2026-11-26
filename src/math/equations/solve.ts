import { add, num, type Expr } from '../ast'
import { polynomialToExpr, termToExpr, toPolynomial } from '../normalize'
import { Polynomial } from '../polynomial'
import { toText, type PrintOptions } from '../printer'
import { Rational } from '../rational'
import { equationToText, linearParts, sidePolynomials } from './equation'
import type { Equation, EquationStep, Operation, SolutionSet } from './types'

export interface WorkedSolution {
  /** The variable solved for ("x" if the equation has none). */
  variable: string
  steps: EquationStep[]
  solutionSet: SolutionSet
  /** German sentence that explains the solution set. */
  solutionNote: string
}

/** `slope · x + constant` in canonical form, e.g. `2x - 3`, `-x`, `5` or `0`. */
function linearExpr(slope: Rational, constant: Rational, x: string): Expr {
  return polynomialToExpr(Polynomial.monomial(slope, { [x]: 1 }).add(Polynomial.constant(constant)))
}

/**
 * Multiplies out every summand on its own without combining like terms,
 * e.g. `2(x - 3) + 4` → `2x - 6 + 4` and `5x - (2x - 4)` → `5x - 2x + 4`.
 */
function distribute(side: Expr): Expr {
  const summands = side.type === 'add' ? side.terms : [side]
  const parts = summands.flatMap((summand) => toPolynomial(summand).terms().map(termToExpr))
  return parts.length === 0 ? num(0) : add(...parts)
}

/**
 * Worked solution of a linear equation in one variable, the way it is taught
 * in class 8 (`options` decide how numbers appear in the notes):
 * 1. remove brackets, then combine like terms (both "Term umformen")
 * 2. swap the sides if the variable only occurs on the right
 * 3. bring the variable terms to the left, then the numbers to the right
 * 4. divide by the coefficient (or multiply by −1)
 * The last line is `x = c` or a statement without variable such as `3 = 5`.
 *
 * @throws RangeError if the equation is not linear in a single variable.
 */
export function solveStepByStep(start: Equation, options?: PrintOptions): WorkedSolution {
  const sides = sidePolynomials(start)
  const leftParts = linearParts(sides.left)
  const rightParts = linearParts(sides.right)
  const names = new Set([...sides.left.variables(), ...sides.right.variables()])
  if (!leftParts || !rightParts || names.size > 1) {
    throw new RangeError(`Not a linear equation in one variable: ${equationToText(start)}`)
  }
  const x = [...names][0] ?? 'x'

  const steps: EquationStep[] = []
  let current = start
  /** Adds a line; rewriting steps that change nothing are skipped. */
  const push = (operation: Operation, equation: Equation, note: string) => {
    if (operation.kind === 'simplify' && equationToText(equation) === equationToText(current)) return
    steps.push({ operation, equation, note })
    current = equation
  }

  const hasBrackets = equationToText(start).includes('(')
  push(
    { kind: 'simplify' },
    { left: distribute(start.left), right: distribute(start.right) },
    hasBrackets ? 'Klammern auflösen.' : 'Vereinfachen.',
  )
  push(
    { kind: 'simplify' },
    { left: polynomialToExpr(sides.left), right: polynomialToExpr(sides.right) },
    'Ordnen und zusammenfassen.',
  )

  // From here on the line is always  a·x + b = c·x + d.
  let a = leftParts.slope
  let b = leftParts.constant
  let c = rightParts.slope
  let d = rightParts.constant
  const line = (): Equation => ({ left: linearExpr(a, b, x), right: linearExpr(c, d, x) })

  if (a.isZero() && !c.isZero()) {
    ;[a, b, c, d] = [c, d, a, b]
    push({ kind: 'swap' }, line(), `Seiten tauschen, damit ${x} links steht.`)
  }
  if (!c.isZero()) {
    const operation: Operation = {
      kind: c.sign() > 0 ? 'subtract' : 'add',
      operand: linearExpr(c.abs(), Rational.ZERO, x),
    }
    a = a.sub(c)
    c = Rational.ZERO
    push(operation, line(), `Alle Terme mit ${x} auf die linke Seite bringen.`)
  }

  if (a.isZero()) {
    const statement = toText(current.left, options) + ' = ' + toText(current.right, options)
    return b.equals(d)
      ? {
          variable: x,
          steps,
          solutionSet: { kind: 'all' },
          solutionNote: `${statement} ist eine wahre Aussage: Jede Zahl erfüllt die Gleichung.`,
        }
      : {
          variable: x,
          steps,
          solutionSet: { kind: 'empty' },
          solutionNote: `${statement} ist eine falsche Aussage: Keine Zahl erfüllt die Gleichung.`,
        }
  }

  if (!b.isZero()) {
    const operation: Operation = { kind: b.sign() > 0 ? 'subtract' : 'add', operand: num(b.abs()) }
    d = d.sub(b)
    b = Rational.ZERO
    push(operation, line(), 'Die Zahlen auf die rechte Seite bringen.')
  }
  if (a.equals(Rational.ONE.neg())) {
    d = d.neg()
    a = Rational.ONE
    push({ kind: 'multiply', operand: num(-1) }, line(), `Mit -1 multiplizieren, damit vor ${x} kein Minus steht.`)
  } else if (!a.isOne()) {
    const operation: Operation = { kind: 'divide', operand: num(a) }
    d = d.div(a)
    a = Rational.ONE
    push(operation, line(), `Durch die Zahl vor ${x} teilen.`)
  }
  return {
    variable: x,
    steps,
    solutionSet: { kind: 'single', value: d },
    solutionNote: `Die Gleichung hat genau eine Lösung: ${x} = ${toText(num(d), options)}.`,
  }
}
