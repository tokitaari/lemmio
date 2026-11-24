/**
 * Math core of Lemmio: parsing learner input, canonical polynomials,
 * equivalence and form checks, and task generators.
 *
 * Typical use in the UI:
 *
 *   const task = generateTask('algebra/terme/binomische-formeln', Math.random, recentKeys)
 *   toLatex(task.prompt)                     // show the exercise
 *   const result = checkAnswer(task, input)  // 'correct' | 'wrong' | 'wrong-form' | 'invalid'
 *   task.steps.map((s) => toLatex(s.expr))   // worked solution
 *
 * The build*Task functions create the same tasks with fixed numbers, e.g. for
 * worked examples in the explanations.
 *
 * Linear equations are solved line by line and have their own tasks, checks
 * and generators; see ./equations. Linear functions (function equations,
 * points, graphs) are the third register; see ./functions.
 */
export * as build from './ast'
export type { Expr, Span } from './ast'
export { checkAnswer, readTerm, type AnswerKey, type CheckResult, type ReadResult } from './check'
export { TermError, type TermErrorCode, type TermErrorInfo } from './errors'
export * from './equations'
export * from './functions'
export { checkForm, isExpanded, type FormHint, type FormHintCode, type FormRequirement } from './form'
export { areEquivalent, polynomialToExpr, toPolynomial } from './normalize'
export { MAX_EXPONENT, MAX_INPUT_LENGTH, parse } from './parser'
export { Polynomial } from './polynomial'
export { toLatex, toText } from './printer'
export { createRng, type Rng } from './random'
export {
  ALL_SUBTOPIC_IDS,
  isEquationSubtopic,
  isFunctionSubtopic,
  isTermSubtopic,
  type AnySubtopicId,
  type EquationSubtopicId,
  type FunctionSubtopicId,
  type TermSubtopicId,
} from './topics'
export { Rational } from './rational'
export {
  buildBinomialFactorTask,
  buildBinomialTask,
  buildCommonFactorTask,
  buildCommonThenBinomialTask,
  buildExpandTask,
  FORMULA_NOTES,
  generateSeries,
  generateTask,
  generators,
  SERIES_LENGTH,
  SUBTOPIC_IDS,
  type BinomialKind,
  type BinomialParts,
  type SolutionStep,
  type Task,
  type TaskGenerator,
  type SubtopicId,
} from './tasks'
