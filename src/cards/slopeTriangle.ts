import {
  formatNumber,
  gridPointsOnLine,
  inWindow,
  type GridPoint,
  type PlaneLine,
  type PlanePosition,
  type PlaneWindow,
  type PointDrag,
} from '../plane'
import { commonLineProblems, isWhole, lineLatex, widgetName, widgetWindow } from './lineCommon'
import type { SlopeTriangleWidget } from './types'

/**
 * Logic of the `slope-triangle` widget: where P and Q may go, the triangle
 * between them, its labels "rechts" and "hoch", and the slope as
 * m = hoch : rechts. The view is src/components/cards/SlopeTriangleView.tsx.
 *
 * The triangle always starts at the left one of the two points, so "rechts"
 * is positive and "hoch" is negative for a falling line; m = hoch : rechts
 * then holds for every triangle (like `slopeFromPoints`).
 */

/** Widest triangle at the start. */
export const RUN_MAX = 6

/** Steepest slope; steeper lines leave the window almost at once. */
export const TRIANGLE_SLOPE_LIMIT = 10

export interface SlopeTriangleModel {
  name: string
  window: PlaneWindow
  m: number
  n: number
  line: PlaneLine
  resizable: boolean
  /** Width of the fixed triangle (and of the resizable one at the start). */
  run: number
  start: { p: GridPoint; q: GridPoint }
  /** How P moves: along the line; without `resizable` only as far as Q stays inside the window. */
  pDrag: PointDrag
  /** How Q moves if `resizable`. */
  qDrag?: PointDrag
}

/** The triangle between two points of the line. */
export interface SlopeTriangle {
  left: GridPoint
  right: GridPoint
  /** Corner with the right angle: below (above) the right point for a rising (falling) line. */
  corner: GridPoint
  /** "rechts", always ≥ 1. */
  run: number
  /** "hoch", negative for a falling line. */
  rise: number
}

const on = (m: number, n: number, x: number): GridPoint => ({ x, y: m * x + n })

export function slopeTriangleProblems(widget: SlopeTriangleWidget): string[] {
  const at = 'slope-triangle'
  const problems = commonLineProblems(widget)
  if (problems.length > 0) return problems
  const { m, n } = widget
  const x = widget.at ?? 0
  const run = widget.run ?? 1
  if (!isWhole(m) || !isWhole(n)) return [`${at}: m and n must be whole numbers`]
  if (m === 0) problems.push(`${at}: m must not be 0 (a horizontal line has no triangle)`)
  if (Math.abs(m) > TRIANGLE_SLOPE_LIMIT) problems.push(`${at}: m must stay within −${TRIANGLE_SLOPE_LIMIT}…${TRIANGLE_SLOPE_LIMIT}`)
  if (!isWhole(x)) problems.push(`${at}: at must be a whole number`)
  if (!isWhole(run) || run < 1 || run > RUN_MAX) problems.push(`${at}: run must be a whole number from 1 to ${RUN_MAX}`)
  if (problems.length > 0) return problems
  const window = widgetWindow(widget)
  if (!inWindow(window, on(m, n, x)) || !inWindow(window, on(m, n, x + run))) {
    problems.push(`${at}: the triangle from x = ${x} to x = ${x + run} does not fit into the window`)
  }
  return problems
}

/** Assumes a widget without problems. */
export function buildSlopeTriangle(widget: SlopeTriangleWidget): SlopeTriangleModel {
  const { m, n } = widget
  const window = widgetWindow(widget)
  const x = widget.at ?? 0
  const run = widget.run ?? 1
  const line: PlaneLine = { kind: 'function', m, n }
  const resizable = widget.resizable === true
  // Grid points of the line in the window have consecutive x values (m is a whole number).
  const onLine = gridPointsOnLine(line, window)
  const first = onLine[0]?.x ?? x
  const last = onLine.at(-1)?.x ?? x + run
  return {
    name: widgetName(widget),
    window,
    m,
    n,
    line,
    resizable,
    run,
    start: { p: on(m, n, x), q: on(m, n, x + run) },
    pDrag: resizable ? { kind: 'on-line', line } : { kind: 'on-line', line, range: [first, last - run] },
    qDrag: resizable ? { kind: 'on-line', line } : undefined,
  }
}

