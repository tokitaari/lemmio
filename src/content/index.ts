import type { SubtopicId } from '../math'
import { ausmultiplizieren } from './ausmultiplizieren'
import { binomischeFormeln } from './binomische-formeln'
import { faktorisieren } from './faktorisieren'
import { gleichungenKlammern } from './gleichungen-klammern'
import { gleichungenSonderfaelle } from './gleichungen-sonderfaelle'
import { gleichungenUmformen } from './gleichungen-umformen'
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
export {
  chainPieces,
  chainToLatex,
  EQUATION_PREFIX,
  equationPieces,
  equationToLatexMarkup,
  segmentPieces,
  splitChain,
  splitMarkup,
  termToLatex,
  type Segment,
} from './markup'
export {
  isEquationTask,
  type EquivalenceRule,
  type Formula,
  type FormulaGroup,
  type Markup,
  type SheetEntry,
  type SolutionSetRule,
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
} as const satisfies Record<SubtopicId, SubtopicContent>

export function findContent(id: string): SubtopicContent | undefined {
  return Object.hasOwn(subtopicContent, id) ? subtopicContent[id as keyof typeof subtopicContent] : undefined
}
