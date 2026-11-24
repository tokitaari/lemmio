/**
 * Linear functions f(x) = mx + n: reading function equations, points and
 * function values, checks (including drawn graphs), slope, Punktprobe, zeros
 * and intersections, and task generators with worked solutions.
 *
 * Typical use in the UI:
 *
 *   const task = generateFunctionTask('funktionen/lineare-funktionen/gleichung-aufstellen', Math.random)
 *   checkFunction(task.fn, 'f(x) = 2x - 3')        // 'correct' | 'wrong' | 'wrong-form' | 'invalid'
 *   checkDrawnLine(task.fn, point(0, -3), point(1, -1))
 *   checkPoint(point(2, 5), 'S(2|5)')
 *   task.steps.map((s) => s.latex)                 // worked solution
 *
 * Where an equation is solved (n from a point, zero, intersection), the task
 * carries an EquationTask that can be practised line by line (see ./equations).
 */
export {
  equalPoints,
  functionExpr,
  functionPolynomial,
  intersect,
  isOnGraph,
  linearFunction,
  lineThroughPoints,
  point,
  slopeFromPoints,
  substitute,
  valueAt,
  zeroOf,
} from './analysis'
export {
  checkDrawnLine,
  checkFunction,
  checkFunctionValue,
  checkIntersection,
  checkPoint,
  checkZero,
  type DrawnLineCheckResult,
  type FunctionCheckResult,
  type FunctionValueCheckResult,
  type IntersectionAnswer,
  type IntersectionCheckResult,
  type PointCheckResult,
  type ZeroAnswer,
  type ZeroCheckResult,
} from './check'
export {
  functionEquationToLatex,
  functionEquationToText,
  functionToLatex,
  functionToText,
  numberToLatex,
  numberToText,
  pointToLatex,
  pointToText,
} from './print'
export {
  parseFunction,
  parseFunctionValue,
  parsePoint,
  readFunction,
  readFunctionValue,
  readPoint,
  type ParsedFunction,
  type ParsedFunctionValue,
  type ParsedPoint,
  type ReadFunctionResult,
  type ReadFunctionValueResult,
  type ReadPointResult,
} from './read'
export {
  buildGraphTask,
  buildIntersectionTask,
  buildPointSlopeTask,
  buildPointTestTask,
  buildTwoPointsTask,
  buildZeroTask,
  FUNCTION_SUBTOPIC_IDS,
  FUNCTION_WINDOW,
  functionGenerators,
  generateFunctionSeries,
  generateFunctionTask,
  type Coordinates,
  type SlopeIntercept,
} from './tasks'
export {
  FUNCTION_VARIABLE,
  type FunctionSolutionLine,
  type FunctionTask,
  type FunctionTaskGenerator,
  type FunctionTaskKind,
  type FunctionZero,
  type Intersection,
  type LinearFunction,
  type LineThroughPoints,
  type Point,
} from './types'
