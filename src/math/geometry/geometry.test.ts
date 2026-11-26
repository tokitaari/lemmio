// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { num, times, v, type Expr } from '../ast'
import { equationToText } from '../equations/equation'
import { operationToText } from '../equations/operation'
import { point } from '../functions/analysis'
import { parse } from '../parser'
import { Rational } from '../rational'
import { checkCalculation, parseCalculation, resultForm } from './calculation'
import { checkDrawing, checkFoot, drawnPolygon } from './drawing'
import { calculationChain, calculationToText, DECIMAL, evaluateInnerSums, formulaFor, length } from './formulas'
import {
  areParallel,
  arePerpendicular,
  classifyQuadrilateral,
  exactDistance,
  footOfPerpendicular,
  isOnLine,
  isSimplePolygon,
  lineParameter,
  polygonArea,
  segmentsIntersect,
  signedArea,
} from './polygon'
import { checkSubstitution, type SubstitutionKey } from './substitution'
import {
  buildAreaTask,
  buildCompleteShapeTask,
  buildDrawAreaTask,
  buildDrawHeightTask,
  buildPerimeterTask,
  buildReverseTask,
} from './tasks'
import type { CalculationKey, GeometryTask } from './types'

const r = (n: number, d = 1) => Rational.of(n, d)
const p = (x: number, y: number) => point(x, y)
const texts = (task: GeometryTask) => task.steps.map((step) => step.text)

function ofKind<K extends GeometryTask['kind']>(task: GeometryTask, kind: K): Extract<GeometryTask, { kind: K }> {
  if (task.kind !== kind) throw new Error(`Expected a ${kind} task, got ${task.kind}`)
  return task as Extract<GeometryTask, { kind: K }>
}

/** Triangle with g = 6 cm and h = 4 cm: A = 12 cm². */
const TRIANGLE: CalculationKey = {
  quantity: 'area',
  value: r(12),
  unit: 'cm²',
  measures: { g: r(6), h: r(4) },
  answer: 'A = g·h/2 = 6·4/2 = 12',
}

/** Triangle with g = 5 cm and h = 3 cm: A = 7,5 cm². */
const HALF: CalculationKey = { ...TRIANGLE, value: r(15, 2), measures: { g: r(5), h: r(3) } }

/** Parallelogram with a = 5 cm and b = 3 cm: u = 16 cm. */
const PERIMETER: CalculationKey = {
  quantity: 'perimeter',
  value: r(16),
  unit: 'cm',
  measures: { a: r(5), b: r(3) },
  answer: 'u = 2·(a + b) = 2·(5 + 3) = 2·8 = 16',
}

describe('parseCalculation', () => {
  it('reads the quantity before the term parser', () => {
    const parsed = parseCalculation('A = g · h : 2 = 12')
    expect(parsed.quantity).toEqual({ name: 'A', span: { start: 0, end: 1 } })
    expect(parsed.terms.map((term) => term.span)).toEqual([
      { start: 4, end: 13 },
      { start: 16, end: 18 },
    ])
  })

  it('accepts a chain without quantity', () => {
    expect(parseCalculation('6 · 4 : 2 = 12').quantity).toBeUndefined()
    expect(parseCalculation('12').terms).toHaveLength(1)
  })
})

describe('resultForm', () => {
  it('tells numbers, fractions and unevaluated terms apart', () => {
    expect(['12', '7,5', '7.5', '(12)', '-3'].map((text) => resultForm(parse(text)))).toEqual(
      Array(5).fill('number'),
    )
    expect(resultForm(parse('15/2'))).toBe('fraction')
    expect(resultForm(parse('6/2'))).toBe('unevaluated')
    expect(resultForm(parse('6 · 4'))).toBe('unevaluated')
    expect(resultForm(parse('g'))).toBe('unevaluated')
  })
})

