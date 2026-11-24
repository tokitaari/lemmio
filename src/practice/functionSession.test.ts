import { describe, expect, it } from 'vitest'
import {
  buildGraphTask,
  buildIntersectionTask,
  buildPointSlopeTask,
  buildPointTestTask,
  buildTwoPointsTask,
  buildZeroTask,
  FUNCTION_SUBTOPIC_IDS,
  type FunctionTask,
} from '../math'
import { drawnLine, startPoint } from './functionDrawing'
import {
  answerKind,
  createFunctionSession,
  currentFunctionTask,
  FUNCTION_PRACTICE_SUBTOPIC_IDS,
  isFinalFeedback,
  isFunctionPracticeSubtopic,
  nextFunctionTask,
  revealFunctionSolution,
  submitFunctionAnswer,
  type FunctionAnswer,
  type FunctionSession,
} from './functionSession'
import { countCorrect, finishedBetween, isSeriesOver, isTaskFinished } from './session'

const session = (...tasks: FunctionTask[]) => createFunctionSession(tasks)
const submit = (s: FunctionSession, answer: FunctionAnswer) => submitFunctionAnswer(s, answer)
const equation = (input: string): FunctionAnswer => ({ kind: 'equation', input })

/** f(x) = -x + 2 */
const readTask = () => buildGraphTask('read-equation', [-1, 2])
/** f(x) = 2x - 3 */
const drawTask = () => buildGraphTask('draw-graph', [2, -3])
/** f(x) = 3x - 1, P(2|5) lies on the graph. */
const onGraph = () => buildPointTestTask([3, -1], [2, 5])
/** f(x) = -2x + 3, P(5|-4): f(5) = -7. */
const offGraph = () => buildPointTestTask([-2, 3], [5, -4])
/** f(x) = 2x + 4, zero -2. */
const zeroTask = () => buildZeroTask([2, 4])
/** f(x) = 3, no zero. */
const noZero = () => buildZeroTask([0, 3])

describe('subtopics', () => {
  it('covers the first three function subtopics, not the intersection yet', () => {
    expect(FUNCTION_PRACTICE_SUBTOPIC_IDS).toEqual(FUNCTION_SUBTOPIC_IDS.slice(0, 3))
    expect(isFunctionPracticeSubtopic('funktionen/lineare-funktionen/steigung-und-graph')).toBe(true)
    expect(isFunctionPracticeSubtopic('funktionen/lineare-funktionen/schnittpunkt')).toBe(false)
    expect(isFunctionPracticeSubtopic('algebra/terme/faktorisieren')).toBe(false)
  })

  it('knows which answer each kind of task expects', () => {
    expect(answerKind(readTask())).toBe('equation')
    expect(answerKind(buildPointSlopeTask(-3, [2, 1]))).toBe('equation')
    expect(answerKind(buildTwoPointsTask([1, 3], [3, 7]))).toBe('equation')
    expect(answerKind(drawTask())).toBe('graph')
    expect(answerKind(onGraph())).toBe('point-test')
    expect(answerKind(zeroTask())).toBe('zero')
    expect(answerKind(buildIntersectionTask([2, 1], [-1, 7]))).toBeNull()
  })
})

