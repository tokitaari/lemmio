import { lineThroughPoints, numberToLatex, point, Rational } from '../math'
import { formatNumber, inWindow, type GridPoint, type PlaneLine, type PlaneWindow } from '../plane'
import {
  commonLineProblems,
  isWhole,
  lineEquationText,
  lineLatex,
  matchesTarget,
  targetProblems,
  widgetName,
  widgetWindow,
} from './lineCommon'
import type { LinePointsWidget, LineTarget } from './types'

/**
 * Logic of the `line-points` widget: the line through the two movable
 * points, its equation and the table of values. The view is
 * src/components/cards/LinePointsView.tsx.
 *
 * The points are grid points, but the slope between them may be a fraction
 * (e.g. P(0|0), Q(2|1) gives f(x) = ½x); the widget shows it as it is.
 */

/** x values of the table when the widget gives none. */
export const DEFAULT_TABLE: readonly number[] = [-2, -1, 0, 1, 2]

/** Most columns of a table; more do not fit at 360 px. */
export const TABLE_MAX = 7

/** Largest |x| in a table. */
export const TABLE_LIMIT = 20

/** Labels of the two points. */
export const POINT_LABELS = ['P', 'Q'] as const

export interface LinePointsModel {
  name: string
  window: PlaneWindow
  start: readonly [GridPoint, GridPoint]
  /** x values of the table; empty without a table. */
  table: readonly number[]
  target?: LineTarget
}

export interface TableCell {
  x: number
  /** f(x), or null for a vertical line. */
  value: Rational | null
  /** f(x) as LaTeX, or null. */
  latex: string | null
  /** Labels of the points with this x, e.g. ["P"]. */
  points: string[]
}

export function linePointsProblems(widget: LinePointsWidget): string[] {
  const at = 'line-points'
  const problems = commonLineProblems(widget)
  if (problems.length > 0) return problems
  const window = widgetWindow(widget)
  if (widget.points.length !== 2) return [`${at}: needs exactly two points`]
  widget.points.forEach(([x, y], i) => {
    const label = POINT_LABELS[i] ?? '?'
    if (!isWhole(x) || !isWhole(y)) problems.push(`${at}: ${label} must have whole coordinates`)
    else if (!inWindow(window, { x, y })) problems.push(`${at}: ${label}(${x}|${y}) lies outside the window`)
  })
  const [p, q] = widget.points
  if (p[0] === q[0] && p[1] === q[1]) problems.push(`${at}: P and Q must be different points`)
  const table = widget.table
  if (table !== undefined && table !== false) problems.push(...tableProblems(at, table))
  if (widget.target) {
    problems.push(...targetProblems(at, widget.target, window))
    if (problems.length === 0 && matchesStart(widget)) problems.push(`${at}: target equals the start`)
  }
  return problems
}

/** Problems of the x values of a table of values; also used by `value-table`. */
export function tableProblems(at: string, table: readonly number[]): string[] {
  const problems: string[] = []
  if (table.length < 1 || table.length > TABLE_MAX) problems.push(`${at}: table needs 1 to ${TABLE_MAX} x values`)
  if (table.some((x) => !isWhole(x) || Math.abs(x) > TABLE_LIMIT)) {
    problems.push(`${at}: table x values must be whole numbers within −${TABLE_LIMIT}…${TABLE_LIMIT}`)
  }
  if (new Set(table).size !== table.length) problems.push(`${at}: table x values must be different`)
  return problems
}

function matchesStart(widget: LinePointsWidget): boolean {
  const [[px, py], [qx, qy]] = widget.points
  return widget.target !== undefined && matchesTarget(lineThrough({ x: px, y: py }, { x: qx, y: qy }), widget.target)
}

const toRational = (value: Rational | number): Rational => (value instanceof Rational ? value : Rational.of(value))

/** Assumes a widget without problems. */
export function buildLinePoints(widget: LinePointsWidget): LinePointsModel {
  const [[px, py], [qx, qy]] = widget.points
  return {
    name: widgetName(widget),
    window: widgetWindow(widget),
    start: [
      { x: px, y: py },
      { x: qx, y: qy },
    ],
    table: widget.table === false ? [] : (widget.table ?? DEFAULT_TABLE),
    target: widget.target,
  }
}

/** The line through P and Q, or null if they are the same point. */
export function lineThrough(p: GridPoint, q: GridPoint): PlaneLine | null {
  const through = lineThroughPoints(point(p.x, p.y), point(q.x, q.y))
  return through.kind === 'same-point' ? null : through
}

/** The table of values for the line; points P and Q mark the columns with their x. */
export function tableCells(line: PlaneLine, xs: readonly number[], points: readonly [GridPoint, GridPoint]): TableCell[] {
  return xs.map((x) => {
    const value = line.kind === 'function' ? toRational(line.m).mul(Rational.of(x)).add(toRational(line.n)) : null
    return {
      x,
      value,
      latex: value ? numberToLatex(value) : null,
      points: POINT_LABELS.filter((_, i) => points[i]?.x === x),
    }
  })
}

/** Shown instead of the equation's meaning for a vertical line. */
export function verticalNote(line: Extract<PlaneLine, { kind: 'vertical' }>): string {
  const x = formatNumber(toRational(line.x).toNumber())
  return `Senkrechte Gerade: keine Funktion, denn zu x = ${x} gehören viele y-Werte.`
}

/** Added to the announcement after a move: `Gerade f(x) = 2x − 3` or the note for a vertical line. */
export function lineAnnouncement(line: PlaneLine | null, name: string): string {
  if (!line) return ''
  if (line.kind === 'vertical') return `${lineEquationText(line, name)}. ${verticalNote(line)}`
  return `Gerade ${lineEquationText(line, name)}`
}

/** LaTeX of the start state (equation and table), for `deckLatex`. */
export function linePointsLatex(model: LinePointsModel): string[] {
  const line = lineThrough(...model.start)
  if (!line) return []
  const cells = tableCells(line, model.table, model.start).flatMap((c) => (c.latex ? [c.latex] : []))
  return [lineLatex(line, model.name), ...cells]
}
