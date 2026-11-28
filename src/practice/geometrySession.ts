import {
  CALCULATION_KINDS,
  checkCalculation,
  checkSubstitution,
  checkUnit,
  equationForm,
  generateGeometrySeries,
  resultForm,
  type Equation,
  type FormHint,
  type GeometrySubtopicId,
  type GeometryTask,
  type Rng,
  type Span,
  type TermErrorInfo,
  type Unit,
} from '../math'
import {
  createEquationSession,
  currentEquation,
  submitLine,
  type EquationFeedback,
  type EquationSession,
} from './equationSession'
import { isTaskFinished, type Outcome, type SeriesState } from './session'

/** The tasks of the first geometry practice: calculations without drawing. */
export type CalculationTask = Extract<GeometryTask, { kind: 'area' | 'perimeter' | 'reverse' }>

export type ReverseTask = Extract<GeometryTask, { kind: 'reverse' }>

export function isCalculationTask(task: GeometryTask): task is CalculationTask {
  return task.kind === 'area' || task.kind === 'perimeter' || task.kind === 'reverse'
}

/**
 * A series of 10 tasks of a geometry subtopic without drawing tasks: their
 * slots become area tasks (`kinds: CALCULATION_KINDS`).
 */
export function generateCalculationSeries(topic: GeometrySubtopicId, rng: Rng): CalculationTask[] {
  return generateGeometrySeries(topic, rng, { kinds: CALCULATION_KINDS }).filter(isCalculationTask)
}

/**
 * Where the learner is:
 * - `calculation`: area or perimeter as one chain plus the unit
 * - `substitution`: Rückwärts, first line (the formula with the numbers inserted)
 * - `lines`: Rückwärts, solving that line step by step until the length stands alone
 * - `unit`: Rückwärts, choosing the unit of the result
 */
export type GeometryPhase = 'calculation' | 'substitution' | 'lines' | 'unit'

/** What the learner sees after a check (or "Lösung anzeigen"). */
export type GeometryFeedback =
  /** Not final: the chain is not readable (also a typed unit or a letter the figure does not have). */
  | { kind: 'calculation-invalid'; error: TermErrorInfo; input: string }
  /** Not final: readable, but no unit chosen; no attempt is used. */
  | { kind: 'missing-unit' }
  /** Not final: right value and unit, but not in the required form; `span` points to the term concerned. */
  | { kind: 'calculation-form'; hint: FormHint; span?: Span; input: string }
  /** Final: see `checkCalculation`; `at` is the first term that is not the expected result. */
  | {
      kind: 'calculation-wrong'
      value: boolean
      unit: boolean
      result: boolean
      consistent: boolean
      at?: { index: number; span: Span }
      input: string
    }
  /** Not final: the formula is filled in correctly; the line is solved next. */
  | { kind: 'substitution-correct' }
  /** Not final: the first line is not readable or a known length is not inserted. */
  | { kind: 'substitution-invalid'; error: TermErrorInfo; input: string }
  /** Not final: same solution, but already transformed (e.g. `h = 4`). */
  | { kind: 'substitution-form'; hint: FormHint }
  /** Final: the first line has another solution; `left`/`right` tell which sides match. */
  | { kind: 'substitution-wrong'; equation: Equation; left: boolean; right: boolean }
  /** Not final: feedback of the line-by-line check. */
  | { kind: 'equation'; feedback: EquationFeedback }
  /** Not final: the line is right and the length stands alone, but as a fraction; one more line as a decimal. */
  | { kind: 'result-fraction' }
  /** Not final: the length stands alone; the unit is next. */
  | { kind: 'solved' }
  /** Final: the Rückwärts task is solved, but with the wrong unit. */
  | { kind: 'unit-wrong' }
  /** Final: right. */
  | { kind: 'correct' }
  /** Final: the learner gave up and looked at the solution. */
  | { kind: 'revealed' }

/**
 * One practice series of geometry calculations. Area and perimeter are
 * answered in one chain; a Rückwärts task is filled in, then solved line by
 * line as in the practice of equations, then the unit is chosen. Only
 * readable wrong answers finish a task wrong; wrong lines can be corrected as
 * often as needed.
 */
export interface GeometrySession extends SeriesState {
  tasks: readonly CalculationTask[]
  /**
   * Rückwärts: the equation solved line by line, starting with the line the
   * learner filled in (a series of this one task); null until that line is
   * accepted, and for the other tasks.
   */
  equation: EquationSession | null
  feedback: GeometryFeedback | null
}

export function createGeometrySession(tasks: readonly CalculationTask[]): GeometrySession {
  return { tasks, index: 0, outcomes: [], equation: null, feedback: null }
}

export function currentGeometryTask(session: GeometrySession): CalculationTask | undefined {
  return session.tasks[session.index]
}

/**
 * True if the length stands alone as a decimal or whole number, e.g. `h = 4`,
 * `h = 7,5` or `4 = h`. `h = 15/2` is a right line, but not the end yet.
 */
export function isSolvedLine(equation: Equation): boolean {
  switch (equationForm(equation)) {
    case 'solved':
      return resultForm(equation.right) === 'number'
    case 'solved-swapped':
      return resultForm(equation.left) === 'number'
    default:
      return false
  }
}

