/**
 * Geometry: areas and perimeters of parallelogram, triangle, rhombus and
 * trapezoid. Calculations (Rechenketten) with a chosen unit, substituted
 * formulas for Rückwärts tasks (then solved line by line as in ./equations),
 * exact polygon analysis for drawing tasks on the grid, and task generators
 * with worked solutions. Numbers are printed with a decimal comma
 * (`{ numbers: 'decimal' }`).
 *
 * Typical use in the UI:
 *
 *   const task = generateGeometryTask('geometrie/vierecke-und-flaechen/dreieck', Math.random)
 *   if (task.kind === 'area') checkCalculation(task.calculation, 'A = g · h : 2 = 6 · 4 : 2 = 12', 'cm²')
 *   if (task.kind === 'reverse') checkSubstitution(task, '12 = 6 · h : 2')   // then task.equation line by line
 *   if (task.kind === 'draw-height') checkFoot(task, point(3, 2))
 *   if (task.kind === 'complete-shape') checkDrawing(task, point(2, 5))
 */
export { attempt, type Attempt } from './attempt'
export {
  calculationValues,
  checkCalculation,
  checkUnit,
  parseCalculation,
  resultForm,
  type CalculationCheckResult,
  type CalculationTerm,
  type ParsedCalculation,
  type ResultForm,
} from './calculation'
export { buildFigure, footOn } from './figures'
export {
  checkDrawing,
  checkFoot,
  drawnPolygon,
  type DrawHeightTask,
  type DrawingCheckResult,
  type FigureDrawingTask,
  type FootCheckResult,
} from './drawing'
export {
  areaFormula,
  calculationChain,
  calculationToLatex,
  calculationToText,
  DECIMAL,
  evaluateFormula,
  evaluateInnerSums,
  formulaFor,
  formulaLetters,
  insertMeasures,
  isLetter,
  length as toLength,
  numberLatex as geometryNumberToLatex,
  numberText as geometryNumberToText,
  perimeterFormula,
  QUANTITY_SYMBOL,
  QUANTITY_UNIT,
  unitToLatex,
  withUnit,
  withUnitLatex,
} from './formulas'
export {
  arePerpendicular,
  areParallel,
  classifyQuadrilateral,
  exactDistance,
  footOfPerpendicular,
  isOnLine,
  isSimplePolygon,
  lineParameter,
  polygonArea,
  segmentsIntersect,
  signedArea,
  squaredDistance,
  type QuadrilateralKind,
} from './polygon'
export { checkSubstitution, type SubstitutionCheckResult, type SubstitutionKey } from './substitution'
export {
  buildAreaTask,
  buildCompleteShapeTask,
  buildDrawAreaTask,
  buildDrawHeightTask,
  buildPerimeterTask,
  buildReverseTask,
  CALCULATION_KINDS,
  GEOMETRY_SERIES_LENGTH,
  GEOMETRY_SUBTOPIC_IDS,
  GEOMETRY_WINDOW,
  generateGeometrySeries,
  generateGeometryTask,
  geometryGenerators,
  geometrySeriesVariants,
  type FigureOptions,
  type GeometrySeriesOptions,
  type Lengths,
} from './tasks'
export type {
  CalculationKey,
  FigureLabel,
  GeometrySolutionLine,
  GeometryTask,
  GeometryTaskGenerator,
  GeometryTaskKind,
  Letter,
  Measures,
  Quantity,
  ShapeKind,
  TaskFigure,
  Unit,
  Vec,
} from './types'
