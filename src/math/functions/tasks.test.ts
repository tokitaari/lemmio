// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkStep } from '../equations/check'
import { equationToText } from '../equations/equation'
import { EQUATION_SUBTOPIC_IDS } from '../equations/tasks'
import type { EquationTask } from '../equations/types'
import { parse } from '../parser'
import { createRng } from '../random'
import type { Rational } from '../rational'
import { SERIES_LENGTH, SUBTOPIC_IDS } from '../tasks'
import { ALL_SUBTOPIC_IDS, isEquationSubtopic, isFunctionSubtopic, isTermSubtopic } from '../topics'
import { isOnGraph, point } from './analysis'
import { checkDrawnLine, checkFunction, checkFunctionValue, checkIntersection, checkPoint, checkZero } from './check'
import { functionEquationToText, functionToText } from './print'
import { parsePoint } from './read'
import {
  buildGraphTask,
  buildIntersectionTask,
  buildPointSlopeTask,
  buildPointTestTask,
  buildTwoPointsTask,
  buildZeroTask,
  FUNCTION_SUBTOPIC_IDS,
  FUNCTION_WINDOW,
  functionGenerators,
  generateFunctionSeries,
  generateFunctionTask,
} from './tasks'
import type { FunctionTask, Point } from './types'

const SAMPLES = 400

const GRAPH = 'funktionen/lineare-funktionen/steigung-und-graph'
const SET_UP = 'funktionen/lineare-funktionen/gleichung-aufstellen'
const POINT_ZERO = 'funktionen/lineare-funktionen/punktprobe-nullstelle'
const INTERSECTION = 'funktionen/lineare-funktionen/schnittpunkt'

type FunctionTopic = (typeof FUNCTION_SUBTOPIC_IDS)[number]

function sample(topic: FunctionTopic, seed: number, count = SAMPLES): FunctionTask[] {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => functionGenerators[topic](rng))
}

const texts = (task: FunctionTask) => task.steps.map((s) => s.text)
const lastText = (task: FunctionTask) => task.steps[task.steps.length - 1]?.text ?? ''
const share = (tasks: FunctionTask[], test: (task: FunctionTask) => boolean) => tasks.filter(test).length / tasks.length
const isInt = (r: Rational) => r.isInteger()
const inWindow = (r: Rational, limit = FUNCTION_WINDOW) => r.isInteger() && Math.abs(r.toNumber()) <= limit
const pointInWindow = (p: Point, limit = FUNCTION_WINDOW) => inWindow(p.x, limit) && inWindow(p.y, limit)

/** The equation that a task asks to solve, if any. */
function equationOf(task: FunctionTask): EquationTask | undefined {
  return 'equation' in task ? task.equation : undefined
}

/** All points and functions of a task, for the checks on numbers. */
function numbersOf(task: FunctionTask): Rational[] {
  const numbers = [task.fn.m, task.fn.n]
  switch (task.kind) {
    case 'from-point-slope':
    case 'point-test':
      numbers.push(task.point.x, task.point.y)
      break
    case 'from-two-points':
      for (const p of task.points) numbers.push(p.x, p.y)
      break
    case 'zero':
      if (task.zero.kind === 'single') numbers.push(task.zero.x)
      break
    case 'intersection':
      numbers.push(task.other.m, task.other.n)
      if (task.intersection.kind === 'point') numbers.push(task.intersection.point.x, task.intersection.point.y)
      break
    default:
      break
  }
  return numbers
}

