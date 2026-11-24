// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { TermErrorCode } from '../errors'
import type { FormHintCode } from '../form'
import { parse } from '../parser'
import { toText } from '../printer'
import { Rational } from '../rational'
import {
  intersect,
  isOnGraph,
  linearFunction,
  lineThroughPoints,
  point,
  slopeFromPoints,
  substitute,
  valueAt,
  zeroOf,
} from './analysis'
import {
  checkDrawnLine,
  checkFunction,
  checkFunctionValue,
  checkIntersection,
  checkPoint,
  checkZero,
} from './check'
import { functionToLatex, functionToText, pointToLatex, pointToText } from './print'
import { parseFunction, parsePoint, readFunction, readFunctionValue, readPoint } from './read'

const R = (num: number, den = 1) => Rational.of(num, den)
const f = linearFunction('f', 2, -3)

type Read = { ok: true } | { ok: false; error: { code: TermErrorCode; position: number; message: string } }

function expectError(read: Read, code: TermErrorCode, position: number) {
  expect(read.ok).toBe(false)
  if (read.ok) return
  expect([read.error.code, read.error.position]).toEqual([code, position])
  expect(read.error.message.length).toBeGreaterThan(0)
}

function hintOf(result: { kind: string; hint?: { code: FormHintCode } }): FormHintCode | undefined {
  return result.kind === 'wrong-form' ? result.hint?.code : undefined
}

describe('parseFunction', () => {
  it.each<[string, string | undefined, string]>([
    ['f(x) = 2x - 3', 'f', '2x - 3'],
    ['F(X)=2X-3', 'f', '2x - 3'],
    ['g( x ) = 3', 'g', '3'],
    ['y = -x + 4', undefined, '-x + 4'],
    ['Y=−x+4', undefined, '-x + 4'],
    ['2x - 3', undefined, '2x - 3'],
  ])('reads %s', (input, name, text) => {
    const parsed = parseFunction(input)
    expect([parsed.name, toText(parsed.expr)]).toEqual([name, text])
  })

  it.each<[string, TermErrorCode, number]>([
    ['', 'empty', 0],
    ['f(x) =', 'missing-operand', 5],
    ['f(x) = 2x +', 'missing-operand', 10],
    ['f(t) = 2t', 'wrong-variable', 2],
    ['f(x) = 2a + 1', 'wrong-variable', 8],
    ['f(x) = 2x = 3', 'multiple-equals', 10],
    ['2x + 3 = y', 'invalid-function', 0],
    ['f(x) = 2x § 1', 'invalid-character', 10],
    ['f(x) = 2/x', 'division-by-term', 9],
  ])('rejects "%s" with %s at position %i', (input, code, position) => {
    expectError(readFunction(input), code, position)
  })

  it('evaluates the right-hand side', () => {
    const read = readFunction('f(x) = 2(x - 1) - 1')
    expect(read.ok && read.polynomial.toString()).toBe('2*x-3')
  })
})

describe('parsePoint', () => {
  it.each<[string, string | undefined, Rational, Rational]>([
    ['P(2|5)', 'P', R(2), R(5)],
    ['S(-1 | 3)', 'S', R(-1), R(3)],
    ['(2|5)', undefined, R(2), R(5)],
    ['P(2;5)', 'P', R(2), R(5)],
    ['P(2,5|1)', 'P', R(5, 2), R(1)],
    ['P(−3|−4)', 'P', R(-3), R(-4)],
    ['P₁(0|0)', 'P₁', R(0), R(0)],
    [' Q( 1/2 | -2 ) ', 'Q', R(1, 2), R(-2)],
  ])('reads %s', (input, label, x, y) => {
    const parsed = parsePoint(input)
    expect(parsed.label).toBe(label)
    expect(parsed.point.x.equals(x) && parsed.point.y.equals(y)).toBe(true)
  })

  it.each<[string, TermErrorCode, number]>([
    ['', 'empty', 0],
    ['2|5', 'invalid-point', 0],
    ['P(2|5', 'missing-closing-bracket', 1],
    ['P(2,5)', 'comma-separator', 3],
    ['P(2 5)', 'missing-separator', 2],
    ['P(1|2|3)', 'invalid-point', 5],
    ['P(|5)', 'missing-operand', 2],
    ['P(2|)', 'missing-operand', 3],
    ['P(a|5)', 'invalid-point', 2],
    ['P(2|5) x', 'invalid-point', 6],
    ['P()', 'invalid-point', 1],
  ])('rejects "%s" with %s at position %i', (input, code, position) => {
    expectError(readPoint(input), code, position)
  })

  it('explains that the comma is a decimal comma', () => {
    const read = readPoint('P(2,5)')
    expect(!read.ok && read.error.message).toContain('Dezimalkomma')
  })
})

