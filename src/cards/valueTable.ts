import {
  functionToLatex,
  isPlainNumber,
  linearFunction,
  numberToLatex,
  Rational,
  readTerm,
  valueAt,
  type LinearFunction,
  type TermErrorInfo,
} from '../math'
import { formatNumber, inWindow, type GridPoint, type PlaneLine, type PlaneWindow } from '../plane'
import { commonLineProblems, isWhole, lineEquationText, widgetName, widgetWindow } from './lineCommon'
import { DEFAULT_TABLE, tableProblems } from './linePoints'
import type { ValueTableShow, ValueTableWidget } from './types'

/**
 * Logic of the `value-table` widget: checks of the widget, checks of the
 * values entered, the state of the table and the texts. Pure; the view is
 * src/components/cards/ValueTableView.tsx.
 */

/** Labels of the points in the plane, one per column. */
export const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

export interface ValueTableModel {
  name: string
  window: PlaneWindow
  fn: LinearFunction
  line: PlaneLine
  show: ValueTableShow
  columns: readonly ValueColumn[]
}

export interface ValueColumn {
  x: number
  /** f(x), a whole number. */
  y: number
  /** Name of the point (x|f(x)) in the plane. */
  label: string
  given: boolean
}

export type ValueCheck =
  /** The value is right and written as a number. */
  | { kind: 'correct' }
  | { kind: 'wrong' }
  /** The value is right but not worked out, e.g. `2·(-2) - 3`. */
  | { kind: 'wrong-form' }
  /** The input contains a variable. */
  | { kind: 'not-a-number' }
  | { kind: 'invalid'; error: TermErrorInfo }

export interface ValueCell {
  input: string
  /** Input of the last check, or null if not checked yet; a check only runs again after a change. */
  checked: string | null
  result: ValueCheck | null
}

/** One cell per column (given columns too, they stay empty). */
export type ValueTableState = readonly ValueCell[]

export function valueTableProblems(widget: ValueTableWidget): string[] {
  const at = 'value-table'
  const problems = commonLineProblems(widget)
  if (widget.show !== undefined && !['equation', 'graph'].includes(widget.show)) {
    problems.push(`${at}: show must be equation or graph`)
  }
  if (!isWhole(widget.m) || !isWhole(widget.n)) problems.push(`${at}: m and n must be whole numbers`)
  const table = widget.table ?? DEFAULT_TABLE
  if (widget.table !== undefined) problems.push(...tableProblems(at, widget.table))
  if (problems.length > 0) return problems

  const window = widgetWindow(widget)
  for (const x of table) {
    const y = widget.m * x + widget.n
    if (!inWindow(window, { x, y })) problems.push(`${at}: point (${x}|${y}) lies outside the window`)
  }
  const given = widget.given ?? []
  if (given.some((x) => !table.includes(x))) problems.push(`${at}: given x values must be in the table`)
  if (new Set(given).size !== given.length) problems.push(`${at}: given x values must be different`)
  if (table.every((x) => given.includes(x))) problems.push(`${at}: every value is given; leave at least one to fill in`)
  return problems
}

/** Assumes a widget without problems. */
export function buildValueTable(widget: ValueTableWidget): ValueTableModel {
  const name = widgetName(widget)
  const given = widget.given ?? []
  const columns = (widget.table ?? DEFAULT_TABLE).map((x, i) => ({
    x,
    y: widget.m * x + widget.n,
    label: COLUMN_LABELS[i] ?? '?',
    given: given.includes(x),
  }))
  return {
    name,
    window: widgetWindow(widget),
    fn: linearFunction(name, widget.m, widget.n),
    line: { kind: 'function', m: widget.m, n: widget.n },
    show: widget.show ?? 'equation',
    columns,
  }
}

/**
 * Checks a y value: a term without variables whose value is f(x); right
 * values must be worked out (like coordinates of points).
 */
export function checkTableValue(fn: LinearFunction, x: number, input: string): ValueCheck {
  const read = readTerm(input)
  if (!read.ok) return { kind: 'invalid', error: read.error }
  const value = read.polynomial.constantValue()
  if (!value) return { kind: 'not-a-number' }
  if (!value.equals(valueAt(fn, Rational.of(x)))) return { kind: 'wrong' }
  return isPlainNumber(read.expr) ? { kind: 'correct' } : { kind: 'wrong-form' }
}