describe('function equations', () => {
  it('accepts the equation with or without prefix and finishes the task', () => {
    for (const input of ['f(x) = -x + 2', 'y = 2 - x', '-x + 2', 'f(x) = −x + 2']) {
      const after = submit(session(readTask()), equation(input))
      expect(after.feedback).toEqual({ kind: 'correct' })
      expect(after.outcomes).toEqual(['correct'])
    }
    const set = submit(session(buildTwoPointsTask([1, 3], [3, 7])), equation('f(x) = 2x + 1'))
    expect(set.feedback?.kind).toBe('correct')
  })

  it('finishes a wrong function as wrong and tells whether m and n are right', () => {
    const after = submit(session(readTask()), equation('f(x) = x + 2'))
    expect(after.outcomes).toEqual(['wrong'])
    expect(after.feedback).toMatchObject({ kind: 'wrong-function', slope: false, intercept: true })
    expect(after.feedback).toHaveProperty('answer', 'f(x) = x + 2')
    expect(isFinalFeedback(after.feedback)).toBe(true)
  })

  it('lets the learner try again after a wrong form or unreadable input', () => {
    const start = session(buildPointSlopeTask(-3, [2, 1]))
    const form = submit(start, equation('f(x) = -3(x - 2) + 1'))
    expect(form.feedback?.kind).toBe('wrong-form')
    expect(isTaskFinished(form)).toBe(false)
    const name = submit(start, equation('g(x) = -3x + 7'))
    expect(name.feedback).toMatchObject({ kind: 'wrong-form', hint: { code: 'wrong-name' } })
    const invalid = submit(start, equation('f(x) = 3x +'))
    expect(invalid.feedback).toMatchObject({ kind: 'invalid', input: 'f(x) = 3x +' })
    expect(isFinalFeedback(invalid.feedback)).toBe(false)
    expect(submit(invalid, equation('f(x) = -3x + 7')).outcomes).toEqual(['correct'])
  })

  it('ignores answers of another kind', () => {
    const start = session(readTask())
    expect(submit(start, { kind: 'graph', p: { x: 0, y: 2 }, q: { x: 1, y: 1 } })).toBe(start)
    expect(submit(session(buildIntersectionTask([2, 1], [-1, 7])), equation('f(x) = 2x + 1')).feedback).toBeNull()
  })
})

describe('drawn graphs', () => {
  it('counts only the line, not which of its points were chosen', () => {
    for (const [p, q] of [
      [{ x: 0, y: -3 }, { x: 1, y: -1 }],
      [{ x: 4, y: 5 }, { x: -2, y: -7 }],
    ] as const) {
      expect(submit(session(drawTask()), { kind: 'graph', p, q }).feedback).toEqual({ kind: 'correct' })
    }
  })

  it('finishes another line as wrong and keeps the points for the model solution', () => {
    const p = { x: 0, y: -3 }
    const q = { x: 1, y: 0 }
    const after = submit(session(drawTask()), { kind: 'graph', p, q })
    expect(after.outcomes).toEqual(['wrong'])
    expect(after.feedback).toEqual({ kind: 'wrong-line', slope: false, intercept: true, p, q })
  })

  it('asks for two points and for a line that is a graph', () => {
    const start = session(drawTask())
    expect(submit(start, { kind: 'graph', p: { x: 0, y: 0 }, q: null }).feedback).toEqual({ kind: 'missing-points' })
    expect(submit(start, { kind: 'graph', p: { x: 2, y: 0 }, q: { x: 2, y: 5 } }).feedback).toEqual({
      kind: 'not-a-line',
      reason: 'vertical',
    })
    const same = submit(start, { kind: 'graph', p: { x: 2, y: 0 }, q: { x: 2, y: 0 } })
    expect(same.feedback).toEqual({ kind: 'not-a-line', reason: 'same-point' })
    expect(isTaskFinished(same)).toBe(false)
  })

  it('sets keyboard points at (0|0) and (1|0), and draws the line through them', () => {
    expect(startPoint('P', null)).toEqual({ x: 0, y: 0 })
    expect(startPoint('Q', { x: 0, y: 4 })).toEqual({ x: 1, y: 0 })
    expect(startPoint('Q', { x: 1, y: 0 })).toEqual({ x: 2, y: 0 })
    expect(startPoint('P', { x: 0, y: 0 })).toEqual({ x: 1, y: 0 })
    expect(drawnLine({ p: { x: 0, y: -3 }, q: { x: 1, y: -1 } })).toMatchObject({ kind: 'function' })
    expect(drawnLine({ p: { x: 2, y: 0 }, q: { x: 2, y: 3 } })).toMatchObject({ kind: 'vertical' })
    expect(drawnLine({ p: { x: 2, y: 0 }, q: null })).toBeNull()
    expect(drawnLine({ p: { x: 2, y: 0 }, q: { x: 2, y: 0 } })).toBeNull()
  })
})

