import {
  checkDrawnLine,
  checkFunction,
  checkFunctionValue,
  checkZero,
  functionEquationToLatex,
  point,
  readFunction,
  type FormHint,
  type FunctionSubtopicId,
  type FunctionTask,
  type TermErrorInfo,
  type ZeroAnswer,
} from '../math'
import type { GridPoint } from '../plane'
import { isTaskFinished, type Outcome, type SeriesState } from './session'

/**
 * Function subtopics that have a practice area so far. The intersection of
 * two lines follows in a later step (it is solved line by line like an
 * equation); its page still says that the practice follows later.
 */
export const FUNCTION_PRACTICE_SUBTOPIC_IDS = [
  'funktionen/lineare-funktionen/steigung-und-graph',
  'funktionen/lineare-funktionen/gleichung-aufstellen',
  'funktionen/lineare-funktionen/punktprobe-nullstelle',
] as const satisfies readonly FunctionSubtopicId[]

export type FunctionPracticeSubtopicId = (typeof FUNCTION_PRACTICE_SUBTOPIC_IDS)[number]

export function isFunctionPracticeSubtopic(id: string): id is FunctionPracticeSubtopicId {
  return (FUNCTION_PRACTICE_SUBTOPIC_IDS as readonly string[]).includes(id)
}

/** What the learner hands in; which kind a task expects is given by `answerKind`. */
export type FunctionAnswer =
  /** A function equation `f(x) = …` (also `y = …` or the term alone). */
  | { kind: 'equation'; input: string }
  /** The two points of a drawn graph; `null` while a point is not set yet. */
  | { kind: 'graph'; p: GridPoint | null; q: GridPoint | null }
  /** Punktprobe: the calculation `f(2) = …` and the decision (`null`: nothing chosen yet). */
  | { kind: 'point-test'; input: string; onGraph: boolean | null }
  /** Nullstelle: typed `N(z|0)` / `x = z`, or the key "keine Nullstelle". */
  | { kind: 'zero'; answer: ZeroAnswer }

export type FunctionAnswerKind = FunctionAnswer['kind']

/** The kind of answer a task expects, or `null` for tasks this practice does not handle yet (intersection). */
export function answerKind(task: FunctionTask): FunctionAnswerKind | null {
  switch (task.kind) {
    case 'read-equation':
    case 'from-point-slope':
    case 'from-two-points':
      return 'equation'
    case 'draw-graph':
      return 'graph'
    case 'point-test':
      return 'point-test'
    case 'zero':
      return 'zero'
    case 'intersection':
      return null
  }
}

/** What the learner sees after "Prüfen" (or "Lösung anzeigen"). */
export type FunctionFeedback =
  /** Final: right. */
  | { kind: 'correct' }
  /** Final: the learner gave up and looked at the solution. */
  | { kind: 'revealed' }
  /** Final: another function; `answer` is the learner's equation in LaTeX. */
  | { kind: 'wrong-function'; slope: boolean; intercept: boolean; answer: string }
  /** Final: the drawn line is not the graph; `p` and `q` are the learner's points. */
  | { kind: 'wrong-line'; slope: boolean; intercept: boolean; p: GridPoint; q: GridPoint }
  /**
   * Final: Punktprobe wrong. `calculation` is false if the calculation is
   * wrong (`argument` false: another x was inserted); `decision` is false if
   * the choice yes/no is wrong.
   */
  | { kind: 'wrong-point-test'; calculation: boolean; argument: boolean; decision: boolean }
  /**
   * Final: wrong zero. `notOnAxis`: the point has y ≠ 0; `saidNone`: the
   * learner pressed "keine Nullstelle"; `expectedNone`: f has no zero.
   */
  | { kind: 'wrong-zero'; notOnAxis: boolean; saidNone: boolean; expectedNone: boolean }
  /** Not final: right, but not in the requested form (name, not simplified, not worked out). */
  | { kind: 'wrong-form'; hint: FormHint }
  /** Not final: the input is not readable. `input` is the text the error positions refer to. */
  | { kind: 'invalid'; error: TermErrorInfo; input: string }
  /** Not final: fewer than two points are set. */
  | { kind: 'missing-points' }
  /** Not final: the points do not determine the graph of a function. */
  | { kind: 'not-a-line'; reason: 'vertical' | 'same-point' }
  /** Not final: Punktprobe without a decision. */
  | { kind: 'missing-decision' }

/** One practice series of function tasks. A readable wrong answer finishes a task, as with terms. */
export interface FunctionSession extends SeriesState {
  tasks: readonly FunctionTask[]
  feedback: FunctionFeedback | null
}

export function createFunctionSession(tasks: readonly FunctionTask[]): FunctionSession {
  return { tasks, index: 0, outcomes: [], feedback: null }
}

export function currentFunctionTask(session: FunctionSession): FunctionTask | undefined {
  return session.tasks[session.index]
}

/** True for feedback that ends the task. */
export function isFinalFeedback(feedback: FunctionFeedback | null): boolean {
  switch (feedback?.kind) {
    case 'correct':
    case 'revealed':
    case 'wrong-function':
    case 'wrong-line':
    case 'wrong-point-test':
    case 'wrong-zero':
      return true
    default:
      return false
  }
}

