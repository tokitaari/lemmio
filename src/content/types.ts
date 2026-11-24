import type { Card } from '../cards/types'
import type { EquationTask, FunctionTask, Task } from '../math'

/** A paragraph or list item in explanation markup (see markup.ts). */
export type Markup = string

/**
 * A fully worked example; the solution steps come from the math core. Term
 * subtopics use a `Task`, equation subtopics an `EquationTask` (see
 * `isEquationTask`), function subtopics a `FunctionTask` (see
 * `isFunctionTask`).
 */
export interface WorkedExample {
  title: string
  task: Task | EquationTask | FunctionTask
  /** Optional remark after the solution. */
  comment?: Markup
}

/** A formula (identity) in input syntax; both sides are typeset with `toLatex` and checked for equivalence. */
export interface Formula {
  kind?: 'identity'
  id: string
  name: string
  lhs: string
  rhs: string
}

/**
 * An equivalence transformation such as `a = b ⇔ a + c = b + c`. Both
 * equations are in input syntax; the content tests check with numbers that
 * the second equation holds exactly when the first one does.
 */
export interface EquivalenceRule {
  kind: 'equivalence'
  id: string
  name: string
  from: string
  to: string
  /** Condition in input syntax, e.g. `c ≠ 0`. */
  condition?: string
}

/** How to read off the solution set, e.g. `x = c ⇒ L = {c}`. */
export interface SolutionSetRule {
  kind: 'solution-set'
  id: string
  name: string
  /** The last line, in input syntax. */
  line: string
  /** `L = {…}`, `L = { }` or `L = ℚ`; the element may be a letter. */
  set: string
}

/**
 * A definition or procedure that is no identity, e.g. the slope from two
 * points `m = (y₂ − y₁) : (x₂ − x₁)`. Written directly in LaTeX; the content
 * tests only typeset it (KaTeX, strict).
 */
export interface StatementEntry {
  kind: 'statement'
  id: string
  name: string
  latex: string
  /** Condition in LaTeX, e.g. `x_1 \neq x_2`. */
  condition?: string
}

/** An entry of the formula sheet. */
export type SheetEntry = Formula | EquivalenceRule | SolutionSetRule | StatementEntry

export interface FormulaGroup {
  title: string
  formulas: SheetEntry[]
}

export interface SubtopicContent {
  /** Explanation as a deck of cards (see src/cards); the deck id is the subtopic's `SubtopicId`. */
  cards: Card[]
  examples: WorkedExample[]
  /** Entries of the formula sheet that belong to this subtopic. */
  formulaIds: string[]
}

/** True if the example is about a linear function (it may carry an equation as well). */
export function isFunctionTask(task: Task | EquationTask | FunctionTask): task is FunctionTask {
  return 'fn' in task
}

/** True if the example is a linear equation solved line by line. */
export function isEquationTask(task: Task | EquationTask | FunctionTask): task is EquationTask {
  return 'equation' in task && !isFunctionTask(task)
}
