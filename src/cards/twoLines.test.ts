// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { point, Rational, readFunction } from '../math'
import {
  buildTwoLines,
  equateLatex,
  gLatex,
  gSliderLabel,
  gText,
  initialTwoLinesValues,
  intersectionLatex,
  intersectionPointText,
  linearCoefficients,
  rationalText,
  resultText,
  shortResult,
  twoLinesLatex,
  twoLinesProblems,
  twoLinesResult,
  twoLinesValueText,
} from './twoLines'
import type { TwoLinesWidget } from './types'

const widget = (extra: Partial<TwoLinesWidget> = {}): TwoLinesWidget => ({
  kind: 'two-lines',
  f: { m: 2, n: 1 },
  g: { m: -1, n: 7 },
  ...extra,
})

const renderStrict = (latex: string) => katex.renderToString(latex, { throwOnError: true, strict: 'error' })

describe('two lines: checks', () => {
  it('accepts fixed lines, sliders and g as a term', () => {
    expect(twoLinesProblems(widget())).toEqual([])
    expect(twoLinesProblems(widget({ vary: 'both', equate: true, names: ['g', 'h'] }))).toEqual([])
    expect(twoLinesProblems(widget({ g: { m: 2, n: -3 }, vary: 'n', gRange: { n: [-5, 5] } }))).toEqual([])
    expect(twoLinesProblems(widget({ g: '2(x + 1) - 1' }))).toEqual([])
    expect(twoLinesProblems(widget({ g: 'g(x) = -x + 7' }))).toEqual([])
  })

  it('reports names, vary and numbers', () => {
    expect(twoLinesProblems(widget({ names: ['f', 'f'] }))).toEqual(['two-lines: names of f and g must be different'])
    expect(twoLinesProblems(widget({ names: ['f', 'y'] }))).toEqual([
      'two-lines: names must be two lower-case letters other than x and y',
    ])
    expect(twoLinesProblems(widget({ vary: 'all' as never }))).toEqual(['two-lines: vary must be none, m, n or both'])
    expect(twoLinesProblems(widget({ f: { m: 1.5, n: 0 } }))).toEqual(['two-lines: m and n of f must be whole numbers'])
    expect(twoLinesProblems(widget({ f: { m: 1, n: 9 } }))).toContain('two-lines: n of f must lie inside the y-range of the window')
    expect(twoLinesProblems(widget({ g: { m: 0.5, n: 0 } }))).toEqual(['two-lines: m and n of g must be whole numbers'])
  })

  it('checks g given as a term', () => {
    expect(twoLinesProblems(widget({ g: '2(x + 1) - 1', vary: 'n' }))).toEqual(['two-lines: g as a term needs vary none'])
    expect(twoLinesProblems(widget({ g: 'x^2' }))).toEqual(['two-lines: g "x^2" must be linear with whole m and n'])
    expect(twoLinesProblems(widget({ g: 'x/2' }))).toEqual(['two-lines: g "x/2" must be linear with whole m and n'])
    expect(twoLinesProblems(widget({ g: 'h(x) = x' }))).toEqual(['two-lines: g "h(x) = x" uses the name h instead of g'])
    expect(twoLinesProblems(widget({ g: '2x +' }))[0]).toMatch(/^two-lines: g "2x \+" does not parse: /)
  })

  it('checks the slider ranges of g and a fixed intersection outside the window', () => {
    expect(twoLinesProblems(widget({ vary: 'm', g: { m: 6, n: 0 } }))).toEqual([
      'two-lines: m = 6 of g lies outside its range -4…4',
    ])
    expect(twoLinesProblems(widget({ vary: 'n', gRange: { n: [-9, 3] } }))).toEqual([
      'two-lines: n = 7 of g lies outside its range -9…3',
      'two-lines: n of g must stay inside the y-range of the window',
    ])
    expect(twoLinesProblems(widget({ vary: 'm', gRange: { m: [2, 2] } }))).toEqual([
      'two-lines: range of m is empty (2…2)',
      'two-lines: m = -1 of g lies outside its range 2…2',
    ])
    // x + 8 meets 2x + 1 at (7|15).
    expect(twoLinesProblems(widget({ g: { m: 1, n: 8 } }))).toEqual([
      'two-lines: the intersection S(7|15) lies outside the window',
    ])
    // With sliders the point may leave the window: the view says so.
    expect(twoLinesProblems(widget({ g: { m: 1, n: 8 }, vary: 'n' }))).toEqual([])
  })
})

