import {
  generateFunctionSeries,
  checkFunctionValue,
  checkIntersection,
  equationForm,
  readFunctionValue,
  type FormHint,
  type FunctionTask,
  type Rng,
  type TermErrorInfo,
} from '../math'
import {
  createEquationSession,
  currentEquation,
  submitLine,
  type EquationFeedback,
  type EquationSession,
} from './equationSession'
import { INTERSECTION_SUBTOPIC_ID } from './functionSession'
import { isTaskFinished, type Outcome, type SeriesState } from './session'

/** An intersection task of the generator (`kind: 'intersection'`). */
export type IntersectionTask = Extract<FunctionTask, { kind: 'intersection' }>

function isIntersectionTask(task: FunctionTask): task is IntersectionTask {
  return task.kind === 'intersection'
}

/** A series of intersection tasks without repetitions. */
export function generateIntersectionSeries(rng: Rng): IntersectionTask[] {
  return generateFunctionSeries(INTERSECTION_SUBTOPIC_ID, rng).filter(isIntersectionTask)
}

/**
 * How a task is practised: `read` shows the graphs of f and g (their
 * equations stay hidden) and the learner gives the intersection; `calculate`
 * shows the equations and the learner solves f(x) = g(x) line by line.
 */
export type IntersectionMode = 'read' | 'calculate'

/**
 * The forms alternate: the first, third, … task is read from the graph, the
 * others are calculated. Two identical lines cannot be told apart in a graph,
 * so such a task is always calculated.
 */
export function intersectionMode(task: IntersectionTask, index: number): IntersectionMode {
  return task.intersection.kind !== 'identical' && index % 2 === 0 ? 'read' : 'calculate'
}

/** What the learner sees after a check (or "Lösung anzeigen"). */
export type IntersectionFeedback =
  /** Not final: feedback of the line-by-line check (`line-correct`, `line-wrong`, unreadable input, …). */
  | { kind: 'equation'; feedback: EquationFeedback }
  /** Not final: y is right, S is next. */
  | { kind: 'value-correct' }
  /** Not final: the calculation is right, but not worked out. */
  | { kind: 'value-form'; hint: FormHint }
  /** Not final: the calculation is not readable. `input` is the text the error positions refer to. */
  | { kind: 'value-invalid'; error: TermErrorInfo; input: string }
  /** Not final: the point is right, but a coordinate is not worked out. */
  | { kind: 'point-form'; hint: FormHint }
  /** Not final: the point is not readable. */
  | { kind: 'point-invalid'; error: TermErrorInfo; input: string }
  /** Final: right. */
  | { kind: 'correct' }
  /** Final: the learner gave up and looked at the solution. */
  | { kind: 'revealed' }
  /** Final: wrong y; `argument` is false if another x was inserted, `value` if the result is not f(x). */
  | { kind: 'wrong-value'; argument: boolean; value: boolean }
  /** Final: another point (or a point where the lines do not meet in one); `x`/`y` tell which coordinates are right. */
  | { kind: 'wrong-point'; x: boolean; y: boolean }
  /** Final: the key "kein Schnittpunkt" / "unendlich viele" was wrong. */
  | { kind: 'wrong-key'; said: 'parallel' | 'identical' }

/**
 * One practice series of intersection tasks. Only readable wrong answers to
 * the last questions finish a task wrong; wrong lines of the calculation can
 * be corrected as often as needed (as in the practice of equations).
 */
export interface IntersectionSession extends SeriesState {
  tasks: readonly IntersectionTask[]
  /** The equation f(x) = g(x) of the current task, solved line by line (a series of this one task). */
  equation: EquationSession
  /** Calculation: the value of y is accepted. */
  valueDone: boolean
  feedback: IntersectionFeedback | null
}

function equationOf(task: IntersectionTask | undefined): EquationSession {
  return createEquationSession(task ? [task.equation] : [])
}

export function createIntersectionSession(tasks: readonly IntersectionTask[]): IntersectionSession {
  return { tasks, index: 0, outcomes: [], equation: equationOf(tasks[0]), valueDone: false, feedback: null }
}

export function currentIntersectionTask(session: IntersectionSession): IntersectionTask | undefined {
  return session.tasks[session.index]
}

export function currentIntersectionMode(session: IntersectionSession): IntersectionMode | undefined {
  const task = currentIntersectionTask(session)
  return task ? intersectionMode(task, session.index) : undefined
}

/**
 * Where the learner is: `lines` (solving f(x) = g(x)), `value` (calculating
 * y after `x = c`) or `answer` (giving the intersection). Reading a graph
 * starts at `answer`.
 */
export type IntersectionPhase = 'lines' | 'value' | 'answer'

export function intersectionPhase(session: IntersectionSession): IntersectionPhase {
  if (currentIntersectionMode(session) !== 'calculate') return 'answer'
  const last = currentEquation(session.equation)
  if (!last) return 'answer'
  switch (equationForm(last)) {
    case 'open':
      return 'lines'
    case 'statement':
      return 'answer'
    case 'solved':
    case 'solved-swapped':
      return session.valueDone ? 'answer' : 'value'
  }
}