describe('function generators', () => {
  it('cover the four subtopics of linear functions in a register of their own', () => {
    expect([...FUNCTION_SUBTOPIC_IDS].sort()).toEqual([GRAPH, SET_UP, INTERSECTION, POINT_ZERO].sort())
    const others: readonly string[] = [...SUBTOPIC_IDS, ...EQUATION_SUBTOPIC_IDS]
    expect(FUNCTION_SUBTOPIC_IDS.filter((id) => others.includes(id))).toEqual([])
    for (const id of FUNCTION_SUBTOPIC_IDS) {
      expect([isFunctionSubtopic(id), isTermSubtopic(id), isEquationSubtopic(id)]).toEqual([true, false, false])
    }
    expect(isFunctionSubtopic('algebra/lineare-gleichungen/umformen')).toBe(false)
  })

  it('are part of ALL_SUBTOPIC_IDS, together with their catalog entries', () => {
    const all: readonly string[] = ALL_SUBTOPIC_IDS
    expect(FUNCTION_SUBTOPIC_IDS.filter((id) => !all.includes(id))).toEqual([])
  })

  describe.each(FUNCTION_SUBTOPIC_IDS)('%s', (topic) => {
    const tasks = sample(topic, 2026)

    it('is deterministic for a given seed', () => {
      expect(sample(topic, 99, 20).map((t) => t.key)).toEqual(sample(topic, 99, 20).map((t) => t.key))
    })

    it('describes the task and explains every line of the worked solution', () => {
      for (const task of tasks) {
        expect(task.topic).toBe(topic)
        expect(task.key.startsWith(`${task.kind}: `), task.key).toBe(true)
        expect(task.instruction.length).toBeGreaterThan(0)
        expect(task.variant.length).toBeGreaterThan(0)
        expect(task.fn.name).toBe('f')
        expect(task.steps.length, task.key).toBeGreaterThan(1)
        for (const step of task.steps) {
          expect([step.text.length > 0, step.latex.length > 0, (step.note?.length ?? 0) > 0], task.key).toEqual([
            true,
            true,
            true,
          ])
        }
      }
    })

    it('uses only integers and small numbers', () => {
      for (const task of tasks) {
        for (const n of numbersOf(task)) {
          expect(isInt(n), task.key).toBe(true)
          expect(Math.abs(n.toNumber()), task.key).toBeLessThanOrEqual(99)
        }
      }
    })

    it('has worked solutions whose answers pass the checks', () => {
      for (const task of tasks) {
        const last = lastText(task)
        switch (task.kind) {
          case 'read-equation':
          case 'from-point-slope':
          case 'from-two-points':
            expect(last, task.key).toBe(functionToText(task.fn))
            expect(checkFunction(task.fn, last), task.key).toEqual({ kind: 'correct' })
            break
          case 'draw-graph': {
            const [p, q] = texts(task).map((text) => (text.includes('|') ? parsePoint(text).point : undefined))
            if (!p || !q) throw new Error(`No points in ${task.key}`)
            expect(checkDrawnLine(task.fn, p, q), task.key).toEqual({ kind: 'correct' })
            break
          }
          case 'point-test': {
            const first = task.steps[0]?.text ?? ''
            expect(checkFunctionValue(task.fn, first, task.point.x), task.key).toEqual({ kind: 'correct' })
            expect(task.onGraph, task.key).toBe(isOnGraph(task.fn, task.point))
            expect(task.value.equals(task.point.y), task.key).toBe(task.onGraph)
            break
          }
          case 'zero':
            expect(
              checkZero(task, task.zero.kind === 'single' ? { kind: 'input', input: last } : { kind: 'none' }),
              task.key,
            ).toEqual({ kind: 'correct' })
            break
          case 'intersection':
            expect(
              checkIntersection(
                task,
                task.intersection.kind === 'point'
                  ? { kind: 'point', input: last }
                  : { kind: task.intersection.kind },
              ),
              task.key,
            ).toEqual({ kind: 'correct' })
            break
        }
      }
    })

    it('asks to solve equations whose worked solution passes the step check', () => {
      for (const task of tasks) {
        const equation = equationOf(task)
        if (!equation) continue
        expect(equation.topic, task.key).toBe(topic)
        let line = equation.equation
        for (const step of equation.steps) {
          const text = equationToText(step.equation)
          expect(checkStep(line, step.operation, text).kind, `${task.key}: ${text}`).toBe('correct')
          line = step.equation
        }
        const set = equation.solutionSet
        switch (task.kind) {
          case 'from-point-slope':
          case 'from-two-points':
            expect(equation.variable, task.key).toBe('n')
            expect(set.kind === 'single' && set.value.equals(task.fn.n), task.key).toBe(true)
            break
          case 'zero':
            expect(set.kind, task.key).toBe(task.zero.kind === 'single' ? 'single' : 'empty')
            if (task.zero.kind === 'single' && set.kind === 'single') expect(set.value.equals(task.zero.x)).toBe(true)
            break
          case 'intersection': {
            const expected = { point: 'single', parallel: 'empty', identical: 'all' } as const
            expect(set.kind, task.key).toBe(expected[task.intersection.kind])
            if (task.intersection.kind === 'point' && set.kind === 'single') {
              expect(set.value.equals(task.intersection.point.x), task.key).toBe(true)
            }
            break
          }
          default:
            throw new Error(`Unexpected equation in ${task.key}`)
        }
      }
    })
  })

  it('keeps graph tasks in the window and draws m = 0 only rarely', () => {
    const tasks = sample(GRAPH, 7)
    expect(new Set(tasks.map((t) => t.kind))).toEqual(new Set(['read-equation', 'draw-graph']))
    for (const task of tasks) {
      expect(Math.abs(task.fn.m.toNumber()), task.key).toBeLessThanOrEqual(3)
      expect(Math.abs(task.fn.n.toNumber()), task.key).toBeLessThanOrEqual(5)
      expect(pointInWindow(point(0, task.fn.n)) && pointInWindow(point(1, task.fn.m.add(task.fn.n)))).toBe(true)
    }
    const flat = share(tasks, (t) => t.fn.m.isZero())
    expect(flat).toBeGreaterThan(0.03)
    expect(flat).toBeLessThan(0.2)
  })

  it('sets up equations from points in the window', () => {
    const tasks = sample(SET_UP, 8)
    expect(share(tasks, (t) => t.kind === 'from-two-points')).toBeGreaterThan(0.5)
    expect(share(tasks, (t) => t.kind === 'from-point-slope')).toBeGreaterThan(0.2)
    for (const task of tasks) {
      expect(Math.abs(task.fn.m.toNumber()), task.key).toBeLessThanOrEqual(4)
      expect(inWindow(task.fn.n), task.key).toBe(true)
      if (task.kind === 'from-point-slope') {
        expect(pointInWindow(task.point) && !task.point.x.isZero(), task.key).toBe(true)
        expect(isOnGraph(task.fn, task.point), task.key).toBe(true)
      }
      if (task.kind === 'from-two-points') {
        const [p, q] = task.points
        expect(pointInWindow(p) && pointInWindow(q) && !p.x.equals(q.x), task.key).toBe(true)
        expect(isOnGraph(task.fn, p) && isOnGraph(task.fn, q), task.key).toBe(true)
      }
    }
    const flat = share(tasks, (t) => t.fn.m.isZero())
    expect(flat).toBeGreaterThan(0.03)
    expect(flat).toBeLessThan(0.2)
  })

  it('mixes points on and off the graph and sometimes has no zero', () => {
    const tasks = sample(POINT_ZERO, 9)
    const pointTests = tasks.filter((t) => t.kind === 'point-test')
    const zeros = tasks.filter((t) => t.kind === 'zero')
    expect(pointTests.length).toBeGreaterThan(SAMPLES * 0.35)
    expect(zeros.length).toBeGreaterThan(SAMPLES * 0.35)
    const on = share(pointTests, (t) => t.kind === 'point-test' && t.onGraph)
    expect(on).toBeGreaterThan(0.35)
    expect(on).toBeLessThan(0.65)
    for (const task of pointTests) {
      if (task.kind !== 'point-test') continue
      expect(task.fn.m.isZero(), task.key).toBe(false)
      expect(Math.abs(task.point.x.toNumber()), task.key).toBeLessThanOrEqual(6)
      expect(Math.abs(task.point.y.sub(task.value).toNumber()), task.key).toBeLessThanOrEqual(3)
    }
    const none = share(zeros, (t) => t.kind === 'zero' && t.zero.kind === 'none')
    expect(none).toBeGreaterThan(0.05)
    expect(none).toBeLessThan(0.3)
    for (const task of zeros) {
      if (task.kind !== 'zero') continue
      expect(task.zero.kind, task.key).not.toBe('all')
      if (task.zero.kind === 'single') {
        expect(inWindow(task.zero.x), task.key).toBe(true)
        expect(Math.abs(task.fn.n.toNumber()), task.key).toBeLessThanOrEqual(20)
      }
    }
  })

  it('covers intersections, parallel and identical lines', () => {
    const tasks = sample(INTERSECTION, 10)
    const kindOf = (t: FunctionTask) => (t.kind === 'intersection' ? t.intersection.kind : undefined)
    const points = share(tasks, (t) => kindOf(t) === 'point')
    expect(points).toBeGreaterThan(0.45)
    expect(points).toBeLessThan(0.75)
    for (const kind of ['parallel', 'identical'] as const) {
      expect(share(tasks, (t) => kindOf(t) === kind)).toBeGreaterThan(0.1)
      expect(share(tasks, (t) => kindOf(t) === kind)).toBeLessThan(0.3)
    }
    for (const task of tasks) {
      if (task.kind !== 'intersection') continue
      expect(task.other.name).toBe('g')
      if (task.intersection.kind === 'point') {
        expect(pointInWindow(task.intersection.point, 6), task.key).toBe(true)
        expect(inWindow(task.fn.n) && inWindow(task.other.n), task.key).toBe(true)
      }
      const shown = functionEquationToText('g', task.otherExpr)
      if (task.intersection.kind === 'identical') {
        // The learner sees two different terms of the same function.
        expect(shown, task.key).not.toBe(functionToText(task.other))
        expect(shown, task.key).toContain('(')
      } else {
        expect(shown, task.key).toBe(functionToText(task.other))
      }
    }
  })

  it('generates series without repetitions', () => {
    for (const topic of FUNCTION_SUBTOPIC_IDS) {
      const series = generateFunctionSeries(topic, createRng(5))
      expect(series).toHaveLength(SERIES_LENGTH)
      expect(new Set(series.map((t) => t.key)).size).toBe(SERIES_LENGTH)
    }
  })

  it('avoids excluded tasks and rejects unknown subtopics', () => {
    const first = generateFunctionTask(GRAPH, createRng(3))
    const second = generateFunctionTask(GRAPH, createRng(3), [first.key])
    expect(second.key).not.toBe(first.key)
    expect(() => generateFunctionTask('algebra/terme/ausmultiplizieren', createRng(1))).toThrow()
  })
})