describe('two lines: model and result', () => {
  it('reads m and n of a linear polynomial', () => {
    const read = readFunction('2(x + 1) - 3')
    if (!read.ok) throw new Error('does not parse')
    const c = linearCoefficients(read.polynomial)
    expect(c?.m.toNumber()).toBe(2)
    expect(c?.n.toNumber()).toBe(-1)
  })

  it('finds the point, parallel and identical lines', () => {
    const model = buildTwoLines(widget({ vary: 'both' }))
    const values = initialTwoLinesValues(model)
    expect(values).toEqual({ m: -1, n: 7 })
    const result = twoLinesResult(model, values)
    expect(result.kind === 'point' && intersectionPointText(result.point)).toBe('S(2|5)')
    expect(twoLinesResult(model, { m: 2, n: -3 }).kind).toBe('parallel')
    expect(twoLinesResult(model, { m: 2, n: 1 }).kind).toBe('identical')
  })

  it('keeps g as written until a slider moves it', () => {
    const model = buildTwoLines(widget({ g: '2(x + 1) - 1' }))
    expect(model.m.value).toBe(2)
    expect(model.n.value).toBe(1)
    expect(gText(model, initialTwoLinesValues(model))).toBe('g(x) = 2(x + 1) − 1')
    expect(gText(model, { m: 2, n: 0 })).toBe('g(x) = 2x')
    expect(twoLinesResult(model, initialTwoLinesValues(model)).kind).toBe('identical')
  })
})

describe('two lines: texts', () => {
  const model = buildTwoLines(widget({ vary: 'both' }))

  it('writes numbers and points with a real minus and fractions', () => {
    expect(rationalText(Rational.of(-3))).toBe('−3')
    expect(rationalText(Rational.of(-2, 3))).toBe('−2/3')
    expect(intersectionPointText(point(Rational.of(2, 3), Rational.of(7, 3)))).toBe('S(2/3|7/3)')
  })

  it('describes each case', () => {
    expect(resultText(model, twoLinesResult(model, { m: -1, n: 7 }))).toBe('')
    expect(resultText(model, twoLinesResult(model, { m: 1, n: 8 }))).toBe('S liegt außerhalb des sichtbaren Bereichs.')
    expect(resultText(model, twoLinesResult(model, { m: 2, n: -3 }))).toBe(
      'f und g haben dieselbe Steigung, aber verschiedene y-Achsenabschnitte: Sie sind parallel und haben keinen Schnittpunkt.',
    )
    expect(resultText(model, twoLinesResult(model, { m: 2, n: 1 }))).toBe('f und g sind identisch: Alle Punkte sind gemeinsam.')
    expect(shortResult(model, twoLinesResult(model, { m: 1, n: 8 }))).toBe('Schnittpunkt S(7|15), außerhalb des Fensters')
    expect(shortResult(model, twoLinesResult(model, { m: 2, n: -3 }))).toBe('parallel, kein Schnittpunkt')
    expect(shortResult(model, twoLinesResult(model, { m: 2, n: 1 }))).toBe('identisch, alle Punkte gemeinsam')
  })

  it('puts the equation of g and the result into the value text of a slider', () => {
    expect(gSliderLabel('m', 'g')).toBe('Steigung m von g')
    expect(gSliderLabel('n', 'h')).toBe('y-Achsenabschnitt n von h')
    expect(twoLinesValueText('n', { m: -1, n: 3 }, model)).toBe('n = 3, g(x) = −x + 3; Schnittpunkt S(2/3|7/3)')
    expect(twoLinesValueText('m', { m: 2, n: 7 }, model)).toBe('m = 2, g(x) = 2x + 7; parallel, kein Schnittpunkt')
  })

  it('gives the LaTeX of equations, equating and the point', () => {
    expect(gLatex(model, { m: -1, n: 7 })).toBe('g(x) = -x + 7')
    expect(equateLatex(model, { m: -1, n: 7 })).toEqual({ equation: '2x + 1 = -x + 7', solution: '\\mathbb{L} = \\{2\\}' })
    expect(equateLatex(model, { m: 2, n: -3 }).solution).toBe('\\mathbb{L} = \\{\\,\\}')
    expect(equateLatex(model, { m: 2, n: 1 }).solution).toBe('\\mathbb{L} = \\mathbb{Q}')
    const fraction = twoLinesResult(model, { m: -1, n: 3 })
    expect(intersectionLatex(fraction)).toContain('\\frac{2}{3}')
    expect(intersectionLatex(twoLinesResult(model, { m: 2, n: -3 }))).toBeNull()

    const latex = twoLinesLatex(buildTwoLines(widget({ equate: true })))
    expect(latex).toEqual(['f(x) = 2x + 1', 'g(x) = -x + 7', '2x + 1 = -x + 7', '\\mathbb{L} = \\{2\\}', 'S(2 \\mid 5)'])
    const term = twoLinesLatex(buildTwoLines(widget({ g: '2(x + 1) - 1', equate: true })))
    expect(term).toHaveLength(4)
    expect(term[3]).toBe('\\mathbb{L} = \\mathbb{Q}')
    for (const l of [...latex, ...term, intersectionLatex(fraction) ?? '']) expect(() => renderStrict(l)).not.toThrow()
  })
})