/**
 * What the answer phase offers: the point `S(x|y)` and/or the keys "kein
 * Schnittpunkt" and "unendlich viele". Reading a graph offers both; a
 * calculation that ends in a statement only the keys, one that ends in
 * `x = c` only the point.
 */
export function answerOptions(session: IntersectionSession): { point: boolean; keys: boolean } {
  if (currentIntersectionMode(session) === 'read') return { point: true, keys: true }
  const last = currentEquation(session.equation)
  const statement = last !== undefined && equationForm(last) === 'statement'
  return { point: !statement, keys: statement }
}

function finish(session: IntersectionSession, outcome: Outcome, feedback: IntersectionFeedback): IntersectionSession {
  return { ...session, outcomes: [...session.outcomes, outcome], feedback }
}

function hint(session: IntersectionSession, feedback: IntersectionFeedback): IntersectionSession {
  return { ...session, feedback }
}

/**
 * Checks the next line of the calculation with `submitLine` of the equation
 * practice. Only a correct line is added; the equation is finished once `x`
 * stands alone or a statement is reached, then the next phase begins.
 */
export function submitIntersectionLine(
  session: IntersectionSession,
  operationInput: string,
  equationInput: string,
): IntersectionSession {
  if (isTaskFinished(session) || intersectionPhase(session) !== 'lines') return session
  const equation = submitLine(session.equation, operationInput, equationInput)
  const feedback = equation.feedback
  return { ...session, equation, feedback: feedback ? { kind: 'equation', feedback } : null }
}

/**
 * Checks the calculation of y, e.g. `f(2) = 2·2 + 1 = 5`. Both f and g are
 * fine (the name decides which one is checked); not worked out or unreadable
 * allows another try, a wrong value finishes the task.
 */
export function submitIntersectionValue(session: IntersectionSession, input: string): IntersectionSession {
  const task = currentIntersectionTask(session)
  if (!task || isTaskFinished(session) || intersectionPhase(session) !== 'value') return session
  if (task.intersection.kind !== 'point') return session
  const read = readFunctionValue(input)
  const fn = read.ok && read.name === task.other.name ? task.other : task.fn
  const result = checkFunctionValue(fn, input, task.intersection.point.x)
  switch (result.kind) {
    case 'correct':
      return { ...session, valueDone: true, feedback: { kind: 'value-correct' } }
    case 'wrong':
      return finish(session, 'wrong', { kind: 'wrong-value', argument: result.argument, value: result.value })
    case 'wrong-form':
      return hint(session, { kind: 'value-form', hint: result.hint })
    case 'invalid':
      return hint(session, { kind: 'value-invalid', error: result.error, input })
  }
}

/** Checks the intersection typed as `S(2|5)`. A readable wrong point finishes the task. */
export function submitIntersectionPoint(session: IntersectionSession, input: string): IntersectionSession {
  const task = currentIntersectionTask(session)
  if (!task || isTaskFinished(session) || intersectionPhase(session) !== 'answer' || !answerOptions(session).point) {
    return session
  }
  const result = checkIntersection(task, { kind: 'point', input })
  switch (result.kind) {
    case 'correct':
      return finish(session, 'correct', { kind: 'correct' })
    case 'wrong':
      return finish(session, 'wrong', { kind: 'wrong-point', x: result.x, y: result.y })
    case 'wrong-form':
      return hint(session, { kind: 'point-form', hint: result.hint })
    case 'invalid':
      return hint(session, { kind: 'point-invalid', error: result.error, input })
  }
}

/** The keys "kein Schnittpunkt" (`parallel`) and "unendlich viele" (`identical`). */
export function submitIntersectionKey(session: IntersectionSession, said: 'parallel' | 'identical'): IntersectionSession {
  const task = currentIntersectionTask(session)
  if (!task || isTaskFinished(session) || intersectionPhase(session) !== 'answer' || !answerOptions(session).keys) {
    return session
  }
  return checkIntersection(task, { kind: said }).kind === 'correct'
    ? finish(session, 'correct', { kind: 'correct' })
    : finish(session, 'wrong', { kind: 'wrong-key', said })
}

/** The learner gives up: the task counts as wrong and the model solution is shown. */
export function revealIntersectionSolution(session: IntersectionSession): IntersectionSession {
  if (!currentIntersectionTask(session) || isTaskFinished(session)) return session
  return finish(session, 'wrong', { kind: 'revealed' })
}

/** Moves on after a finished task; after the last one the series is over. */
export function nextIntersectionTask(session: IntersectionSession): IntersectionSession {
  if (!isTaskFinished(session)) return session
  const index = session.index + 1
  return { ...session, index, equation: equationOf(session.tasks[index]), valueDone: false, feedback: null }
}