describe('worked solutions with fixed numbers', () => {
  it('reads the equation from the graph and draws the graph', () => {
    expect(texts(buildGraphTask('read-equation', [-1, 2]))).toEqual(['n = 2', 'm = -1', 'f(x) = -x + 2'])
    expect(texts(buildGraphTask('draw-graph', [2, -3]))).toEqual(['P(0|-3)', 'Q(1|-1)', 'f(x) = 2x - 3'])
  })

  it('sets up the equation from a point and the slope', () => {
    const task = buildPointSlopeTask(-2, [3, 1])
    expect(texts(task)).toEqual(['f(x) = -2x + n', '1 = -2·3 + n', 'n = 7', 'f(x) = -2x + 7'])
    expect(task.instruction).toContain('P(3|1)')
  })

  it('sets up the equation from two points', () => {
    const task = buildTwoPointsTask([1, 3], [4, 9])
    expect(texts(task)).toEqual([
      'm = (9 - 3)/(4 - 1) = 6/3 = 2',
      'f(x) = 2x + n',
      '3 = 2·1 + n',
      'n = 1',
      'f(x) = 2x + 1',
    ])
    expect(texts(buildTwoPointsTask([-1, 4], [0, 1]))[0]).toBe('m = (1 - 4)/(0 - (-1)) = -3')
    expect(texts(buildTwoPointsTask([1, 3], [5, 3]))).toEqual([
      'm = (3 - 3)/(5 - 1) = 0/4 = 0',
      'f(x) = n',
      '3 = n',
      'n = 3',
      'f(x) = 3',
    ])
    expect(() => buildTwoPointsTask([2, 3], [2, 5])).toThrow(RangeError)
  })

  it('tests a point', () => {
    const on = buildPointTestTask([3, -1], [2, 5])
    expect([on.kind === 'point-test' && on.onGraph, texts(on)]).toEqual([true, ['f(2) = 3·2 - 1 = 5', '5 = 5']])
    const off = buildPointTestTask([3, -1], [-2, 4])
    expect([off.kind === 'point-test' && off.onGraph, texts(off)]).toEqual([
      false,
      ['f(-2) = 3·(-2) - 1 = -7', '-7 ≠ 4'],
    ])
  })

  it('computes zeros, also without a zero', () => {
    expect(texts(buildZeroTask([2, 4]))).toEqual(['2x + 4 = 0', 'x = -2', 'N(-2|0)'])
    const none = buildZeroTask([0, 3])
    expect(texts(none)).toEqual(['3 = 0', 'L = { }'])
    expect(none.kind === 'zero' && none.zero.kind).toBe('none')
  })

  it('intersects two lines, also parallel and identical ones', () => {
    expect(texts(buildIntersectionTask([2, 1], [-1, 7]))).toEqual([
      '2x + 1 = -x + 7',
      'x = 2',
      'f(2) = 2·2 + 1 = 5',
      'S(2|5)',
    ])
    expect(texts(buildIntersectionTask([2, 1], [2, 5]))).toEqual(['2x + 1 = 2x + 5', '1 = 5', 'L = { }'])
    const identical = buildIntersectionTask([2, 1], parse('2(x + 1) - 1'))
    expect(texts(identical)).toEqual(['2x + 1 = 2(x + 1) - 1', '1 = 1', 'L = ℚ'])
    expect(identical.instruction).toContain('g(x) = 2(x + 1) - 1')
    expect(identical.kind === 'intersection' && identical.intersection.kind).toBe('identical')
    expect(() => buildIntersectionTask([1, 0], parse('x^2'))).toThrow(RangeError)
  })

  it('names the points of the worked solutions so that they can be typed in', () => {
    const task = buildIntersectionTask([2, 1], [-1, 7])
    expect(checkPoint(point(2, 5), lastText(task))).toEqual({ kind: 'correct' })
  })
})
