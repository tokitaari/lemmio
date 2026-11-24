import { functionToLatex, linearFunction, numberToLatex, Rational } from '../math'
import { DEFAULT_WINDOW, lineText, planeWindowProblems, type PlaneLine, type PlaneWindow } from '../plane'
import type { LineTarget } from './types'

/**
 * Helpers shared by the line widgets (`line-sliders`, `slope-triangle`,
 * `line-points`): name and window of the function, target lines, equations
 * as text and LaTeX. Pure logic; the views live in src/components/cards.
 */

/** Name of the function when a widget gives none. */
export const DEFAULT_FUNCTION_NAME = 'f'

/** A function name is one lower-case letter; x and y are taken by the axes. */
const FUNCTION_NAME = /^[a-wz]$/

/** Fields every line widget has. */
export interface LineWidgetBase {
  kind: string
  name?: string
  window?: PlaneWindow
}

export function widgetName(widget: { name?: string }): string {
  return widget.name ?? DEFAULT_FUNCTION_NAME
}

export function widgetWindow(widget: { window?: PlaneWindow }): PlaneWindow {
  return widget.window ?? DEFAULT_WINDOW
}

/** Problems of name and window, prefixed with the widget kind. */
export function commonLineProblems(widget: LineWidgetBase): string[] {
  const problems: string[] = []
  if (widget.name !== undefined && !FUNCTION_NAME.test(widget.name)) {
    problems.push(`${widget.kind}: name "${widget.name}" must be a single lower-case letter other than x and y`)
  }
  if (widget.window) problems.push(...planeWindowProblems(widget.window).map((p) => `${widget.kind}: window: ${p}`))
  return problems
}

/** True for whole numbers (not NaN, not Infinity). */
export function isWhole(value: number): boolean {
  return Number.isInteger(value)
}

/** Problems of a target line: whole numbers, and n inside the window so the target is visible. */
export function targetProblems(kind: string, target: LineTarget, window: PlaneWindow): string[] {
  if (!isWhole(target.m) || !isWhole(target.n)) return [`${kind}: target m and n must be whole numbers`]
  if (target.n < window.y[0] || target.n > window.y[1]) return [`${kind}: target n = ${target.n} lies outside the window`]
  return []
}

export function targetLine(target: LineTarget): PlaneLine {
  return { kind: 'function', m: target.m, n: target.n }
}

const toRational = (value: Rational | number): Rational => (value instanceof Rational ? value : Rational.of(value))

/** True if the line is the graph of y = target.m · x + target.n. */
export function matchesTarget(line: PlaneLine | null, target: LineTarget): boolean {
  if (!line || line.kind !== 'function') return false
  return toRational(line.m).equals(Rational.of(target.m)) && toRational(line.n).equals(Rational.of(target.n))
}

/** Announced and shown when the line lies on the target. */
export const TARGET_REACHED = 'Geschafft: Die Gerade liegt auf der gestrichelten Zielgeraden.'

/** Shown while the target is not reached yet. */
export const TARGET_HINT = 'Ziel: Bringe die Gerade auf die gestrichelte Zielgerade.'

/** The equation as LaTeX: `f(x) = 2x - 3`, or `x = 4` for a vertical line. */
export function lineLatex(line: PlaneLine, name: string): string {
  if (line.kind === 'vertical') return `x = ${numberToLatex(toRational(line.x))}`
  return functionToLatex(linearFunction(name, line.m, line.n))
}

/** The equation as text with a real minus, e.g. `f(x) = 2x − 3`; vertical lines have no function name. */
export function lineEquationText(line: PlaneLine, name: string): string {
  return lineText(line, line.kind === 'function' ? name : undefined)
}
