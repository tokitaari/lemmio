import type { EquationFeedback } from '../practice/equationSession'
import type { EquationField } from './EquationEntry'

/** Where the focus goes after a check: the field the learner has to correct or continue in. */
export function fieldToFocus(feedback: EquationFeedback | null): EquationField | null {
  switch (feedback?.kind) {
    case 'line-correct':
    case 'not-solved':
    case 'operation-invalid':
    case 'operation-not-allowed':
      return 'operation'
    case 'line-wrong':
    case 'equation-invalid':
      return 'equation'
    case 'set-invalid':
      return 'set'
    default:
      return null
  }
}