describe('parseFunctionValue', () => {
  it('reads a value and a chain', () => {
    const simple = readFunctionValue('f(2) = 5')
    expect(simple.ok && [simple.name, simple.argument.toNumber(), simple.values.map((v) => v.value.toNumber())]).toEqual(
      ['f', 2, [5]],
    )
    const chain = readFunctionValue('F(-2) = 3·(-2) - 1 = -7')
    expect(chain.ok && [chain.name, chain.argument.toNumber(), chain.values.map((v) => v.value.toNumber())]).toEqual([
      'f',
      -2,
      [-7, -7],
    ])
  })

  it.each<[string, TermErrorCode, number]>([
    ['', 'empty', 0],
    ['5 = f(2)', 'invalid-function-value', 0],
    ['f(2)', 'missing-equals', 4],
    ['f(2 = 5', 'missing-closing-bracket', 1],
    ['f() = 5', 'invalid-function-value', 1],
    ['f(x) = 5', 'invalid-function-value', 2],
    ['f(2) = 2x', 'invalid-function-value', 7],
    ['f(2) = ', 'missing-operand', 5],
    ['f(2) = 5 =', 'missing-operand', 9],
  ])('rejects "%s" with %s at position %i', (input, code, position) => {
    expectError(readFunctionValue(input), code, position)
  })
})

describe('analysis', () => {
  it('computes values and the Punktprobe', () => {
    expect(valueAt(f, R(4)).toNumber()).toBe(5)
    expect(isOnGraph(f, point(4, 5))).toBe(true)
    expect(isOnGraph(f, point(4, 6))).toBe(false)
  })

  it('computes the slope from two points', () => {
    expect(slopeFromPoints(point(1, 3), point(4, 9))?.toNumber()).toBe(2)
    expect(slopeFromPoints(point(4, 9), point(1, 3))?.toNumber()).toBe(2)
    expect(slopeFromPoints(point(-1, 4), point(1, 0))?.toNumber()).toBe(-2)
    expect(slopeFromPoints(point(0, 1), point(2, 2))?.equals(R(1, 2))).toBe(true)
    expect(slopeFromPoints(point(1, 3), point(1, 5))).toBeUndefined()
  })

  it('finds the line through two points', () => {
    const line = lineThroughPoints(point(2, 1), point(4, 5))
    expect(line.kind === 'function' && [line.m.toNumber(), line.n.toNumber()]).toEqual([2, -3])
    expect(lineThroughPoints(point(1, 1), point(1, 4))).toEqual({ kind: 'vertical', x: R(1) })
    expect(lineThroughPoints(point(1, 1), point(1, 1))).toEqual({ kind: 'same-point' })
  })

  it('finds zeros', () => {
    expect(zeroOf(linearFunction('f', 2, 4))).toEqual({ kind: 'single', x: R(-2) })
    expect(zeroOf(linearFunction('f', 2, 1))).toEqual({ kind: 'single', x: R(-1, 2) })
    expect(zeroOf(linearFunction('f', 0, 3))).toEqual({ kind: 'none' })
    expect(zeroOf(linearFunction('f', 0, 0))).toEqual({ kind: 'all' })
  })

  it('finds intersections, also parallel and identical lines', () => {
    const fn = linearFunction('f', 2, 1)
    expect(intersect(fn, linearFunction('g', -1, 7))).toEqual({ kind: 'point', point: point(2, 5) })
    expect(intersect(fn, linearFunction('g', 0, 3))).toEqual({ kind: 'point', point: point(1, 3) })
    expect(intersect(fn, linearFunction('g', 2, 5))).toEqual({ kind: 'parallel' })
    expect(intersect(fn, linearFunction('g', 2, 1))).toEqual({ kind: 'identical' })
    expect(intersect(linearFunction('f', 0, 3), linearFunction('g', 0, 5))).toEqual({ kind: 'parallel' })
  })

  it.each([
    ['3x - 1', 2, '3·2 - 1'],
    ['3x - 1', -2, '3·(-2) - 1'],
    ['-x + 4', -2, '-(-2) + 4'],
    ['x + 4', 3, '3 + 4'],
    ['2(x + 1) - 3', 2, '2(2 + 1) - 3'],
  ])('substitutes x in %s by %i', (input, value, text) => {
    expect(toText(substitute(parse(input), 'x', R(value)))).toBe(text)
  })
})

