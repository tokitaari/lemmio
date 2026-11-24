// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { Rational } from '../math'
import { lineLatex, matchesTarget } from './lineCommon'
import { buildLineSliders, initialValues, lineSlidersLatex, lineSlidersProblems, sliderValueText, valuesLine } from './lineSliders'
import type { LineSlidersWidget } from './types'

const widget = (extra: Partial<LineSlidersWidget> = {}): LineSlidersWidget => ({
  kind: 'line-sliders',
  m: { value: 2 },
  n: { value: -3 },
  ...extra,
})

describe('line sliders: checks', () => {
  it('accepts a widget with default ranges', () => {
    expect(lineSlidersProblems(widget())).toEqual([])
    expect(lineSlidersProblems(widget({ vary: 'n', m: { value: 3, min: 5 }, target: { m: 3, n: 1 } }))).toEqual([])
  })

  it('needs whole numbers inside non-empty ranges', () => {
    expect(lineSlidersProblems(widget({ m: { value: 1.5 } }))).toEqual(['line-sliders: m must be a whole number'])
    expect(lineSlidersProblems(widget({ m: { value: 5 } }))).toEqual(['line-sliders: m = 5 lies outside its range -4…4'])
    expect(lineSlidersProblems(widget({ m: { value: 0, min: 2, max: 1 } }))).toEqual([
      'line-sliders: range of m is empty (2…1)',
      'line-sliders: m = 0 lies outside its range 2…1',
    ])
    expect(lineSlidersProblems(widget({ n: { value: 0, min: -2.5 } }))).toEqual(['line-sliders: range of n must have whole numbers'])
  })

  it('limits the slope and keeps n inside the window', () => {
    expect(lineSlidersProblems(widget({ m: { value: 0, min: -12, max: 4 } }))).toEqual(['line-sliders: m must stay within −10…10'])
    expect(lineSlidersProblems(widget({ vary: 'n', m: { value: 12 } }))).toEqual(['line-sliders: m must stay within −10…10'])
    expect(lineSlidersProblems(widget({ n: { value: 0, min: -9, max: 9 } }))).toEqual([
      'line-sliders: n must stay inside the y-range of the window',
    ])
    expect(lineSlidersProblems(widget({ vary: 'm', n: { value: 9 } }))).toEqual([
      'line-sliders: n must stay inside the y-range of the window',
    ])
    expect(lineSlidersProblems(widget({ window: { x: [-4, 4], y: [-4, 4] }, n: { value: 0 } }))).toEqual([])
  })

  it('checks name, window and vary', () => {
    expect(lineSlidersProblems(widget({ name: 'x' }))).toEqual([
      'line-sliders: name "x" must be a single lower-case letter other than x and y',
    ])
    expect(lineSlidersProblems(widget({ window: { x: [1, 8], y: [-8, 8] } }))).toEqual([
      'line-sliders: window: x-Bereich: 0 muss im Fenster liegen, damit die Achse sichtbar ist.',
    ])
    expect(lineSlidersProblems(widget({ vary: 'k' as 'm' }))).toEqual(['line-sliders: vary must be both, m or n'])
  })

  it('needs a target the sliders can reach', () => {
    expect(lineSlidersProblems(widget({ target: { m: 1, n: 2 } }))).toEqual([])
    expect(lineSlidersProblems(widget({ target: { m: 5, n: 0 } }))).toEqual([
      'line-sliders: target m = 5 cannot be reached with the sliders',
    ])
    expect(lineSlidersProblems(widget({ vary: 'n', target: { m: 1, n: 2 } }))).toEqual([
      'line-sliders: target m = 1 cannot be reached with the sliders',
    ])
    expect(lineSlidersProblems(widget({ target: { m: 2, n: -3 } }))).toEqual(['line-sliders: target equals the start'])
    expect(lineSlidersProblems(widget({ target: { m: 2, n: 9 } }))).toEqual(['line-sliders: target n = 9 lies outside the window'])
    expect(lineSlidersProblems(widget({ target: { m: 0.5, n: 1 } }))).toEqual(['line-sliders: target m and n must be whole numbers'])
  })
})

describe('line sliders: model and texts', () => {
  it('fills in the default ranges', () => {
    const model = buildLineSliders(widget({ vary: 'm' }))
    expect(model.name).toBe('f')
    expect(model.m).toEqual({ parameter: 'm', value: 2, min: -4, max: 4, varies: true })
    expect(model.n).toEqual({ parameter: 'n', value: -3, min: -8, max: 8, varies: false })
    expect(initialValues(model)).toEqual({ m: 2, n: -3 })
    expect(buildLineSliders(widget({ window: { x: [-5, 5], y: [-3, 6] } })).n).toMatchObject({ min: -3, max: 6 })
  })

  it('names the value and the new equation for assistive technology', () => {
    expect(sliderValueText('m', { m: 2, n: -3 }, 'f')).toBe('m = 2, f(x) = 2x − 3')
    expect(sliderValueText('n', { m: -1, n: 0 }, 'g')).toBe('n = 0, g(x) = −x')
    expect(sliderValueText('m', { m: 0, n: 5 }, 'f')).toBe('m = 0, f(x) = 5')
  })

  it('compares with the target exactly', () => {
    expect(matchesTarget(valuesLine({ m: 1, n: 2 }), { m: 1, n: 2 })).toBe(true)
    expect(matchesTarget(valuesLine({ m: 1, n: 3 }), { m: 1, n: 2 })).toBe(false)
    expect(matchesTarget({ kind: 'function', m: Rational.of(1, 2), n: 2 }, { m: 1, n: 2 })).toBe(false)
    expect(matchesTarget({ kind: 'vertical', x: 1 }, { m: 1, n: 2 })).toBe(false)
    expect(matchesTarget(null, { m: 1, n: 2 })).toBe(false)
  })

  it('typesets every equation the sliders can reach', () => {
    expect(lineSlidersLatex(buildLineSliders(widget()))).toEqual(['f(x) = 2x - 3'])
    for (let m = -10; m <= 10; m++) {
      for (let n = -8; n <= 8; n++) {
        const latex = lineLatex(valuesLine({ m, n }), 'f')
        expect(() => katex.renderToString(latex, { throwOnError: true, strict: 'error' }), latex).not.toThrow()
      }
    }
  })
})