describe('checkCalculation', () => {
  it('accepts right chains in any notation', () => {
    for (const input of [
      'A = g · h : 2 = 6 · 4 : 2 = 12',
      'A = g·h/2 = 12',
      'A = 6 · 4 : 2 = 24 : 2 = 12',
      'A = 0,5 · g · h = 12',
      'A = 6 * 4 / 2 = 12',
      'A = gh : 2 = 12',
      'A = (g · h) : 2 = 12',
      TRIANGLE.answer,
    ]) {
      expect(checkCalculation(TRIANGLE, input, 'cm²'), input).toEqual({ kind: 'correct' })
    }
  })

  it('asks for the unit first, without using an attempt', () => {
    expect(checkCalculation(TRIANGLE, 'A = 6 · 4 : 2 = 12', null)).toEqual({ kind: 'missing-unit' })
    expect(checkCalculation(TRIANGLE, 'A = g · h = 24', undefined)).toEqual({ kind: 'missing-unit' })
  })

  it('marks a wrong unit as wrong', () => {
    expect(checkCalculation(TRIANGLE, 'A = 6 · 4 : 2 = 12', 'cm')).toEqual({
      kind: 'wrong',
      value: true,
      unit: false,
      result: true,
      consistent: true,
    })
  })

  it('names the first wrong term', () => {
    expect(checkCalculation(TRIANGLE, 'A = g · h = 6 · 4 = 24', 'cm²')).toEqual({
      kind: 'wrong',
      value: false,
      unit: true,
      result: false,
      consistent: true,
      at: { index: 0, span: { start: 4, end: 9 } },
    })
    expect(checkCalculation(TRIANGLE, 'A = g · h : 2 = 6 · 4 = 12', 'cm²')).toMatchObject({
      kind: 'wrong',
      result: true,
      consistent: false,
      at: { index: 1 },
    })
  })

  it('gives form hints for right values', () => {
    const code = (input: string, key = TRIANGLE) => {
      const result = checkCalculation(key, input, key.unit)
      return result.kind === 'wrong-form' ? result.hint.code : result.kind
    }
    expect(code('A = 12')).toBe('missing-calculation')
    expect(code('A = 12 = 12')).toBe('missing-calculation')
    expect(code('6 · 4 : 2 = 12')).toBe('missing-quantity')
    expect(code('u = 6 · 4 : 2 = 12')).toBe('wrong-quantity')
    expect(code('a = 6 · 4 : 2 = 12')).toBe('wrong-quantity')
    expect(code('A = 6 · 4 : 2')).toBe('unevaluated-result')
    expect(code('A = g · h : 2')).toBe('unevaluated-result')
    expect(code('A = 5 · 3 : 2 = 15/2', HALF)).toBe('decimal-result')
    expect(code('A = 15/2 = 7,5', HALF)).toBe('missing-calculation')
    expect(code('A = 5 · 3 : 2 = 7,5', HALF)).toBe('correct')
    expect(code('A = 5 · 3 : 2 = 7.5', HALF)).toBe('correct')
  })

  it('points to the quantity and the result', () => {
    expect(checkCalculation(TRIANGLE, 'u = 6 · 4 : 2 = 12', 'cm²')).toMatchObject({
      kind: 'wrong-form',
      span: { start: 0, end: 1 },
    })
    const unevaluated = checkCalculation(TRIANGLE, 'A = 6 · 4 : 2', 'cm²')
    expect(unevaluated).toMatchObject({ kind: 'wrong-form', span: { start: 4, end: 13 } })
    expect(unevaluated.kind === 'wrong-form' && unevaluated.hint.message).toContain('A = 6 · 4 : 2 = 12')
  })

  it('checks the perimeter with u or U', () => {
    expect(checkCalculation(PERIMETER, 'u = 2 · (a + b) = 2 · (5 + 3) = 16', 'cm')).toEqual({ kind: 'correct' })
    expect(checkCalculation(PERIMETER, 'U = a + b + a + b = 16', 'cm')).toEqual({ kind: 'correct' })
    expect(checkCalculation(PERIMETER, PERIMETER.answer, 'cm')).toEqual({ kind: 'correct' })
    const wrong = checkCalculation(PERIMETER, 'A = 2 · (5 + 3) = 16', 'cm')
    expect(wrong.kind === 'wrong-form' && wrong.hint.message).toContain('u = …')
  })

  it('rejects typed units, foreign letters and unreadable input', () => {
    const error = (input: string) => {
      const result = checkCalculation(TRIANGLE, input, 'cm²')
      return result.kind === 'invalid' ? result.error : undefined
    }
    expect(error('A = 6 · 4 : 2 = 12 cm²')).toMatchObject({ code: 'unit-in-input', position: 19, length: 3 })
    expect(error('A = 6 · 4 : 2 = 12cm')).toMatchObject({ code: 'unit-in-input' })
    expect(error('A = x · 4 : 2 = 12')).toMatchObject({ code: 'unknown-letter', position: 4 })
    expect(error('A = x · 4 : 2 = 12')?.message).toContain('„x“')
    expect(error('A = b · h : 2 = 12')).toMatchObject({ code: 'unknown-letter' })
    expect(error('A = 6 · 4 : 2 = 12 =')).toMatchObject({ code: 'missing-operand' })
    expect(error('= 12')).toMatchObject({ code: 'missing-operand' })
    expect(error('A = 12 : 0 = 12')).toMatchObject({ code: 'division-by-zero' })
    expect(error('')).toMatchObject({ code: 'empty' })
  })
})

