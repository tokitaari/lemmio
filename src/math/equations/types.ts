import type { Expr } from '../ast'
import type { Rng } from '../random'
import type { Rational } from '../rational'
import type { SubtopicId } from '../tasks/types'

/** An equation `left = right`; both sides are ordinary terms. */
export interface Equation {
  left: Expr
  right: Expr
}

/**
 * What the learner states for a line of the solution:
 * - `add` / `subtract`: `| + T`, `| − T` with a linear term T
 * - `multiply` / `divide`: `| · c`, `| : c` with a number c ≠ 0
 * - `simplify`: "Term umformen" – each side is rewritten on its own
 * - `swap`: "⇄" – the sides change places
 */
export type Operation =
  | { kind: 'add' | 'subtract' | 'multiply' | 'divide'; operand: Expr }
  | { kind: 'simplify' }
  | { kind: 'swap' }

/** Solution set over ℚ: `L = {c}`, `L = { }` or `L = ℚ`. */
export type SolutionSet = { kind: 'single'; value: Rational } | { kind: 'empty' } | { kind: 'all' }

/** One line of a worked solution: `operation` applied to the line before gives `equation`. */
export interface EquationStep {
  operation: Operation
  equation: Equation
  /** German explanation of the step. */
  note?: string
}

export interface EquationTask {
  topic: SubtopicId
  /** Generator variant, e.g. "both-sides"; useful for tests and later statistics. */
  variant: string
  /** Identity of the exercise (the printed equation); used to avoid repetitions. */
  key: string
  /** German instruction. */
  instruction: string
  /** The variable to solve for. */
  variable: string
  /** The equation to solve (the first line). */
  equation: Equation
  /** Worked solution: the lines after `equation`, each with its operation. */
  steps: EquationStep[]
  /** Expected last line. */
  solutionSet: SolutionSet
  /** German sentence that explains the solution set. */
  solutionNote: string
}

export type EquationTaskGenerator = (rng: Rng) => EquationTask