describe('Punktprobe', () => {
  const test = (input: string, decision: boolean | null): FunctionAnswer => ({
    kind: 'point-test',
    input,
    onGraph: decision,
  })

  it('is right only with the right calculation and the right decision', () => {
    expect(submit(session(onGraph()), test('f(2) = 3·2 - 1 = 5', true)).feedback).toEqual({ kind: 'correct' })
    expect(submit(session(offGraph()), test('f(5) = -7', false)).feedback).toEqual({ kind: 'correct' })
    expect(submit(session(onGraph()), test('f(2) = 5', false)).feedback).toEqual({
      kind: 'wrong-point-test',
      calculation: true,
      argument: true,
      decision: false,
    })
    expect(submit(session(offGraph()), test('f(5) = -4', true)).feedback).toEqual({
      kind: 'wrong-point-test',
      calculation: false,
      argument: true,
      decision: false,
    })
    // The decision happens to be right, but the calculation is wrong: the task is wrong.
    const wrongValue = submit(session(offGraph()), test('f(5) = -8', false))
    expect(wrongValue.outcomes).toEqual(['wrong'])
    expect(wrongValue.feedback).toMatchObject({ calculation: false, decision: true })
  })

  it('notices when another x was inserted', () => {
    expect(submit(session(onGraph()), test('f(1) = 2', true)).feedback).toMatchObject({
      kind: 'wrong-point-test',
      calculation: false,
      argument: false,
    })
  })

  it('lets the learner try again: unreadable, not worked out, no decision', () => {
    const start = session(onGraph())
    expect(submit(start, test('f(2) = 3·2 -', true)).feedback?.kind).toBe('invalid')
    expect(submit(start, test('f(2) = 3·2 - 1', true)).feedback).toMatchObject({
      kind: 'wrong-form',
      hint: { code: 'unevaluated-value' },
    })
    const undecided = submit(start, test('f(2) = 5', null))
    expect(undecided.feedback).toEqual({ kind: 'missing-decision' })
    expect(isTaskFinished(undecided)).toBe(false)
  })
})

describe('zeros', () => {
  const typed = (input: string): FunctionAnswer => ({ kind: 'zero', answer: { kind: 'input', input } })
  const none: FunctionAnswer = { kind: 'zero', answer: { kind: 'none' } }

  it('accepts N(z|0) and x = z, and the key for "keine Nullstelle"', () => {
    expect(submit(session(zeroTask()), typed('N(-2|0)')).feedback).toEqual({ kind: 'correct' })
    expect(submit(session(zeroTask()), typed('x = −2')).feedback).toEqual({ kind: 'correct' })
    expect(submit(session(noZero()), none).feedback).toEqual({ kind: 'correct' })
  })

  it('finishes wrong zeros with the reason', () => {
    expect(submit(session(zeroTask()), typed('N(2|0)')).feedback).toEqual({
      kind: 'wrong-zero',
      notOnAxis: false,
      saidNone: false,
      expectedNone: false,
    })
    expect(submit(session(zeroTask()), typed('(-2|4)')).feedback).toMatchObject({ notOnAxis: true })
    expect(submit(session(zeroTask()), none).feedback).toMatchObject({ kind: 'wrong-zero', saidNone: true })
    expect(submit(session(noZero()), typed('x = 0')).feedback).toMatchObject({ kind: 'wrong-zero', expectedNone: true })
  })

  it('lets the learner try again after unreadable input', () => {
    const after = submit(session(zeroTask()), typed('N(-2'))
    expect(after.feedback).toMatchObject({ kind: 'invalid', input: 'N(-2' })
    expect(isTaskFinished(after)).toBe(false)
  })
})

describe('series', () => {
  it('reveals, moves on and reports finished tasks', () => {
    const start = session(readTask(), drawTask())
    const revealed = revealFunctionSolution(start)
    expect(revealed.feedback).toEqual({ kind: 'revealed' })
    expect(finishedBetween(start, revealed)).toEqual({ correct: false })
    expect(revealFunctionSolution(revealed)).toBe(revealed)
    expect(submit(revealed, equation('f(x) = -x + 2'))).toBe(revealed)

    const second = nextFunctionTask(revealed)
    expect(currentFunctionTask(second)?.kind).toBe('draw-graph')
    expect(second.feedback).toBeNull()
    expect(nextFunctionTask(second)).toBe(second)

    const done = submit(second, { kind: 'graph', p: { x: 0, y: -3 }, q: { x: 1, y: -1 } })
    expect(finishedBetween(second, done)).toEqual({ correct: true, series: { correct: 1, total: 2 } })
    expect(countCorrect(done)).toBe(1)
    expect(isSeriesOver(nextFunctionTask(done))).toBe(true)
  })
})