describe('checkSubstitution', () => {
  const key: SubstitutionKey = {
    unknown: 'h',
    value: r(12),
    measures: { g: r(6) },
    substitution: { left: num(12), right: { type: 'div', num: times(num(6), v('h')), den: num(2) } },
  }
  const kind = (input: string) => {
    const result = checkSubstitution(key, input)
    return result.kind === 'wrong-form' ? result.hint.code : result.kind === 'invalid' ? result.error.code : result.kind
  }

  it('accepts the formula with the numbers inserted, also with swapped sides', () => {
    expect(['12 = 6 · h : 2', '6 · h : 2 = 12', '12 = 3h', '12 = h · 6 / 2'].map(kind)).toEqual(Array(4).fill('correct'))
  })

  it('asks to insert before transforming', () => {
    expect(kind('24 = 6h')).toBe('not-substituted-only')
    expect(kind('h = 4')).toBe('not-substituted-only')
    const result = checkSubstitution(key, 'h = 4')
    expect(result.kind === 'wrong-form' && result.hint.message).toContain('12 = 6·h/2')
  })

  it('marks another solution as wrong', () => {
    expect(checkSubstitution(key, '12 = 4 · h : 2')).toMatchObject({ kind: 'wrong', left: true, right: false })
    expect(checkSubstitution(key, '6 · h = 12')).toMatchObject({ kind: 'wrong', left: false, right: true })
    expect(kind('12 = h · h')).toBe('wrong')
  })

  it('asks for the numbers of known lengths and keeps the unknown', () => {
    const missing = checkSubstitution(key, '12 = g · h : 2')
    expect(missing).toMatchObject({ kind: 'invalid', error: { code: 'unknown-letter', position: 5 } })
    expect(missing.kind === 'invalid' && missing.error.message).toBe('Setze für g die Zahl 6 ein.')
    const area = checkSubstitution(key, 'A = 6 · h : 2')
    expect(area.kind === 'invalid' && area.error.message).toBe('Setze für A den Flächeninhalt 12 ein.')
    expect(kind('12 = 6 · x : 2')).toBe('unknown-letter')
    expect(kind('12 = 6 · 4 : 2')).toBe('missing-unknown')
    expect(kind('12 = 6 · h : 2 cm')).toBe('unit-in-input')
    expect(kind('12 = 6 · h : 2 = 12')).toBe('multiple-equals')
  })
})

