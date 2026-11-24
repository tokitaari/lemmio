/**
 * Linear equations: reading equations, operations and solution sets, checking
 * a solution line by line, and task generators with worked solutions.
 *
 * Typical use in the UI:
 *
 *   const task = generateEquationTask('algebra/lineare-gleichungen/umformen', Math.random)
 *   let line = task.equation                             // first line
 *   const op = readOperation('| - 3x')                   // or { kind: 'simplify' } / { kind: 'swap' } from the keys
 *   if (op.ok) {
 *     const result = checkStep(line, op.operation, '2x + 5 = 9')
 *     if (result.kind === 'correct') line = result.equation
 *   }
 *   checkSolutionSet(task, 'L = {2}')                    // last line
 */
export { checkStep, type StepCheckResult } from './check'
export {
  equalSolutionSets,
  equationForm,
  equationToLatex,
  equationToText,
  haveSameSolutions,
  parseEquation,
  readEquation,
  solveEquation,
  type EquationForm,
  type ReadEquationResult,
} from './equation'
export {
  operationProblem,
  operationToLatex,
  operationToText,
  parseOperation,
  readOperation,
  SIMPLIFY_LABEL,
  SWAP_SYMBOL,
  type OperationProblem,
  type OperationProblemCode,
  type ReadOperationResult,
} from './operation'
export {
  checkSolutionSet,
  parseSolutionSet,
  readSolutionSet,
  solutionSetToLatex,
  solutionSetToText,
  type ReadSolutionSetResult,
  type SolutionSetCheckResult,
} from './solutionSet'
export { solveStepByStep, type WorkedSolution } from './solve'
export {
  buildEquationTask,
  EQUATION_SUBTOPIC_IDS,
  equationGenerators,
  generateEquationSeries,
  generateEquationTask,
} from './tasks'
export type {
  Equation,
  EquationStep,
  EquationTask,
  EquationTaskGenerator,
  Operation,
  SolutionSet,
} from './types'
