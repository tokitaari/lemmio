import { describe, expect, it } from 'vitest'
import { createRng, equationToText, operationToText, pointToText } from '../math'
import {
  answerOptions,
  createIntersectionSession,
  currentIntersectionMode,
  currentIntersectionTask,
  generateIntersectionSeries,
  intersectionMode,
  intersectionPhase,
  nextIntersectionTask,
  revealIntersectionSolution,
  submitIntersectionKey,
  submitIntersectionLine,
  submitIntersectionPoint,
  submitIntersectionValue,
  type IntersectionSession,
  type IntersectionTask,
} from './intersectionSession'
import { isSeriesOver, isTaskFinished } from './session'

const tasks = generateIntersectionSeries(createRng(5))
const find = (kind: IntersectionTask['intersection']['kind']) => tasks.find((t) => t.intersection.kind === kind)!

/** Session on one task, in calculating mode (odd position). */
function calculating(task: IntersectionTask): IntersectionSession {
  return nextIntersectionTask({ ...createIntersectionSession([task, task]), outcomes: ['correct'] })
}

/** Enters every line of the model solution. */
function solveLines(session: IntersectionSession): IntersectionSession {
  const task = currentIntersectionTask(session)!
  return task.equation.steps.reduce(
    (s, step) => submitIntersectionLine(s, operationToText(step.operation), equationToText(step.equation)),
    session,
  )
}

describe('series and modes', () => {
  it('has ten tasks of the intersection', () => {
    expect(tasks).toHaveLength(10)
    expect(tasks.every((t) => t.kind === 'intersection')).toBe(true)
  })

  it('reads on even positions and calculates on odd ones; identical lines are always calculated', () => {
    const point = find('point')
    expect(intersectionMode(point, 0)).toBe('read')
    expect(intersectionMode(point, 1)).toBe('calculate')
    const identical = tasks.find((t) => t.intersection.kind === 'identical')
    if (identical) expect(intersectionMode(identical, 0)).toBe('calculate')
  })
})

describe('reading', () => {
  it('starts in the answer phase and offers the point and both keys', () => {
    const session = createIntersectionSession([find('point')])
    expect(currentIntersectionMode(session)).toBe('read')
    expect(intersectionPhase(session)).toBe('answer')
    expect(answerOptions(session)).toEqual({ point: true, keys: true })
  })

  it('accepts the right point', () => {
    const task = find('point')
    if (task.intersection.kind !== 'point') throw new Error('no point')
    const session = submitIntersectionPoint(createIntersectionSession([task]), pointToText(task.intersection.point, 'S'))
    expect(session.outcomes).toEqual(['correct'])
    expect(session.feedback).toEqual({ kind: 'correct' })
  })

  it('ends the task wrong on a readable wrong point and on a wrong key', () => {
    const task = find('point')
    const wrong = submitIntersectionPoint(createIntersectionSession([task]), 'S(100|100)')
    expect(wrong.outcomes).toEqual(['wrong'])
    expect(wrong.feedback).toMatchObject({ kind: 'wrong-point', x: false, y: false })
    const key = submitIntersectionKey(createIntersectionSession([task]), 'parallel')
    expect(key.outcomes).toEqual(['wrong'])
    expect(key.feedback).toEqual({ kind: 'wrong-key', said: 'parallel' })
  })

  it('does not end the task on unreadable input', () => {
    const session = submitIntersectionPoint(createIntersectionSession([find('point')]), 'S(2|')
    expect(session.outcomes).toEqual([])
    expect(session.feedback).toMatchObject({ kind: 'point-invalid', input: 'S(2|' })
  })

  it('accepts the key of parallel lines', () => {
    const session = submitIntersectionKey(createIntersectionSession([find('parallel')]), 'parallel')
    expect(session.outcomes).toEqual(['correct'])
  })
})

describe('calculating', () => {
  it('starts with the lines phase and takes only correct lines', () => {
    const task = find('point')
    const session = calculating(task)
    expect(currentIntersectionMode(session)).toBe('calculate')
    expect(intersectionPhase(session)).toBe('lines')
    const wrong = submitIntersectionLine(session, '| + 1', 'x = 1000')
    expect(wrong.equation.lines).toHaveLength(0)
    expect(wrong.outcomes).toEqual(['correct'])
    expect(isTaskFinished(wrong)).toBe(false)
  })

  it('goes from the lines through y to the point', () => {
    const task = find('point')
    if (task.intersection.kind !== 'point') throw new Error('no point')
    let session = solveLines(calculating(task))
    expect(intersectionPhase(session)).toBe('value')
    const { x, y } = task.intersection.point
    session = submitIntersectionValue(session, `${task.fn.name}(${x.toNumber()}) = ${y.toNumber()}`)
    expect(session.feedback).toEqual({ kind: 'value-correct' })
    expect(intersectionPhase(session)).toBe('answer')
    expect(answerOptions(session)).toEqual({ point: true, keys: false })
    session = submitIntersectionPoint(session, pointToText(task.intersection.point, 'S'))
    expect(session.outcomes).toEqual(['correct', 'correct'])
  })

  it('ends the task wrong on a readable wrong value', () => {
    const task = find('point')
    if (task.intersection.kind !== 'point') throw new Error('no point')
    const session = submitIntersectionValue(
      solveLines(calculating(task)),
      `${task.fn.name}(${task.intersection.point.x.toNumber()}) = 1000`,
    )
    expect(session.outcomes).toEqual(['correct', 'wrong'])
    expect(session.feedback).toMatchObject({ kind: 'wrong-value' })
  })

  it('ends parallel lines in a statement that is answered with the keys', () => {
    const session = solveLines(calculating(find('parallel')))
    expect(intersectionPhase(session)).toBe('answer')
    expect(answerOptions(session)).toEqual({ point: false, keys: true })
    expect(submitIntersectionPoint(session, 'S(1|1)')).toBe(session)
    expect(submitIntersectionKey(session, 'parallel').outcomes).toEqual(['correct', 'correct'])
  })
})

describe('finishing', () => {
  it('counts "Lösung anzeigen" as wrong and moves on', () => {
    let session = revealIntersectionSolution(createIntersectionSession([find('point'), find('point')]))
    expect(session.outcomes).toEqual(['wrong'])
    expect(session.feedback).toEqual({ kind: 'revealed' })
    session = nextIntersectionTask(session)
    expect(session.index).toBe(1)
    expect(session.feedback).toBeNull()
    expect(session.equation.lines).toHaveLength(0)
  })

  it('ends the series after the last task', () => {
    const session = nextIntersectionTask(revealIntersectionSolution(createIntersectionSession([find('point')])))
    expect(isSeriesOver(session)).toBe(true)
  })

  it('ignores answers once the task is finished', () => {
    const done = revealIntersectionSolution(createIntersectionSession([find('point')]))
    expect(submitIntersectionKey(done, 'parallel')).toBe(done)
    expect(nextIntersectionTask(createIntersectionSession([find('point')])).index).toBe(0)
  })
})