describe('printing', () => {
  it.each<[number, number, string]>([
    [2, -3, 'f(x) = 2x - 3'],
    [-1, 0, 'f(x) = -x'],
    [1, 4, 'f(x) = x + 4'],
    [0, 4, 'f(x) = 4'],
    [0, 0, 'f(x) = 0'],
  ])('prints m = %i, n = %i as %s, which reads back', (m, n, text) => {
    const fn = linearFunction('f', m, n)
    expect(functionToText(fn)).toBe(text)
    expect(checkFunction(fn, text)).toEqual({ kind: 'correct' })
  })

  it('prints LaTeX', () => {
    expect(functionToLatex(f)).toBe('f(x) = 2x - 3')
    expect(pointToLatex(point(2, -3), 'S')).toBe('S(2 \\mid -3)')
  })

  it('prints points that read back', () => {
    expect(pointToText(point(2, -3))).toBe('P(2|-3)')
    expect(pointToText(point(1, 2), '')).toBe('(1|2)')
    for (const p of [point(2, -3), point(-4, 0), point(0, 7)]) {
      expect(checkPoint(p, pointToText(p, 'S'))).toEqual({ kind: 'correct' })
    }
  })
})

describe('checkFunction (acceptance criterion 3)', () => {
  it.each(['f(x) = 2x - 3', 'f(x)=-3+2x', 'y = 2x - 3', '2x-3', 'f(x) = x·2 - 3', 'f(X) = 2X − 3'])(
    'accepts %s',
    (input) => {
      expect(checkFunction(f, input)).toEqual({ kind: 'correct' })
    },
  )

  it.each<[string, boolean, boolean]>([
    ['f(x) = 2x + 3', true, false],
    ['f(x) = 3x - 3', false, true],
    ['f(x) = -2x + 3', false, false],
    ['f(x) = x^2 - 3', false, false],
  ])('rejects %s and tells whether m (%s) and n (%s) are right', (input, slope, intercept) => {
    expect(checkFunction(f, input)).toEqual({ kind: 'wrong', slope, intercept })
  })

  it.each<[string, FormHintCode]>([
    ['g(x) = 2x - 3', 'wrong-name'],
    ['f(x) = 2(x - 1) - 1', 'has-brackets'],
    ['f(x) = x + x - 3', 'like-terms'],
    ['f(x) = 2x - 3 + 0', 'zero-term'],
    ['f(x) = 2x - 1 - 2', 'like-terms'],
  ])('asks to rewrite %s (%s)', (input, code) => {
    expect(hintOf(checkFunction(f, input))).toBe(code)
  })

  it('names the function in the hint', () => {
    const result = checkFunction(linearFunction('g', 2, -3), 'f(x) = 2x - 3')
    expect(result.kind === 'wrong-form' && result.hint.message).toContain('g(x)')
  })

  it('reports unreadable input', () => {
    expect(checkFunction(f, 'f(x) = 2a').kind).toBe('invalid')
  })
})

describe('checkPoint', () => {
  const expected = point(2, 5)

  it.each(['P(2|5)', '(2;5)', 'S(2 | 5)', 'P((2)|5)'])('accepts %s', (input) => {
    expect(checkPoint(expected, input)).toEqual({ kind: 'correct' })
  })

  it('tells which coordinate is right', () => {
    expect(checkPoint(expected, 'P(5|2)')).toEqual({ kind: 'wrong', x: false, y: false })
    expect(checkPoint(expected, 'P(2|4)')).toEqual({ kind: 'wrong', x: true, y: false })
    expect(checkPoint(expected, 'P(3|5)')).toEqual({ kind: 'wrong', x: false, y: true })
  })

  it('asks to work out the coordinates', () => {
    expect(hintOf(checkPoint(expected, 'P(2|2·2 + 1)'))).toBe('unevaluated-coordinate')
    expect(hintOf(checkPoint(expected, 'P(4/2|5)'))).toBe('unevaluated-coordinate')
  })

  it('reports unreadable input', () => {
    expect(checkPoint(expected, 'P(2,5)').kind).toBe('invalid')
  })
})

describe('checkDrawnLine (acceptance criterion 3)', () => {
  it('accepts any two points of the graph', () => {
    expect(checkDrawnLine(f, point(0, -3), point(1, -1))).toEqual({ kind: 'correct' })
    expect(checkDrawnLine(f, point(4, 5), point(2, 1))).toEqual({ kind: 'correct' })
    expect(checkDrawnLine(f, point(-2, -7), point(3, 3))).toEqual({ kind: 'correct' })
  })

  it('tells whether slope and intercept are right', () => {
    expect(checkDrawnLine(f, point(0, -3), point(1, 0))).toEqual({ kind: 'wrong', slope: false, intercept: true })
    expect(checkDrawnLine(f, point(0, 0), point(1, 2))).toEqual({ kind: 'wrong', slope: true, intercept: false })
  })

  it('recognises vertical lines and a single point', () => {
    expect(checkDrawnLine(f, point(1, 1), point(1, 4))).toEqual({ kind: 'vertical' })
    expect(checkDrawnLine(f, point(2, 1), point(2, 1))).toEqual({ kind: 'same-point' })
  })
})

