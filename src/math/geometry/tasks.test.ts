// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkStep } from '../equations/check'
import { equationForm, equationToText, sidePolynomials } from '../equations/equation'
import { operationToText, readOperation } from '../equations/operation'
import type { Point } from '../functions/types'
import { createRng } from '../random'
import type { Rational } from '../rational'
import { SERIES_LENGTH } from '../tasks'
import { ALL_SUBTOPIC_IDS, isGeometrySubtopic } from '../topics'
import { checkCalculation } from './calculation'
import { checkDrawing, checkFoot } from './drawing'
import { DECIMAL, numberText } from './formulas'
import { checkSubstitution } from './substitution'
import {
  CALCULATION_KINDS,
  GEOMETRY_SUBTOPIC_IDS,
  GEOMETRY_WINDOW,
  generateGeometrySeries,
  generateGeometryTask,
  geometryGenerators,
  geometrySeriesVariants,
} from './tasks'
import type { GeometryTask, GeometryTaskKind } from './types'

const SAMPLES = 300

const PARALLELOGRAM = 'geometrie/vierecke-und-flaechen/parallelogramm'
const TRIANGLE = 'geometrie/vierecke-und-flaechen/dreieck'
const RHOMBUS = 'geometrie/vierecke-und-flaechen/raute'
const TRAPEZOID = 'geometrie/vierecke-und-flaechen/trapez'

type GeometryTopic = (typeof GEOMETRY_SUBTOPIC_IDS)[number]

function sample(topic: GeometryTopic, seed: number, count = SAMPLES): GeometryTask[] {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => geometryGenerators[topic](rng))
}

/** Whole or ending in ,5. */
const isHalfStep = (value: Rational) => value.add(value).isInteger()
const places = (value: Rational) => value.decimalPlaces() ?? Infinity
const inGrid = (p: Point, margin = 1) =>
  p.x.isInteger() &&
  p.y.isInteger() &&
  p.x.toNumber() >= GEOMETRY_WINDOW.x[0] + margin &&
  p.x.toNumber() <= GEOMETRY_WINDOW.x[1] - margin &&
  p.y.toNumber() >= GEOMETRY_WINDOW.y[0] + margin &&
  p.y.toNumber() <= GEOMETRY_WINDOW.y[1] - margin

const KINDS: Readonly<Record<GeometryTopic, readonly GeometryTaskKind[]>> = {
  [PARALLELOGRAM]: [
    'area',
    'area',
    'draw-height',
    'reverse',
    'area',
    'complete-shape',
    'perimeter',
    'reverse',
    'area',
    'draw-area',
  ],
  [TRIANGLE]: ['area', 'area', 'draw-height', 'reverse', 'area', 'draw-height', 'perimeter', 'reverse', 'area', 'draw-area'],
  [RHOMBUS]: ['area', 'area', 'complete-shape', 'reverse', 'area', 'complete-shape', 'perimeter', 'reverse', 'area', 'area'],
  [TRAPEZOID]: [
    'area',
    'area',
    'draw-height',
    'reverse',
    'area',
    'complete-shape',
    'perimeter',
    'reverse',
    'area',
    'complete-shape',
  ],
}

describe('geometry register', () => {
  it('has the four subtopics, which are part of ALL_SUBTOPIC_IDS', () => {
    expect([...GEOMETRY_SUBTOPIC_IDS].sort()).toEqual([TRIANGLE, PARALLELOGRAM, RHOMBUS, TRAPEZOID].sort())
    for (const id of GEOMETRY_SUBTOPIC_IDS) {
      expect(isGeometrySubtopic(id)).toBe(true)
      expect((ALL_SUBTOPIC_IDS as readonly string[]).includes(id)).toBe(true)
    }
    expect(isGeometrySubtopic('algebra/terme/ausmultiplizieren')).toBe(false)
  })
})

