/**
 * Machine-readable reason why an input could not be read as a term, equation,
 * operation, solution set, function equation, point, function value,
 * calculation (Rechenkette) or substituted formula.
 */
export type TermErrorCode =
  | 'empty'
  | 'too-long'
  | 'invalid-character'
  | 'invalid-number'
  | 'missing-operand'
  | 'unexpected-token'
  | 'double-operator'
  | 'missing-operator'
  | 'missing-closing-bracket'
  | 'missing-opening-bracket'
  | 'mismatched-bracket'
  | 'empty-brackets'
  | 'invalid-exponent'
  | 'exponent-too-large'
  | 'double-exponent'
  | 'division-by-term'
  | 'division-by-zero'
  // Equations (src/math/equations)
  | 'missing-equals'
  | 'multiple-equals'
  | 'missing-operation'
  | 'ambiguous-operation'
  | 'nonlinear-operation'
  | 'multiply-by-term'
  | 'multiply-by-zero'
  | 'invalid-solution-set'
  // Linear functions (src/math/functions)
  | 'invalid-function'
  | 'wrong-variable'
  | 'invalid-point'
  | 'missing-separator'
  | 'comma-separator'
  | 'invalid-function-value'
  // Geometry (src/math/geometry)
  | 'unknown-letter'
  | 'unit-in-input'
  | 'missing-unknown'

/**
 * Error for invalid input. `message` is German and meant for the learner;
 * `position`/`length` point into the original input so the UI can highlight it.
 */
export class TermError extends Error {
  readonly code: TermErrorCode
  readonly position: number
  readonly length: number

  constructor(code: TermErrorCode, message: string, position: number, length = 1) {
    super(message)
    this.name = 'TermError'
    this.code = code
    this.position = position
    this.length = length
  }
}

/** Plain, serialisable view of a TermError (e.g. for React state). */
export interface TermErrorInfo {
  code: TermErrorCode
  message: string
  position: number
  length: number
}

export function toErrorInfo(error: TermError): TermErrorInfo {
  return { code: error.code, message: error.message, position: error.position, length: error.length }
}
