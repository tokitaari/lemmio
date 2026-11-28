import { describe, expect, it } from 'vitest'
import {
  buildAreaTask,
  buildPerimeterTask,
  buildReverseTask,
  createRng,
  DECIMAL,
  equationToText,
  GEOMETRY_SUBTOPIC_IDS,
  operationToText,
  type GeometryTask,
} from '../math'
import {
  createGeometrySession,
  currentGeometryTask,
  generateCalculationSeries,
  geometryPhase,
  isCalculationTask,
  isSolvedLine,
  nextGeometryTask,
  revealGeometrySolution,
  submitCalculation,
  submitGeometryLine,
  submitGeometryUnit,
  submitSubstitution,
  type CalculationTask,
  type GeometrySession,
} from './geometrySession'
import { isSeriesOver, isTaskFinished } from './session'

function calc(task: GeometryTask): CalculationTask {
  if (!isCalculationTask(task)) throw new Error(`not a calculation: ${task.kind}`)
  return task
}

const triangle = calc(buildAreaTask('triangle', { g: 6, h: 4 }))
const rhombus = calc(buildPerimeterTask('rhombus', { a: 5 }))
const reverse = calc(buildReverseTask('triangle', { g: 6, h: 4 }, 'h'))
/** h = 7,5: dividing 30 = 4·h by 4 gives h = 15/2 first. */
const halfReverse = calc(buildReverseTask('parallelogram', { g: 4, h: 7.5 }, 'h'))

const single = (task: CalculationTask) => createGeometrySession([task])

/** Enters every line of the model solution of a Rückwärts task. */
function solveLines(session: GeometrySession): GeometrySession {
  const task = currentGeometryTask(session)
  if (task?.kind !== 'reverse') throw new Error('not a Rückwärts task')
  return task.equation.steps.reduce(
    (s, step) =>
      submitGeometryLine(s, operationToText(step.operation, DECIMAL), equationToText(step.equation, DECIMAL)),
    session,
  )
}

describe('series', () => {
  it.each(GEOMETRY_SUBTOPIC_IDS)('%s has ten calculations and no drawing task', (topic) => {
    const tasks = generateCalculationSeries(topic, createRng(3))
    expect(tasks).toHaveLength(10)
    expect(tasks.every((t) => ['area', 'perimeter', 'reverse'].includes(t.kind))).toBe(true)
    expect(tasks.some((t) => t.kind === 'reverse')).toBe(true)
    expect(new Set(tasks.map((t) => t.key)).size).toBe(10)
  })
})

describe('area and perimeter', () => {
  it('starts in the calculation phase and accepts the model chain with its unit', () => {
    const session = single(triangle)
    expect(geometryPhase(session)).toBe('calculation')
    if (triangle.kind === 'reverse') throw new Error('unexpected')
    const done = submitCalculation(session, triangle.calculation.answer, 'cm²')
    expect(done.outcomes).toEqual(['correct'])
    expect(done.feedback).toEqual({ kind: 'correct' })
  })

  it('accepts the perimeter in cm', () => {
    const done = submitCalculation(single(rhombus), 'u = 4 · a = 4 · 5 = 20', 'cm')
    expect(done.outcomes).toEqual(['correct'])
  })

  it('asks for the unit without using an attempt', () => {
    const session = submitCalculation(single(triangle), 'A = g · h : 2 = 6 · 4 : 2 = 12', null)
    expect(session.outcomes).toEqual([])
    expect(session.feedback).toEqual({ kind: 'missing-unit' })
  })

  it('gives a form hint for a result without calculation and lets the learner try again', () => {
    const session = submitCalculation(single(triangle), 'A = 12', 'cm²')
    expect(session.outcomes).toEqual([])
    expect(session.feedback).toMatchObject({ kind: 'calculation-form', hint: { code: 'missing-calculation' } })
  })

  it('does not end the task on a typed unit or a letter the figure does not have', () => {
    for (const input of ['A = 6 · 4 : 2 = 12 cm²', 'A = x · h : 2 = 12']) {
      const session = submitCalculation(single(triangle), input, 'cm²')
      expect(session.outcomes).toEqual([])
      expect(session.feedback).toMatchObject({ kind: 'calculation-invalid', input })
    }
  })

  it('ends the task wrong on a wrong formula, with the chain still consistent', () => {
    const session = submitCalculation(single(triangle), 'A = g · h = 6 · 4 = 24', 'cm²')
    expect(session.outcomes).toEqual(['wrong'])
    expect(session.feedback).toMatchObject({
      kind: 'calculation-wrong',
      value: false,
      unit: true,
      result: false,
      consistent: true,
    })
  })

  it('ends the task wrong on a wrong unit', () => {
    const session = submitCalculation(single(triangle), 'A = g · h : 2 = 6 · 4 : 2 = 12', 'cm')
    expect(session.outcomes).toEqual(['wrong'])
    expect(session.feedback).toMatchObject({ kind: 'calculation-wrong', value: true, unit: false })
  })

  it('ignores the steps of a Rückwärts task', () => {
    const session = single(triangle)
    expect(submitSubstitution(session, '12 = 6 · h : 2')).toBe(session)
    expect(submitGeometryUnit(session, 'cm')).toBe(session)
  })
})