describe('formulas', () => {
  it('prints the chains of worked solutions', () => {
    const chain = (shape: Parameters<typeof formulaFor>[0], quantity: 'area' | 'perimeter', lengths: Record<string, number>) => {
      const measures = Object.fromEntries(Object.entries(lengths).map(([letter, value]) => [letter, length(value)]))
      return calculationToText(quantity, calculationChain(formulaFor(shape, quantity), measures))
    }
    expect(chain('triangle', 'area', { g: 6, h: 4 })).toBe('A = g·h/2 = 6·4/2 = 12')
    expect(chain('parallelogram', 'area', { g: 6.5, h: 4 })).toBe('A = g·h = 6,5·4 = 26')
    expect(chain('rhombus', 'area', { e: 5, f: 3 })).toBe('A = e·f/2 = 5·3/2 = 7,5')
    expect(chain('trapezoid', 'area', { a: 6, c: 3, h: 3 })).toBe('A = (a + c)·h/2 = (6 + 3)·3/2 = 9·3/2 = 13,5')
    expect(chain('parallelogram', 'perimeter', { a: 5, b: 3 })).toBe('u = 2·(a + b) = 2·(5 + 3) = 2·8 = 16')
    expect(chain('triangle', 'perimeter', { a: 5, b: 4, c: 3.5 })).toBe('u = a + b + c = 5 + 4 + 3,5 = 12,5')
    expect(chain('rhombus', 'perimeter', { a: 2.5 })).toBe('u = 4·a = 4·2,5 = 10')
  })

  it('works out inner sums only', () => {
    const show = (e: Expr) => calculationToText('area', [evaluateInnerSums(e)])
    expect(show(parse('(4 + 6) · 3 : 2'))).toBe('A = 10·3/2')
    expect(show(parse('5 + 4 + 3'))).toBe('A = 5 + 4 + 3')
  })

  it('reads lengths with at most two decimals', () => {
    expect(length(6.5).equals(r(13, 2))).toBe(true)
    expect(length(8.75).equals(r(35, 4))).toBe(true)
    expect(() => length(1.125)).toThrow(RangeError)
  })
})

describe('polygon analysis', () => {
  const rectangle = [p(0, 0), p(4, 0), p(4, 3), p(0, 3)]

  it('computes areas exactly', () => {
    expect(polygonArea(rectangle).equals(r(12))).toBe(true)
    expect(signedArea([...rectangle].reverse()).equals(r(-12))).toBe(true)
    expect(polygonArea([p(0, 0), p(6, 0), p(2, 4)]).equals(r(12))).toBe(true)
    expect(polygonArea([p(0, 0), p(3, 0), p(1, 3)]).equals(r(9, 2))).toBe(true)
  })

  it('detects degenerate and self-intersecting polygons', () => {
    expect(isSimplePolygon(rectangle)).toBe(true)
    expect(isSimplePolygon([p(0, 0), p(4, 0), p(0, 3), p(4, 3)])).toBe(false)
    expect(isSimplePolygon([p(0, 0), p(2, 0), p(4, 0), p(2, 3)])).toBe(false)
    expect(isSimplePolygon([p(0, 0), p(4, 0), p(4, 0), p(0, 3)])).toBe(false)
    expect(isSimplePolygon([p(0, 0), p(2, 2), p(4, 4)])).toBe(false)
  })

  it('classifies quadrilaterals', () => {
    expect(classifyQuadrilateral([p(0, 0), p(4, 0), p(5, 2), p(1, 2)])).toEqual({
      trapezoid: true,
      parallelogram: true,
      rhombus: false,
    })
    expect(classifyQuadrilateral([p(0, 0), p(5, 0), p(8, 4), p(3, 4)]).rhombus).toBe(true)
    expect(classifyQuadrilateral([p(0, 0), p(6, 0), p(4, 3), p(1, 3)])).toEqual({
      trapezoid: true,
      parallelogram: false,
      rhombus: false,
    })
    expect(classifyQuadrilateral([p(0, 0), p(4, 0), p(0, 3), p(4, 3)]).trapezoid).toBe(false)
  })

  it('finds feet of perpendiculars, also on the extension', () => {
    expect(footOfPerpendicular(p(2, 4), p(0, 0), p(6, 0))).toEqual(p(2, 0))
    expect(footOfPerpendicular(p(0, 5), p(0, 0), p(4, 4))).toEqual(point(r(5, 2), r(5, 2)))
    expect(lineParameter(p(-2, 4), p(0, 0), p(6, 0)).equals(r(-1, 3))).toBe(true)
  })

  it('tests lines and segments', () => {
    expect(isOnLine(p(9, 0), p(0, 0), p(3, 0))).toBe(true)
    expect(areParallel(p(0, 0), p(2, 1), p(1, 3), p(5, 5))).toBe(true)
    expect(areParallel(p(0, 0), p(0, 0), p(1, 3), p(5, 5))).toBe(false)
    expect(arePerpendicular(p(0, 0), p(2, 1), p(0, 0), p(-1, 2))).toBe(true)
    expect(segmentsIntersect(p(0, 0), p(4, 4), p(0, 4), p(4, 0))).toBe(true)
    expect(segmentsIntersect(p(0, 0), p(2, 0), p(2, 0), p(3, 3))).toBe(true)
    expect(segmentsIntersect(p(0, 0), p(2, 0), p(0, 1), p(2, 1))).toBe(false)
    expect(segmentsIntersect(p(0, 0), p(3, 0), p(2, 0), p(5, 0))).toBe(true)
    expect(segmentsIntersect(p(0, 0), p(1, 0), p(2, 0), p(5, 0))).toBe(false)
    expect(exactDistance(p(1, 2), p(1, 7))?.equals(r(5))).toBe(true)
    expect(exactDistance(p(0, 0), p(3, 4))?.equals(r(5))).toBe(true)
    expect(exactDistance(p(0, 0), p(1, 1))).toBeUndefined()
  })
})