/** Q of the fixed triangle: `run` to the right of P on the line. */
export function fixedQ(model: SlopeTriangleModel, p: GridPoint): GridPoint {
  return on(model.m, model.n, p.x + model.run)
}

/** The triangle between P and Q, from the left one of them. P and Q must differ. */
export function slopeTriangle(p: GridPoint, q: GridPoint): SlopeTriangle {
  const [left, right] = p.x <= q.x ? [p, q] : [q, p]
  return { left, right, corner: { x: right.x, y: left.y }, run: right.x - left.x, rise: right.y - left.y }
}

// ---------------------------------------------------------------------------
// Texts

/** `rechts 2, hoch −4`. */
export function triangleText(t: SlopeTriangle): string {
  return `rechts ${formatNumber(t.run)}, hoch ${formatNumber(t.rise)}`
}

/** Accessible name of the drawing. */
export function triangleDescription(t: SlopeTriangle): string {
  return `Steigungsdreieck: ${triangleText(t)}`
}

/** `m = −2`. */
function slopeValue(t: SlopeTriangle): string {
  return formatNumber(t.rise / t.run)
}

/** `m = hoch : rechts = −4 : 2 = −2`. */
export function slopeText(t: SlopeTriangle): string {
  return `m = hoch : rechts = ${formatNumber(t.rise)} : ${formatNumber(t.run)} = ${slopeValue(t)}`
}

/** Added to the announcement after a move: `rechts 2, hoch −4, m = −2`. */
export function triangleAnnouncement(t: SlopeTriangle): string {
  return `${triangleText(t)}, m = ${slopeValue(t)}`
}

/** `m = \frac{\text{hoch}}{\text{rechts}} = \frac{-4}{2} = -2`. */
export function slopeLatex(t: SlopeTriangle): string {
  const value = t.rise / t.run
  return `m = \\frac{\\text{hoch}}{\\text{rechts}} = \\frac{${t.rise}}{${t.run}} = ${value}`
}

/** LaTeX of the start state, for `deckLatex`. */
export function slopeTriangleLatex(model: SlopeTriangleModel): string[] {
  return [lineLatex(model.line, model.name), slopeLatex(slopeTriangle(model.start.p, model.start.q))]
}

// ---------------------------------------------------------------------------
// Drawing (grid units; the view converts with `toView`)

export interface TriangleLabel {
  at: PlanePosition
  anchor: 'start' | 'middle' | 'end'
  text: string
}

/** Distances of the labels from their leg, and the room a "hoch" label needs on the right, in grid units. */
const LABEL = { gap: 0.7, aside: 0.35, width: 3.2, mark: 0.35 } as const

/**
 * Labels of the legs: "rechts" outside the triangle below (above) the
 * horizontal leg, "hoch" to the right of the vertical leg; each moves to the
 * inside when there is no room outside the window.
 */
export function triangleLabels(t: SlopeTriangle, window: PlaneWindow): { run: TriangleLabel; rise: TriangleLabel } {
  const rising = t.rise > 0
  const outside = rising ? t.left.y - LABEL.gap : t.left.y + LABEL.gap
  const fitsOutside = rising ? outside >= window.y[0] - 0.2 : outside <= window.y[1] + 0.5
  const runY = fitsOutside ? outside : rising ? t.left.y + LABEL.gap : t.left.y - LABEL.gap
  const riseRight = t.right.x + LABEL.width <= window.x[1] + 1
  return {
    run: { at: { x: (t.left.x + t.right.x) / 2, y: runY }, anchor: 'middle', text: `rechts ${formatNumber(t.run)}` },
    rise: {
      at: { x: riseRight ? t.right.x + LABEL.aside : t.right.x - LABEL.aside, y: (t.corner.y + t.right.y) / 2 },
      anchor: riseRight ? 'start' : 'end',
      text: `hoch ${formatNumber(t.rise)}`,
    },
  }
}

/** The small square marking the right angle, as three points inside the triangle. */
export function rightAngleMark(t: SlopeTriangle): PlanePosition[] {
  const s = LABEL.mark
  const dy = t.rise > 0 ? s : -s
  const c = t.corner
  return [
    { x: c.x - s, y: c.y },
    { x: c.x - s, y: c.y + dy },
    { x: c.x, y: c.y + dy },
  ]
}