export function initialValueTable(model: ValueTableModel): ValueTableState {
  return model.columns.map(() => ({ input: '', checked: null, result: null }))
}

export function editCell(state: ValueTableState, index: number, input: string): ValueTableState {
  return state.map((cell, i) => (i === index ? { ...cell, input } : cell))
}

/**
 * Checks the cell if it is open, not empty and changed since the last check.
 * Returns the same state object if nothing was checked.
 */
export function submitCell(model: ValueTableModel, state: ValueTableState, index: number): ValueTableState {
  const column = model.columns[index]
  const cell = state[index]
  if (!column || !cell || column.given || isCellDone(model, state, index)) return state
  const input = cell.input.trim()
  if (input === '' || input === cell.checked) return state
  const result = checkTableValue(model.fn, column.x, input)
  return state.map((c, i) => (i === index ? { input: cell.input, checked: input, result } : c))
}

/** Given or entered correctly. */
export function isCellDone(model: ValueTableModel, state: ValueTableState, index: number): boolean {
  return model.columns[index]?.given === true || state[index]?.result?.kind === 'correct'
}

export function isTableComplete(model: ValueTableModel, state: ValueTableState): boolean {
  return model.columns.every((_, i) => isCellDone(model, state, i))
}

/** Index of the next open column after `index` (wrapping around), or null if all are done. */
export function nextOpenCell(model: ValueTableModel, state: ValueTableState, index: number): number | null {
  const count = model.columns.length
  for (let step = 1; step <= count; step++) {
    const i = (index + step) % count
    if (!isCellDone(model, state, i)) return i
  }
  return null
}

/** The points shown in the plane: the columns that are done. */
export function tablePoints(model: ValueTableModel, state: ValueTableState): (GridPoint & { label: string })[] {
  return model.columns.flatMap((c, i) => (isCellDone(model, state, i) ? [{ x: c.x, y: c.y, label: c.label }] : []))
}

// ---------------------------------------------------------------------------
// Texts (German, with a real minus)

/** Accessible name of the input, e.g. `f(−2), Funktionswert für x = −2`. */
export function cellLabel(name: string, x: number): string {
  const at = formatNumber(x)
  return `${name}(${at}), Funktionswert für x = ${at}`
}

/** Message after a check, shown and announced, e.g. `x = −2: richtig, Punkt A(−2|−7) eingetragen.` */
export function cellFeedback(model: ValueTableModel, index: number, cell: ValueCell): string {
  const column = model.columns[index]
  const result = cell.result
  if (!column || !result) return ''
  const at = `x = ${formatNumber(column.x)}`
  switch (result.kind) {
    case 'correct':
      return `${at}: richtig, Punkt ${column.label}(${formatNumber(column.x)}|${formatNumber(column.y)}) eingetragen.`
    case 'wrong':
      return `${at}: ${(cell.checked ?? '').replace(/-/g, '−')} stimmt nicht.`
    case 'wrong-form':
      return `${at}: Der Wert stimmt, aber rechne den Term aus.`
    case 'not-a-number':
      return `${at}: Trage eine Zahl ein, ohne Variable.`
    case 'invalid':
      return `${at}: ${result.error.message}`
  }
}

/** Shown and announced once every value is right. */
export function completeText(model: ValueTableModel): string {
  return `Alle Werte richtig. Die Punkte liegen auf der Geraden ${lineEquationText(model.line, model.name)}.`
}

/** Hint above the table while values are open. */
export function tableHint(model: ValueTableModel): string {
  return model.show === 'graph'
    ? 'Lies die y-Werte am Graphen ab und trage sie ein (Enter prüft).'
    : 'Berechne die y-Werte mit der Gleichung und trage sie ein (Enter prüft).'
}

/** LaTeX the widget shows (equation and all values), for `deckLatex`. */
export function valueTableLatex(model: ValueTableModel): string[] {
  return [functionToLatex(model.fn), ...model.columns.map((c) => numberToLatex(Rational.of(c.y)))]
}