describe('tasks with fixed numbers', () => {
  it('calculates areas', () => {
    const triangle = ofKind(buildAreaTask('triangle', { g: 6, h: 4 }), 'area')
    expect(texts(triangle)).toEqual(['A = g·h/2 = 6·4/2 = 12 cm²'])
    expect(triangle.instruction).toBe('Berechne den Flächeninhalt des Dreiecks mit g = 6 cm und h = 4 cm.')
    expect(triangle.calculation).toMatchObject({ answer: 'A = g·h/2 = 6·4/2 = 12', unit: 'cm²' })
    expect(triangle.figure.labels.map((label) => [label.letter, label.kind])).toEqual([
      ['g', 'side'],
      ['h', 'height'],
    ])
    expect(triangle.figure.vertices[2]).toEqual([2.4, 4])
    expect(texts(buildAreaTask('parallelogram', { g: 6.5, h: 4 }))).toEqual(['A = g·h = 6,5·4 = 26 cm²'])
    expect(texts(buildAreaTask('rhombus', { e: 6, f: 4 }))).toEqual(['A = e·f/2 = 6·4/2 = 12 cm²'])
    expect(ofKind(buildAreaTask('rhombus', { e: 6, f: 4 }), 'area').figure.diagonals).toBe(true)
    expect(texts(buildAreaTask('trapezoid', { a: 6, c: 3, h: 3 }))).toEqual([
      'A = (a + c)·h/2 = (6 + 3)·3/2 = 9·3/2 = 13,5 cm²',
    ])
    expect(buildAreaTask('triangle', { g: 4, h: 3 }, { offset: -2 }).steps[0]?.note).toContain('außerhalb')
  })

  it('shows a distractor side that fixes the shape', () => {
    const task = ofKind(buildAreaTask('parallelogram', { g: 6, h: 4, b: 5 }), 'area')
    expect(task.instruction).toContain('g = 6 cm, h = 4 cm und b = 5 cm')
    expect(task.figure.vertices[3]).toEqual([3, 4])
    expect(checkCalculation(task.calculation, 'A = g · b = 6 · 5 = 30', 'cm²')).toMatchObject({ kind: 'wrong' })
    expect(() => buildAreaTask('parallelogram', { g: 6, h: 4, b: 3 })).toThrow(RangeError)
    expect(() => buildAreaTask('rhombus', { e: 6, f: 4, a: 3 })).toThrow(RangeError)
  })

  it('calculates perimeters', () => {
    expect(texts(buildPerimeterTask('parallelogram', { a: 5, b: 3 }))).toEqual(['u = 2·(a + b) = 2·(5 + 3) = 2·8 = 16 cm'])
    expect(texts(buildPerimeterTask('triangle', { a: 5, b: 4, c: 3 }))).toEqual(['u = a + b + c = 5 + 4 + 3 = 12 cm'])
    expect(texts(buildPerimeterTask('rhombus', { a: 2.5 }))).toEqual(['u = 4·a = 4·2,5 = 10 cm'])
    expect(texts(buildPerimeterTask('trapezoid', { a: 8, b: 4, c: 5, d: 4 }))).toEqual([
      'u = a + b + c + d = 8 + 4 + 5 + 4 = 21 cm',
    ])
    expect(() => buildPerimeterTask('triangle', { a: 1, b: 2, c: 5 })).toThrow(RangeError)
    expect(() => buildPerimeterTask('trapezoid', { a: 8, b: 1, c: 5, d: 1 })).toThrow(RangeError)
  })

  it('calculates a length from the area', () => {
    const task = ofKind(buildReverseTask('triangle', { g: 6, h: 4 }, 'h'), 'reverse')
    expect(task.instruction).toBe('Ein Dreieck hat den Flächeninhalt A = 12 cm² und die Grundseite g = 6 cm. Berechne die Höhe h.')
    expect(texts(task)).toEqual(['A = g·h/2', '12 = 6·h/2', 'h = 4 cm'])
    expect(task.equation.numbers).toBe('decimal')
    expect(task.equation.steps.map((step) => equationToText(step.equation, DECIMAL))).toEqual(['12 = 3h', '3h = 12', 'h = 4'])
    expect(checkSubstitution(task, '12 = 6 · h : 2')).toMatchObject({ kind: 'correct' })
    expect(task.figure.labels.find((label) => label.letter === 'h')?.given).toBe(false)
    expect(() => buildReverseTask('triangle', { g: 6, h: 4 }, 'e')).toThrow(RangeError)
  })

  it('solves Rückwärts tasks with decimals', () => {
    const task = ofKind(buildReverseTask('trapezoid', { a: 6, c: 4, h: 3 }, 'c'), 'reverse')
    expect(task.instruction).toBe(
      'Ein Trapez hat den Flächeninhalt A = 15 cm², die Seite a = 6 cm und die Höhe h = 3 cm. Berechne die Seite c.',
    )
    expect(task.equation.steps.map((step) => equationToText(step.equation, DECIMAL))).toEqual([
      '15 = 1,5c + 9',
      '1,5c + 9 = 15',
      '1,5c = 6',
      'c = 4',
    ])
    expect(operationToText(task.equation.steps[3]?.operation ?? { kind: 'swap' }, DECIMAL)).toBe('| : 1,5')
    expect(task.equation.key).toBe('15 = (6 + c)·3/2')
  })
})