export function geometryPhase(session: GeometrySession): GeometryPhase {
  const task = currentGeometryTask(session)
  if (task?.kind !== 'reverse') return 'calculation'
  if (!session.equation) return 'substitution'
  const last = currentEquation(session.equation)
  return last && isSolvedLine(last) ? 'unit' : 'lines'
}

function finish(session: GeometrySession, outcome: Outcome, feedback: GeometryFeedback): GeometrySession {
  return { ...session, outcomes: [...session.outcomes, outcome], feedback }
}

function hint(session: GeometrySession, feedback: GeometryFeedback): GeometrySession {
  return { ...session, feedback }
}

/**
 * Checks an area or perimeter chain with the chosen unit (`checkCalculation`).
 * Unreadable, without unit or in the wrong form allows another try; a
 * readable wrong chain or a wrong unit finishes the task.
 */
export function submitCalculation(session: GeometrySession, input: string, unit: Unit | null): GeometrySession {
  const task = currentGeometryTask(session)
  if (!task || isTaskFinished(session) || task.kind === 'reverse') return session
  const result = checkCalculation(task.calculation, input, unit)
  switch (result.kind) {
    case 'correct':
      return finish(session, 'correct', { kind: 'correct' })
    case 'wrong':
      return finish(session, 'wrong', {
        kind: 'calculation-wrong',
        value: result.value,
        unit: result.unit,
        result: result.result,
        consistent: result.consistent,
        ...(result.at ? { at: result.at } : {}),
        input,
      })
    case 'wrong-form':
      return hint(session, { kind: 'calculation-form', hint: result.hint, ...(result.span ? { span: result.span } : {}), input })
    case 'missing-unit':
      return hint(session, { kind: 'missing-unit' })
    case 'invalid':
      return hint(session, { kind: 'calculation-invalid', error: result.error, input })
  }
}

/**
 * Checks the first line of a Rückwärts task (`checkSubstitution`). A right
 * line, as typed, becomes the start of the line-by-line solution.
 */
export function submitSubstitution(session: GeometrySession, input: string): GeometrySession {
  const task = currentGeometryTask(session)
  if (!task || task.kind !== 'reverse' || isTaskFinished(session) || geometryPhase(session) !== 'substitution') {
    return session
  }
  const result = checkSubstitution(task, input)
  switch (result.kind) {
    case 'correct':
      return {
        ...session,
        equation: createEquationSession([{ ...task.equation, equation: result.equation }]),
        feedback: { kind: 'substitution-correct' },
      }
    case 'wrong':
      return finish(session, 'wrong', {
        kind: 'substitution-wrong',
        equation: result.equation,
        left: result.left,
        right: result.right,
      })
    case 'wrong-form':
      return hint(session, { kind: 'substitution-form', hint: result.hint })
    case 'invalid':
      return hint(session, { kind: 'substitution-invalid', error: result.error, input })
  }
}

/**
 * Checks the next line with `submitLine` of the equation practice. Once the
 * length stands alone as a number, the unit is next; as a fraction, the
 * learner writes one more line.
 */
export function submitGeometryLine(
  session: GeometrySession,
  operationInput: string,
  equationInput: string,
): GeometrySession {
  if (!session.equation || isTaskFinished(session) || geometryPhase(session) !== 'lines') return session
  const equation = submitLine(session.equation, operationInput, equationInput)
  const accepted = equation.lines.length > session.equation.lines.length
  const last = currentEquation(equation)
  let feedback: GeometryFeedback | null = equation.feedback ? { kind: 'equation', feedback: equation.feedback } : null
  if (accepted && last) {
    if (isSolvedLine(last)) feedback = { kind: 'solved' }
    else if (equationForm(last) !== 'open') feedback = { kind: 'result-fraction' }
  }
  return { ...session, equation, feedback }
}

/** Checks the unit of a solved Rückwärts task; without a choice only a hint. */
export function submitGeometryUnit(session: GeometrySession, unit: Unit | null): GeometrySession {
  const task = currentGeometryTask(session)
  if (!task || task.kind !== 'reverse' || isTaskFinished(session) || geometryPhase(session) !== 'unit') return session
  switch (checkUnit(task.unit, unit)) {
    case 'missing':
      return hint(session, { kind: 'missing-unit' })
    case 'wrong':
      return finish(session, 'wrong', { kind: 'unit-wrong' })
    case 'correct':
      return finish(session, 'correct', { kind: 'correct' })
  }
}

/** The learner gives up: the task counts as wrong and the model solution is shown. */
export function revealGeometrySolution(session: GeometrySession): GeometrySession {
  if (!currentGeometryTask(session) || isTaskFinished(session)) return session
  return finish(session, 'wrong', { kind: 'revealed' })
}

/** Moves on after a finished task; after the last one the series is over. */
export function nextGeometryTask(session: GeometrySession): GeometrySession {
  if (!isTaskFinished(session)) return session
  return { ...session, index: session.index + 1, equation: null, feedback: null }
}