describe('Rückwärts', () => {
  it('fills in, solves line by line and chooses the unit', () => {
    if (reverse.kind !== 'reverse') throw new Error('unexpected')
    let session = single(reverse)
    expect(geometryPhase(session)).toBe('substitution')
    session = submitSubstitution(session, '12 = 6 · h : 2')
    expect(session.feedback).toEqual({ kind: 'substitution-correct' })
    expect(geometryPhase(session)).toBe('lines')
    session = solveLines(session)
    expect(session.feedback).toEqual({ kind: 'solved' })
    expect(geometryPhase(session)).toBe('unit')
    expect(submitGeometryUnit(session, null).feedback).toEqual({ kind: 'missing-unit' })
    session = submitGeometryUnit(session, 'cm')
    expect(session.outcomes).toEqual(['correct'])
  })

  it('starts the solution with the line as typed, also with the sides swapped', () => {
    const session = submitSubstitution(single(reverse), '6 · h : 2 = 12')
    expect(geometryPhase(session)).toBe('lines')
    const start = session.equation?.tasks[0]?.equation
    expect(start && equationToText(start, DECIMAL).endsWith('= 12')).toBe(true)
    const next = submitGeometryLine(session, '| Term umformen', '3h = 12')
    expect(next.equation?.lines).toHaveLength(1)
    const done = submitGeometryLine(next, '| : 3', 'h = 4')
    expect(geometryPhase(done)).toBe('unit')
  })

  it('accepts c = h as the end', () => {
    const session = submitSubstitution(single(reverse), '12 = 3h')
    const done = submitGeometryLine(session, '| : 3', '4 = h')
    expect(done.feedback).toEqual({ kind: 'solved' })
    expect(geometryPhase(done)).toBe('unit')
  })

  it('wants the result as a decimal: h = 15/2 is a right line, but not the end', () => {
    let session = submitSubstitution(single(halfReverse), '30 = 4 · h')
    session = submitGeometryLine(session, '| : 4', '15/2 = h')
    expect(session.feedback).toEqual({ kind: 'result-fraction' })
    expect(geometryPhase(session)).toBe('lines')
    session = submitGeometryLine(session, '| Term umformen', '7,5 = h')
    expect(session.feedback).toEqual({ kind: 'solved' })
    expect(isSolvedLine(session.equation!.lines.at(-1)!.equation)).toBe(true)
  })

  it('keeps wrong lines correctable', () => {
    const session = submitGeometryLine(submitSubstitution(single(reverse), '12 = 3h'), '| : 3', 'h = 5')
    expect(session.outcomes).toEqual([])
    expect(session.feedback).toMatchObject({ kind: 'equation', feedback: { kind: 'line-wrong' } })
  })

  it('asks again for an unreadable or transformed first line', () => {
    const letter = submitSubstitution(single(reverse), '12 = g · h : 2')
    expect(letter.outcomes).toEqual([])
    expect(letter.feedback).toMatchObject({ kind: 'substitution-invalid' })
    const solved = submitSubstitution(single(reverse), 'h = 4')
    expect(solved.outcomes).toEqual([])
    expect(solved.feedback).toMatchObject({ kind: 'substitution-form' })
  })

  it('ends the task wrong on a first line with another solution and on a wrong unit', () => {
    const wrong = submitSubstitution(single(reverse), '12 = 6 · h')
    expect(wrong.outcomes).toEqual(['wrong'])
    expect(wrong.feedback).toMatchObject({ kind: 'substitution-wrong', left: true, right: false })
    const unit = submitGeometryUnit(solveLines(submitSubstitution(single(reverse), '12 = 6 · h : 2')), 'cm²')
    expect(unit.outcomes).toEqual(['wrong'])
    expect(unit.feedback).toEqual({ kind: 'unit-wrong' })
  })
})

describe('series flow', () => {
  it('counts "Lösung anzeigen" as wrong and moves on with a fresh state', () => {
    const revealed = revealGeometrySolution(submitSubstitution(createGeometrySession([reverse, triangle]), '12 = 3h'))
    expect(revealed.outcomes).toEqual(['wrong'])
    expect(revealed.feedback).toEqual({ kind: 'revealed' })
    expect(isTaskFinished(revealed)).toBe(true)
    const next = nextGeometryTask(revealed)
    expect(next.equation).toBeNull()
    expect(next.feedback).toBeNull()
    expect(geometryPhase(next)).toBe('calculation')
    const over = nextGeometryTask(submitCalculation(next, 'A = 6 · 4 : 2 = 12', 'cm²'))
    expect(isSeriesOver(over)).toBe(true)
  })

  it('does not move on before the task is finished', () => {
    const session = single(triangle)
    expect(nextGeometryTask(session)).toBe(session)
  })
})