describe('drawing tasks', () => {
  it('checks the foot of a height inside the base', () => {
    const task = ofKind(buildDrawHeightTask('triangle', [[1, 2], [7, 2], [3, 6]], 2), 'draw-height')
    expect([task.foot, task.outside]).toEqual([p(3, 2), false])
    expect(task.calculation.value.equals(r(12))).toBe(true)
    expect(checkFoot(task, p(3, 2))).toEqual({ kind: 'correct' })
    expect(checkFoot(task, p(4, 2))).toEqual({ kind: 'wrong', onLine: true, perpendicular: false })
    expect(checkFoot(task, p(3, 3))).toEqual({ kind: 'wrong', onLine: false, perpendicular: true })
    expect(texts(task)).toEqual(['F(3|2)', 'g = 6 cm', 'h = 4 cm', 'A = g·h/2 = 6·4/2 = 12 cm²'])
    expect(task.instruction).toContain('A(1|2), B(7|2) und C(3|6)')
  })

  it('checks the foot of a height outside the base and on a vertical base', () => {
    const obtuse = ofKind(buildDrawHeightTask('triangle', [[3, 2], [7, 2], [1, 5]], 2), 'draw-height')
    expect([obtuse.foot, obtuse.outside]).toEqual([p(1, 2), true])
    expect(obtuse.calculation.value.equals(r(6))).toBe(true)
    const vertical = ofKind(buildDrawHeightTask('triangle', [[5, 1], [5, 7], [2, 3]], 2), 'draw-height')
    expect(vertical.foot).toEqual(p(5, 3))
    expect(vertical.calculation.value.equals(r(9))).toBe(true)
    expect(() => buildDrawHeightTask('triangle', [[1, 2], [7, 2], [1, 6]], 2)).toThrow(RangeError)
  })

  it('reads a, c and h of a trapezoid', () => {
    const task = ofKind(buildDrawHeightTask('trapezoid', [[1, 1], [7, 1], [6, 4], [3, 4]], 3), 'draw-height')
    expect(task.foot).toEqual(p(3, 1))
    expect(task.calculation.answer).toBe('A = (a + c)·h/2 = (6 + 3)·3/2 = 9·3/2 = 13,5')
    expect(checkCalculation(task.calculation, task.calculation.answer, 'cm²')).toEqual({ kind: 'correct' })
  })

  it('completes parallelograms, rhombi and trapezoids', () => {
    const parallelogram = ofKind(buildCompleteShapeTask('parallelogram', [[1, 1], [5, 1], [6, 3], [2, 3]]), 'complete-shape')
    expect(parallelogram.given).toHaveLength(3)
    expect(checkDrawing(parallelogram, p(2, 3))).toEqual({ kind: 'correct' })
    expect(checkDrawing(parallelogram, p(3, 3))).toEqual({ kind: 'wrong', shape: false, area: false })
    expect(texts(parallelogram)).toEqual(['D(2|3)'])
    expect(parallelogram.steps[0]?.note).toContain('4 nach links')

    const rhombus = ofKind(buildCompleteShapeTask('rhombus', [[1, 3], [4, 1], [7, 3], [4, 5]]), 'complete-shape')
    expect(checkDrawing(rhombus, p(4, 5))).toEqual({ kind: 'correct' })
    expect(checkDrawing(rhombus, p(4, 6))).toMatchObject({ kind: 'wrong', shape: false })
    expect(() => buildCompleteShapeTask('rhombus', [[1, 1], [5, 1], [6, 3], [2, 3]])).toThrow(RangeError)

    const trapezoid = ofKind(buildCompleteShapeTask('trapezoid', [[1, 1], [7, 1], [5, 4], [2, 4]]), 'complete-shape')
    expect(trapezoid.area.equals(r(27, 2))).toBe(true)
    expect(checkDrawing(trapezoid, p(2, 4))).toEqual({ kind: 'correct' })
    expect(checkDrawing(trapezoid, p(1, 4))).toEqual({ kind: 'wrong', shape: true, area: false })
    expect(checkDrawing(trapezoid, p(2, 5))).toMatchObject({ kind: 'wrong', shape: false })
    expect(texts(trapezoid)).toEqual(['h = 3 cm', '13,5 = (6 + c)·3/2', 'c = 3 cm', 'D(2|4)'])
  })

  it('draws figures with a given area', () => {
    const triangle = ofKind(buildDrawAreaTask('triangle', [[1, 1], [7, 1], [3, 4]]), 'draw-area')
    expect([triangle.wanted, triangle.given.length]).toEqual(['C', 2])
    expect(triangle.area.equals(r(9))).toBe(true)
    expect(checkDrawing(triangle, p(3, 4))).toEqual({ kind: 'correct' })
    expect(checkDrawing(triangle, p(10, 4))).toEqual({ kind: 'correct' })
    expect(checkDrawing(triangle, p(3, 5))).toEqual({ kind: 'wrong', shape: true, area: false })
    expect(checkDrawing(triangle, p(4, 1))).toMatchObject({ kind: 'wrong', shape: false })
    expect(texts(triangle)).toEqual(['A = g·h/2', '9 = 6·h/2', 'h = 3 cm', 'C(3|4)'])

    const parallelogram = ofKind(buildDrawAreaTask('parallelogram', [[1, 1], [5, 1], [6, 4], [2, 4]]), 'draw-area')
    expect(parallelogram.wanted).toBe('D')
    expect(checkDrawing(parallelogram, p(2, 4))).toEqual({ kind: 'correct' })
    expect(checkDrawing(parallelogram, p(1, 4))).toEqual({ kind: 'correct' })
    expect(drawnPolygon(parallelogram, p(1, 4))).toEqual([p(1, 1), p(5, 1), p(5, 4), p(1, 4)])
    expect(checkDrawing(parallelogram, p(2, 1))).toMatchObject({ kind: 'wrong', shape: false })
    expect(texts(parallelogram)).toEqual(['A = g·h', '12 = 4·h', 'h = 3 cm', 'D(2|4)', 'C(6|4)'])
  })
})
