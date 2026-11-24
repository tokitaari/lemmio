// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { linearFunction } from '../math'
import type { ValueTableWidget } from './types'
import {
  buildValueTable,
  cellFeedback,
  cellLabel,
  checkTableValue,
  completeText,
  editCell,
  initialValueTable,
  isCellDone,
  isTableComplete,
  nextOpenCell,
  submitCell,
  tableHint,
  tablePoints,
  valueTableLatex,
  valueTableProblems,
} from './valueTable'

const widget = (extra: Partial<ValueTableWidget> = {}): ValueTableWidget => ({ kind: 'value-table', m: 2, n: -3, ...extra })

describe('value table: checks', () => {
  it('accepts whole m and n with all points in the window', () => {
    expect(valueTableProblems(widget())).toEqual([])
    expect(valueTableProblems(widget({ table: [-1, 0, 1, 2, 3, 4, 5], given: [0, 1], show: 'graph', name: 'g' }))).toEqual([])
  })

  it('reports fractions, bad tables and points outside the window', () => {
    expect(valueTableProblems(widget({ m: 0.5 }))).toEqual(['value-table: m and n must be whole numbers'])
    expect(valueTableProblems(widget({ table: [1, 1] }))).toEqual(['value-table: table x values must be different'])
    expect(valueTableProblems(widget({ table: [-2, 0, 6] }))).toEqual(['value-table: point (6|9) lies outside the window'])
    expect(valueTableProblems(widget({ name: 'x' }))).toEqual([
      'value-table: name "x" must be a single lower-case letter other than x and y',
    ])
  })

  it('needs given values from the table and at least one open value', () => {
    expect(valueTableProblems(widget({ given: [5] }))).toEqual(['value-table: given x values must be in the table'])
    expect(valueTableProblems(widget({ table: [0, 1], given: [0, 1] }))).toEqual([
      'value-table: every value is given; leave at least one to fill in',
    ])
  })
})

describe('value table: checking a value', () => {
  const fn = linearFunction('f', 2, -3)

  it('accepts the worked-out value, also with a real minus', () => {
    expect(checkTableValue(fn, -2, '-7')).toEqual({ kind: 'correct' })
    expect(checkTableValue(fn, -2, '−7')).toEqual({ kind: 'correct' })
    expect(checkTableValue(fn, 2, '1')).toEqual({ kind: 'correct' })
  })

  it('tells wrong values from right values that are not worked out', () => {
    expect(checkTableValue(fn, -2, '-1')).toEqual({ kind: 'wrong' })
    expect(checkTableValue(fn, -2, '2·(-2) - 3')).toEqual({ kind: 'wrong-form' })
    expect(checkTableValue(fn, 2, '2/2')).toEqual({ kind: 'wrong-form' })
  })

  it('rejects variables and unreadable input', () => {
    expect(checkTableValue(fn, 2, '2x - 3')).toEqual({ kind: 'not-a-number' })
    expect(checkTableValue(fn, 2, '3 +').kind).toBe('invalid')
  })
})

describe('value table: state', () => {
  const model = buildValueTable(widget({ given: [0] }))

  it('builds the columns with labels and given values', () => {
    expect(model.columns.map((c) => [c.x, c.y, c.label, c.given])).toEqual([
      [-2, -7, 'A', false],
      [-1, -5, 'B', false],
      [0, -3, 'C', true],
      [1, -1, 'D', false],
      [2, 1, 'E', false],
    ])
    expect(model.show).toBe('equation')
    expect(tablePoints(model, initialValueTable(model))).toEqual([{ x: 0, y: -3, label: 'C' }])
  })

  it('checks a cell only when it is filled in and changed', () => {
    const start = initialValueTable(model)
    expect(submitCell(model, start, 0)).toBe(start)
    const wrong = submitCell(model, editCell(start, 0, ' -5 '), 0)
    expect(wrong[0]).toEqual({ input: ' -5 ', checked: '-5', result: { kind: 'wrong' } })
    expect(submitCell(model, wrong, 0)).toBe(wrong)
    expect(isCellDone(model, wrong, 0)).toBe(false)
    const right = submitCell(model, editCell(wrong, 0, '-7'), 0)
    expect(right[0]?.result).toEqual({ kind: 'correct' })
    expect(isCellDone(model, right, 0)).toBe(true)
    expect(submitCell(model, editCell(right, 0, '0'), 0)).toEqual(editCell(right, 0, '0'))
    expect(submitCell(model, editCell(right, 2, '-3'), 2)[2]?.result).toBeNull()
  })

  it('finds the next open cell and the end of the table', () => {
    let state = initialValueTable(model)
    expect(nextOpenCell(model, state, 0)).toBe(1)
    expect(nextOpenCell(model, state, 1)).toBe(3)
    expect(nextOpenCell(model, state, 4)).toBe(0)
    for (const [i, value] of [
      [0, '-7'],
      [1, '-5'],
      [3, '-1'],
      [4, '1'],
    ] as const) {
      state = submitCell(model, editCell(state, i, value), i)
    }
    expect(isTableComplete(model, state)).toBe(true)
    expect(nextOpenCell(model, state, 4)).toBeNull()
    expect(tablePoints(model, state).map((p) => p.label)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })
})

describe('value table: texts', () => {
  const model = buildValueTable(widget())

  it('names the fields and explains every check', () => {
    expect(cellLabel('f', -2)).toBe('f(−2), Funktionswert für x = −2')
    const cell = (checked: string, result: Parameters<typeof cellFeedback>[2]['result']) => ({ input: checked, checked, result })
    expect(cellFeedback(model, 0, cell('-7', { kind: 'correct' }))).toBe('x = −2: richtig, Punkt A(−2|−7) eingetragen.')
    expect(cellFeedback(model, 0, cell('-5', { kind: 'wrong' }))).toBe('x = −2: −5 stimmt nicht.')
    expect(cellFeedback(model, 0, cell('2·(-2)-3', { kind: 'wrong-form' }))).toBe('x = −2: Der Wert stimmt, aber rechne den Term aus.')
    expect(cellFeedback(model, 0, cell('x', { kind: 'not-a-number' }))).toBe('x = −2: Trage eine Zahl ein, ohne Variable.')
    expect(cellFeedback(model, 0, { input: '', checked: null, result: null })).toBe('')
    expect(completeText(model)).toBe('Alle Werte richtig. Die Punkte liegen auf der Geraden f(x) = 2x − 3.')
    expect(tableHint(model)).toMatch(/^Berechne/)
    expect(tableHint(buildValueTable(widget({ show: 'graph' })))).toMatch(/^Lies/)
  })

  it('gives LaTeX that KaTeX renders in strict mode', () => {
    const latex = valueTableLatex(model)
    expect(latex).toEqual(['f(x) = 2x - 3', '-7', '-5', '-3', '-1', '1'])
    for (const l of latex) expect(() => katex.renderToString(l, { strict: 'error', throwOnError: true })).not.toThrow()
  })
})