describe.each(GEOMETRY_SUBTOPIC_IDS)('%s', (topic) => {
  const tasks = sample(topic, 2026)

  it('is deterministic for a given seed', () => {
    expect(sample(topic, 99, 20).map((t) => t.key)).toEqual(sample(topic, 99, 20).map((t) => t.key))
  })

  it('generates tasks of the subtopic with instruction and worked solution', () => {
    for (const task of tasks) {
      expect(task.topic).toBe(topic)
      expect(task.instruction).not.toBe('')
      expect(task.steps.length).toBeGreaterThan(0)
    }
  })

  it('accepts the model answer of every calculation', () => {
    for (const task of tasks) {
      if (task.kind !== 'area' && task.kind !== 'perimeter' && task.kind !== 'draw-height') continue
      const { calculation } = task
      expect(checkCalculation(calculation, calculation.answer, calculation.unit), task.key).toEqual({ kind: 'correct' })
      expect(calculation.unit).toBe(calculation.quantity === 'area' ? 'cm²' : 'cm')
      expect(places(calculation.value), task.key).toBeLessThanOrEqual(2)
      for (const value of Object.values(calculation.measures)) {
        expect(value !== undefined && isHalfStep(value), task.key).toBe(true)
        expect(value && value.toNumber() >= 1 && value.toNumber() <= 13, task.key).toBe(true)
      }
    }
  })

  it('keeps measures of calculation tasks in their ranges', () => {
    for (const task of tasks) {
      if (task.kind !== 'area' && task.kind !== 'perimeter') continue
      for (const [letter, value] of Object.entries(task.calculation.measures)) {
        const n = value?.toNumber() ?? 0
        const [min, max]: readonly [number, number] =
          letter === 'h' ? [2, 8] : letter === 'b' && task.kind === 'area' ? [3, 12] : [2, 12]
        expect(n >= min && n <= max, `${task.key}: ${letter}`).toBe(true)
        expect(value !== undefined && isHalfStep(value)).toBe(true)
      }
    }
  })

  it('solves every Rückwärts task line by line', () => {
    for (const task of tasks) {
      if (task.kind !== 'reverse') continue
      expect(checkSubstitution(task, equationToText(task.substitution, DECIMAL)), task.key).toMatchObject({
        kind: 'correct',
      })
      expect(task.equation.numbers).toBe('decimal')
      expect(task.equation.variable).toBe(task.unknown)
      let line = task.equation.equation
      for (const step of task.equation.steps) {
        const operation = readOperation(operationToText(step.operation, DECIMAL))
        expect(operation.ok, task.key).toBe(true)
        const result = checkStep(line, step.operation, equationToText(step.equation, DECIMAL))
        expect(result.kind, task.key).toBe('correct')
        if (result.kind === 'correct') line = result.equation
        const { left, right } = sidePolynomials(step.equation)
        for (const term of [...left.terms(), ...right.terms()]) expect(places(term.coef), task.key).toBeLessThanOrEqual(2)
      }
      expect(equationForm(line)).toBe('solved')
      expect(equationToText(line, DECIMAL)).toBe(`${task.unknown} = ${numberText(task.result)}`)
      expect(task.unit).toBe('cm')
    }
  })

  it('places drawing tasks on grid points of the window', () => {
    for (const task of tasks) {
      if (task.kind === 'draw-height') {
        expect(task.vertices.every((p) => inGrid(p)), task.key).toBe(true)
        expect(inGrid(task.foot, 0), task.key).toBe(true)
        expect(task.vertices.some((p) => p.x.equals(task.foot.x) && p.y.equals(task.foot.y))).toBe(false)
        expect(checkFoot(task, task.foot)).toEqual({ kind: 'correct' })
        if (task.variant === 'draw-height-outside') expect(task.outside).toBe(true)
        if (task.variant === 'draw-height-inside') expect(task.outside).toBe(false)
      }
      if (task.kind === 'complete-shape' || task.kind === 'draw-area') {
        expect(task.solution.every((p) => inGrid(p)), task.key).toBe(true)
        const placed = task.solution[task.solution.length - 1]
        expect(placed && checkDrawing(task, placed), task.key).toEqual({ kind: 'correct' })
        expect(places(task.area)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('builds series with the planned composition and without repetitions', () => {
    const series = generateGeometrySeries(topic, createRng(5))
    expect(series).toHaveLength(SERIES_LENGTH)
    expect(new Set(series.map((t) => t.key)).size).toBe(SERIES_LENGTH)
    expect(series.map((t) => t.kind)).toEqual(KINDS[topic])
  })

  it('replaces drawing slots by area tasks until the drawing practice exists', () => {
    const series = generateGeometrySeries(topic, createRng(6), { kinds: CALCULATION_KINDS })
    expect(series).toHaveLength(SERIES_LENGTH)
    expect(series.map((t) => t.kind)).toEqual(
      KINDS[topic].map((kind) => (CALCULATION_KINDS.includes(kind) ? kind : 'area')),
    )
  })
})

describe('shares and variants', () => {
  it('uses ,5 in about a third of the lengths and distractors in about a third of the parallelograms', () => {
    const areas = sample(PARALLELOGRAM, 7, 600).filter((t) => t.kind === 'area')
    const halves = areas.filter((t) => t.kind === 'area' && !(t.calculation.measures.g?.isInteger() ?? true))
    const distractors = areas.filter((t) => t.kind === 'area' && t.calculation.measures.b !== undefined)
    expect(halves.length / areas.length).toBeGreaterThan(0.2)
    expect(halves.length / areas.length).toBeLessThan(0.45)
    expect(distractors.length / areas.length).toBeGreaterThan(0.2)
    expect(distractors.length / areas.length).toBeLessThan(0.45)
  })

  it('has obtuse triangles with the height outside', () => {
    const obtuse = sample(TRIANGLE, 8).filter((t) => t.variant === 'area-obtuse')
    expect(obtuse.length).toBeGreaterThan(0)
    for (const task of obtuse) {
      if (task.kind !== 'area') continue
      const apex = task.figure.vertices[2]?.[0] ?? 0
      const base = task.figure.vertices[1]?.[0] ?? 0
      expect(apex < 0 || apex > base).toBe(true)
    }
  })

  it('lists the variants of a series slot by slot', () => {
    expect(geometrySeriesVariants(TRIANGLE)).toEqual([
      'area-inside',
      'area-right',
      'draw-height-inside',
      'reverse-h',
      'area-obtuse',
      'draw-height-outside',
      'perimeter',
      'reverse-g',
      'area-inside',
      'draw-area',
    ])
    expect(geometrySeriesVariants(RHOMBUS, { kinds: CALCULATION_KINDS })).toEqual([
      'area',
      'area',
      'area',
      'reverse-f',
      'area',
      'area',
      'perimeter',
      'reverse-e',
      'area',
      'area',
    ])
  })

  it('avoids excluded tasks and rejects unknown subtopics', () => {
    const first = generateGeometryTask(TRIANGLE, createRng(3))
    const second = generateGeometryTask(TRIANGLE, createRng(3), [first.key])
    expect(second.key).not.toBe(first.key)
    expect(() => generateGeometryTask('algebra/terme/ausmultiplizieren', createRng(1))).toThrow()
    expect(() => generateGeometrySeries('funktionen/lineare-funktionen/schnittpunkt', createRng(1))).toThrow()
  })
})
