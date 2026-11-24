import type { Expr } from '../ast'
import type { FormRequirement } from '../form'
import { polynomialToExpr, toPolynomial } from '../normalize'
import { Polynomial } from '../polynomial'
import { toText } from '../printer'
import { pick, type Rng } from '../random'
import type { SolutionStep, Task, SubtopicId } from './types'

/** Variable letters for single-variable tasks; x is the most common in class 8. */
const SINGLE_VARS = ['x', 'x', 'x', 'a', 'y'] as const
const VAR_PAIRS = [
  ['x', 'y'],
  ['a', 'b'],
] as const

export function pickVar(rng: Rng): string {
  return pick(rng, SINGLE_VARS)
}

export function pickVarPair(rng: Rng): readonly [string, string] {
  return pick(rng, VAR_PAIRS)
}

/** `coef · name` (or just `coef` without a name) as a polynomial. */
export function mono(coef: number, name?: string, exponent = 1): Polynomial {
  return Polynomial.monomial(coef, name ? { [name]: exponent } : {})
}

/** Sum of polynomials. */
export function sum(...parts: Polynomial[]): Polynomial {
  return parts.reduce((acc, p) => acc.add(p), Polynomial.zero())
}

/** Canonical expression of a polynomial (shorthand). */
export function ex(p: Polynomial): Expr {
  return polynomialToExpr(p)
}

/**
 * True if `f · g` is a binomial-formula product: (A+B)², (A−B)² or (A+B)(A−B),
 * i.e. f + g and f − g are both single terms (or zero).
 */
export function isBinomialPattern(f: Polynomial, g: Polynomial): boolean {
  return f.add(g).termCount <= 1 && f.sub(g).termCount <= 1
}

interface TaskSpec {
  topic: SubtopicId
  variant: string
  instruction: string
  prompt: Expr
  steps: SolutionStep[]
  form: FormRequirement
}

/** Completes a task: expected value from the prompt, solution from the last step, key from the prompt text. */
export function makeTask(spec: TaskSpec): Task {
  const steps = dedupeSteps(spec.steps)
  const last = steps[steps.length - 1]
  if (!last) throw new Error(`Task ${spec.variant} has no solution steps`)
  return {
    ...spec,
    steps,
    key: toText(spec.prompt),
    expected: toPolynomial(spec.prompt),
    solution: last.expr,
  }
}

/** Drops steps that print exactly like the step before (e.g. nothing to combine); the first note wins. */
function dedupeSteps(steps: SolutionStep[]): SolutionStep[] {
  return steps.filter((step, i) => {
    const prev = steps[i - 1]
    return !prev || toText(prev.expr) !== toText(step.expr)
  })
}