describe('checkFunctionValue', () => {
  const g = linearFunction('f', 3, -1)

  it.each(['f(2) = 5', 'f(2) = 3·2 - 1 = 5', 'f(2)=6-1=5'])('accepts %s', (input) => {
    expect(checkFunctionValue(g, input, R(2))).toEqual({ kind: 'correct' })
  })

  it('tells whether the argument and the value are right', () => {
    expect(checkFunctionValue(g, 'f(2) = 6', R(2))).toEqual({ kind: 'wrong', argument: true, value: false })
    expect(checkFunctionValue(g, 'f(2) = 6 - 1 = 4', R(2))).toEqual({ kind: 'wrong', argument: true, value: false })
    expect(checkFunctionValue(g, 'f(3) = 8', R(2))).toEqual({ kind: 'wrong', argument: false, value: true })
    expect(checkFunctionValue(g, 'f(3) = 8')).toEqual({ kind: 'correct' })
  })

  it('asks for a single number and the right name', () => {
    expect(hintOf(checkFunctionValue(g, 'f(2) = 3·2 - 1', R(2)))).toBe('unevaluated-value')
    expect(hintOf(checkFunctionValue(g, 'g(2) = 5', R(2)))).toBe('wrong-name')
  })
})

describe('checkZero', () => {
  const key = { zero: zeroOf(linearFunction('f', 2, 4)) }

  it.each(['N(-2|0)', '(-2|0)', 'x = -2', 'x=(-2)', 'X = −2'])('accepts %s', (input) => {
    expect(checkZero(key, { kind: 'input', input })).toEqual({ kind: 'correct' })
  })

  it('rejects other answers', () => {
    expect(checkZero(key, { kind: 'input', input: 'N(2|0)' })).toEqual({ kind: 'wrong', notOnAxis: false })
    expect(checkZero(key, { kind: 'input', input: 'N(-2|1)' })).toEqual({ kind: 'wrong', notOnAxis: true })
    expect(checkZero(key, { kind: 'none' })).toEqual({ kind: 'wrong', notOnAxis: false })
  })

  it('asks for a single number', () => {
    expect(hintOf(checkZero(key, { kind: 'input', input: 'x = -4/2' }))).toBe('unevaluated-value')
    expect(hintOf(checkZero(key, { kind: 'input', input: 'N(-4:2|0)' }))).toBe('unevaluated-value')
  })

  it.each(['-2', 'y = -2', 'x = 2x', ''])('cannot read "%s"', (input) => {
    expect(checkZero(key, { kind: 'input', input }).kind).toBe('invalid')
  })

  it('accepts "keine Nullstelle" for f(x) = n with n ≠ 0', () => {
    const none = { zero: zeroOf(linearFunction('f', 0, 3)) }
    expect(checkZero(none, { kind: 'none' })).toEqual({ kind: 'correct' })
    expect(checkZero(none, { kind: 'input', input: 'N(0|0)' })).toEqual({ kind: 'wrong', notOnAxis: false })
  })
})

describe('checkIntersection (acceptance criterion 4)', () => {
  const crossing = { intersection: intersect(linearFunction('f', 2, 1), linearFunction('g', -1, 7)) }
  const parallel = { intersection: intersect(linearFunction('f', 2, 1), linearFunction('g', 2, 5)) }
  const identical = { intersection: intersect(linearFunction('f', 2, 1), linearFunction('g', 2, 1)) }

  it('checks the point of intersection', () => {
    expect(checkIntersection(crossing, { kind: 'point', input: 'S(2|5)' })).toEqual({ kind: 'correct' })
    expect(checkIntersection(crossing, { kind: 'point', input: 'S(2|4)' })).toEqual({ kind: 'wrong', x: true, y: false })
    expect(checkIntersection(crossing, { kind: 'parallel' })).toEqual({ kind: 'wrong', x: false, y: false })
  })

  it('checks parallel and identical lines', () => {
    expect(checkIntersection(parallel, { kind: 'parallel' })).toEqual({ kind: 'correct' })
    expect(checkIntersection(parallel, { kind: 'identical' })).toEqual({ kind: 'wrong', x: false, y: false })
    expect(checkIntersection(parallel, { kind: 'point', input: 'S(1|1)' })).toEqual({ kind: 'wrong', x: false, y: false })
    expect(checkIntersection(parallel, { kind: 'point', input: 'S(1' }).kind).toBe('invalid')
    expect(checkIntersection(identical, { kind: 'identical' })).toEqual({ kind: 'correct' })
    expect(checkIntersection(identical, { kind: 'parallel' })).toEqual({ kind: 'wrong', x: false, y: false })
  })
})