function finish(session: FunctionSession, outcome: Outcome, feedback: FunctionFeedback): FunctionSession {
  return { ...session, outcomes: [...session.outcomes, outcome], feedback }
}

function hint(session: FunctionSession, feedback: FunctionFeedback): FunctionSession {
  return { ...session, feedback }
}

/** The learner's function equation in LaTeX, named like the task's function if there is no prefix. */
function answerLatex(task: FunctionTask, input: string): string {
  const read = readFunction(input)
  return read.ok ? functionEquationToLatex(read.name ?? task.fn.name, read.expr) : input
}

function checkEquation(session: FunctionSession, task: FunctionTask, input: string): FunctionSession {
  const result = checkFunction(task.fn, input)
  switch (result.kind) {
    case 'correct':
      return finish(session, 'correct', { kind: 'correct' })
    case 'wrong':
      return finish(session, 'wrong', {
        kind: 'wrong-function',
        slope: result.slope,
        intercept: result.intercept,
        answer: answerLatex(task, input),
      })
    case 'wrong-form':
      return hint(session, { kind: 'wrong-form', hint: result.hint })
    case 'invalid':
      return hint(session, { kind: 'invalid', error: result.error, input })
  }
}

function checkGraph(session: FunctionSession, task: FunctionTask, p: GridPoint | null, q: GridPoint | null) {
  if (!p || !q) return hint(session, { kind: 'missing-points' })
  const result = checkDrawnLine(task.fn, point(p.x, p.y), point(q.x, q.y))
  switch (result.kind) {
    case 'correct':
      return finish(session, 'correct', { kind: 'correct' })
    case 'wrong':
      return finish(session, 'wrong', { kind: 'wrong-line', slope: result.slope, intercept: result.intercept, p, q })
    case 'vertical':
      return hint(session, { kind: 'not-a-line', reason: 'vertical' })
    case 'same-point':
      return hint(session, { kind: 'not-a-line', reason: 'same-point' })
  }
}

/**
 * Punktprobe: first the calculation (unreadable or not worked out → another
 * try), then the decision must be made; right only if both are right.
 */
function checkPointTest(
  session: FunctionSession,
  task: Extract<FunctionTask, { kind: 'point-test' }>,
  input: string,
  onGraph: boolean | null,
): FunctionSession {
  const result = checkFunctionValue(task.fn, input, task.point.x)
  if (result.kind === 'invalid') return hint(session, { kind: 'invalid', error: result.error, input })
  if (result.kind === 'wrong-form') return hint(session, { kind: 'wrong-form', hint: result.hint })
  if (onGraph === null) return hint(session, { kind: 'missing-decision' })
  const calculation = result.kind === 'correct'
  const decision = onGraph === task.onGraph
  if (calculation && decision) return finish(session, 'correct', { kind: 'correct' })
  return finish(session, 'wrong', {
    kind: 'wrong-point-test',
    calculation,
    argument: result.kind === 'correct' || result.argument,
    decision,
  })
}

function checkZeroAnswer(
  session: FunctionSession,
  task: Extract<FunctionTask, { kind: 'zero' }>,
  answer: ZeroAnswer,
): FunctionSession {
  const result = checkZero(task, answer)
  switch (result.kind) {
    case 'correct':
      return finish(session, 'correct', { kind: 'correct' })
    case 'wrong':
      return finish(session, 'wrong', {
        kind: 'wrong-zero',
        notOnAxis: result.notOnAxis,
        saidNone: answer.kind === 'none',
        expectedNone: task.zero.kind === 'none',
      })
    case 'wrong-form':
      return hint(session, { kind: 'wrong-form', hint: result.hint })
    case 'invalid':
      return hint(session, { kind: 'invalid', error: result.error, input: answer.kind === 'input' ? answer.input : '' })
  }
}

/**
 * Checks an answer to the current task. Only right and readable wrong answers
 * finish the task; a wrong form, unreadable input, missing points or a
 * missing decision show a hint and allow another try. An answer of the wrong
 * kind (see `answerKind`) changes nothing.
 */
export function submitFunctionAnswer(session: FunctionSession, answer: FunctionAnswer): FunctionSession {
  const task = currentFunctionTask(session)
  if (!task || isTaskFinished(session) || answerKind(task) !== answer.kind) return session
  switch (answer.kind) {
    case 'equation':
      return checkEquation(session, task, answer.input)
    case 'graph':
      return checkGraph(session, task, answer.p, answer.q)
    case 'point-test':
      return task.kind === 'point-test' ? checkPointTest(session, task, answer.input, answer.onGraph) : session
    case 'zero':
      return task.kind === 'zero' ? checkZeroAnswer(session, task, answer.answer) : session
  }
}

/** The learner gives up: the task counts as wrong and the model solution is shown. */
export function revealFunctionSolution(session: FunctionSession): FunctionSession {
  if (!currentFunctionTask(session) || isTaskFinished(session)) return session
  return finish(session, 'wrong', { kind: 'revealed' })
}

/** Moves on after a finished task; after the last one the series is over. */
export function nextFunctionTask(session: FunctionSession): FunctionSession {
  if (!isTaskFinished(session)) return session
  return { ...session, index: session.index + 1, feedback: null }
}
