import type { SubtopicId } from '../math'
import { ausmultiplizieren } from './ausmultiplizieren'
import { binomischeFormeln } from './binomische-formeln'
import { faktorisieren } from './faktorisieren'
import { gleichungenKlammern } from './gleichungen-klammern'
import { gleichungenSonderfaelle } from './gleichungen-sonderfaelle'
import { gleichungenUmformen } from './gleichungen-umformen'
import { funktionenGleichungAufstellen } from './funktionen-gleichung-aufstellen'
import { funktionenPunktprobeNullstelle } from './funktionen-punktprobe-nullstelle'
import { funktionenSchnittpunkt } from './funktionen-schnittpunkt'
import { funktionenSteigungUndGraph } from './funktionen-steigung-und-graph'
import { geometrieDreieck } from './geometrie-dreieck'
import { geometrieParallelogramm } from './geometrie-parallelogramm'
import { geometrieRaute } from './geometrie-raute'
import { geometrieTrapez } from './geometrie-trapez'
import type { SubtopicContent } from './types'

export {
  allEntries,
  allFormulas,
  entryLatex,
  findFormula,
  formulaGroupsOf,
  formulaLatex,
  formulaSheets,
  isFormula,
  solutionSetSourceLatex,
} from './formulas'
export { functionExampleFigure, type FigureLine, type FigurePoint, type FunctionFigure } from './functionFigure'
export {
  chainPieces,
  chainToLatex,
  EQUATION_PREFIX,
  equationPieces,
  equationToLatexMarkup,
  FUNCTION_PREFIX,
  GEOMETRY_PREFIX,
  readFunctionSegment,
  readGeometrySegment,
  segmentPieces,
  splitChain,
  splitMarkup,
  termToLatex,
  type FunctionSegment,
  type GeometrySegment,
  type Segment,
} from './markup'
export {
  isEquationTask,
  isFunctionTask,
  isGeometryTask,
  type EquivalenceRule,
  type ExampleTask,
  type Formula,
  type FormulaGroup,
  type GeometryExampleTask,
  type Markup,
  type SheetEntry,
  type SolutionSetRule,
  type StatementEntry,
  type SubtopicContent,
  type WorkedExample,
} from './types'

/** Explanations, worked examples and formulas per subtopic. */
export const subtopicContent = {
  'algebra/terme/ausmultiplizieren': ausmultiplizieren,
  'algebra/terme/binomische-formeln': binomischeFormeln,
  'algebra/terme/faktorisieren': faktorisieren,
  'algebra/lineare-gleichungen/umformen': gleichungenUmformen,
  'algebra/lineare-gleichungen/klammern': gleichungenKlammern,
  'algebra/lineare-gleichungen/sonderfaelle': gleichungenSonderfaelle,
  'funktionen/lineare-funktionen/steigung-und-graph': funktionenSteigungUndGraph,
  'funktionen/lineare-funktionen/gleichung-aufstellen': funktionenGleichungAufstellen,
  'funktionen/lineare-funktionen/punktprobe-nullstelle': funktionenPunktprobeNullstelle,
  'funktionen/lineare-funktionen/schnittpunkt': funktionenSchnittpunkt,
  'geometrie/vierecke-und-flaechen/parallelogramm': geometrieParallelogramm,
  'geometrie/vierecke-und-flaechen/dreieck': geometrieDreieck,
  'geometrie/vierecke-und-flaechen/raute': geometrieRaute,
  'geometrie/vierecke-und-flaechen/trapez': geometrieTrapez,
} as const satisfies Record<SubtopicId, SubtopicContent>

export function findContent(id: string): SubtopicContent | undefined {
  return Object.hasOwn(subtopicContent, id) ? subtopicContent[id as keyof typeof subtopicContent] : undefined
}
