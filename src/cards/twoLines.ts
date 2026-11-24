import {
  equationToLatex,
  functionEquationToLatex,
  functionEquationToText,
  functionExpr,
  functionToLatex,
  functionToText,
  intersect,
  linearFunction,
  pointToLatex,
  Rational,
  readFunction,
  solutionSetToLatex,
  solveEquation,
  type Equation,
  type Expr,
  type Intersection,
  type LinearFunction,
  type Point,
  type Polynomial,
} from '../math'
import { DEFAULT_WINDOW, displayText, formatNumber, inWindow, planeWindowProblems, type PlaneLine, type PlaneWindow } from '../plane'
import { isFunctionName, isWhole } from './lineCommon'
import { SLOPE_LIMIT, SLOPE_RANGE, type LineParameter, type SliderModel } from './lineSliders'
import type { LineCoefficients, TwoLinesVary, TwoLinesWidget } from './types'

/**
 * Logic of the `two-lines` widget: two lines f and g, the intersection
 * (point, parallel, identical), the sliders for g and the texts. Pure; the
 * view is src/components/cards/TwoLinesView.tsx.
 */

export const DEFAULT_NAMES = ['f', 'g'] as const

/** Label of the intersection point. */
export const INTERSECTION_LABEL = 'S'

export interface TwoLinesModel {
  names: readonly [string, string]
  window: PlaneWindow
  f: LinearFunction
  /** Sliders (or fixed values) of g. */
  m: SliderModel
  n: SliderModel
  /** g as written in the widget (only for a fixed g given as a term). */
  gExpr?: Expr
  equate: boolean
}

export type TwoLinesValues = LineCoefficients

const VARY: readonly TwoLinesVary[] = ['none', 'm', 'n', 'both']

/** Slope and y-intercept of a linear polynomial in x, or null if it is not linear. */
export function linearCoefficients(poly: Polynomial): { m: Rational; n: Rational } | null {
  let m = Rational.ZERO
  let n = Rational.ZERO
  for (const term of poly.terms()) {
    const [first, ...rest] = term.mono
    if (!first) n = term.coef
    else if (rest.length === 0 && first[0] === 'x' && first[1] === 1) m = term.coef
    else return null
  }
  return { m, n }
}

function readG(widget: TwoLinesWidget): { expr: Expr; m: number; n: number } | string {
  const g = widget.g
  if (typeof g !== 'string') return 'g must be a term'
  const read = readFunction(g)
  if (!read.ok) return `g "${g}" does not parse: ${read.error.message}`
  const gName = widget.names?.[1] ?? DEFAULT_NAMES[1]
  if (read.name !== undefined && read.name !== gName) return `g "${g}" uses the name ${read.name} instead of ${gName}`
  const coefficients = linearCoefficients(read.polynomial)
  if (!coefficients || !coefficients.m.isInteger() || !coefficients.n.isInteger()) {
    return `g "${g}" must be linear with whole m and n`
  }
  return { expr: read.expr, m: coefficients.m.toNumber(), n: coefficients.n.toNumber() }
}

function varies(widget: TwoLinesWidget, parameter: LineParameter): boolean {
  const vary = widget.vary ?? 'none'
  return vary === 'both' || vary === parameter
}

function sliderModel(widget: TwoLinesWidget, parameter: LineParameter, value: number): SliderModel {
  const window = widget.window ?? DEFAULT_WINDOW
  const [min, max] = widget.gRange?.[parameter] ?? (parameter === 'm' ? SLOPE_RANGE : window.y)
  return { parameter, value, min, max, varies: varies(widget, parameter) }
}

/** Problems of the widget (empty if it is fine); `validateDeck` reports them with the card. */
export function twoLinesProblems(widget: TwoLinesWidget): string[] {
  const at = 'two-lines'
  const problems: string[] = []
  const names = widget.names ?? DEFAULT_NAMES
  if (names.length !== 2 || !names.every(isFunctionName)) {
    problems.push(`${at}: names must be two lower-case letters other than x and y`)
  } else if (names[0] === names[1]) problems.push(`${at}: names of f and g must be different`)
  if (widget.window) problems.push(...planeWindowProblems(widget.window).map((p) => `${at}: window: ${p}`))
  if (widget.vary !== undefined && !VARY.includes(widget.vary)) problems.push(`${at}: vary must be none, m, n or both`)
  if (problems.length > 0) return problems

  const window = widget.window ?? DEFAULT_WINDOW
  const { f } = widget
  if (!isWhole(f.m) || !isWhole(f.n)) problems.push(`${at}: m and n of f must be whole numbers`)
  else {
    if (Math.abs(f.m) > SLOPE_LIMIT) problems.push(`${at}: m of f must stay within −${SLOPE_LIMIT}…${SLOPE_LIMIT}`)
    if (f.n < window.y[0] || f.n > window.y[1]) problems.push(`${at}: n of f must lie inside the y-range of the window`)
  }

  let g: LineCoefficients
  if (typeof widget.g === 'string') {
    if ((widget.vary ?? 'none') !== 'none') return [...problems, `${at}: g as a term needs vary none`]
    const read = readG(widget)
    if (typeof read === 'string') return [...problems, `${at}: ${read}`]
    g = read
  } else {
    g = widget.g
    if (!isWhole(g.m) || !isWhole(g.n)) return [...problems, `${at}: m and n of g must be whole numbers`]
  }

  for (const slider of [sliderModel(widget, 'm', g.m), sliderModel(widget, 'n', g.n)]) {
    const p = slider.parameter
    if (!slider.varies) continue
    if (!isWhole(slider.min) || !isWhole(slider.max)) {
      problems.push(`${at}: range of ${p} must have whole numbers`)
      continue
    }
    if (slider.min >= slider.max) problems.push(`${at}: range of ${p} is empty (${slider.min}…${slider.max})`)
    if (slider.value < slider.min || slider.value > slider.max) {
      problems.push(`${at}: ${p} = ${slider.value} of g lies outside its range ${slider.min}…${slider.max}`)
    }
  }
  const m = sliderModel(widget, 'm', g.m)
  if (m.varies ? m.min < -SLOPE_LIMIT || m.max > SLOPE_LIMIT : Math.abs(m.value) > SLOPE_LIMIT) {
    problems.push(`${at}: m of g must stay within −${SLOPE_LIMIT}…${SLOPE_LIMIT}`)
  }
  const n = sliderModel(widget, 'n', g.n)
  const [nLow, nHigh] = n.varies ? [n.min, n.max] : [n.value, n.value]
  if (nLow < window.y[0] || nHigh > window.y[1]) problems.push(`${at}: n of g must stay inside the y-range of the window`)

  if (problems.length === 0 && !m.varies && !n.varies) {
    const result = intersect(linearFunction('f', f.m, f.n), linearFunction('g', g.m, g.n))
    if (result.kind === 'point' && !pointInWindow(window, result.point)) {
      problems.push(`${at}: the intersection ${intersectionPointText(result.point)} lies outside the window`)
    }
  }
  return problems
}

/** Assumes a widget without problems. */
export function buildTwoLines(widget: TwoLinesWidget): TwoLinesModel {
  const names = widget.names ?? DEFAULT_NAMES
  const read = typeof widget.g === 'string' ? readG(widget) : null
  const g = read && typeof read !== 'string' ? read : (widget.g as LineCoefficients)
  return {
    names: [names[0], names[1]],
    window: widget.window ?? DEFAULT_WINDOW,
    f: linearFunction(names[0], widget.f.m, widget.f.n),
    m: sliderModel(widget, 'm', g.m),
    n: sliderModel(widget, 'n', g.n),
    gExpr: read && typeof read !== 'string' ? read.expr : undefined,
    equate: widget.equate ?? false,
  }
}

export function initialTwoLinesValues(model: TwoLinesModel): TwoLinesValues {
  return { m: model.m.value, n: model.n.value }
}

export function gFunction(model: TwoLinesModel, values: TwoLinesValues): LinearFunction {
  return linearFunction(model.names[1], values.m, values.n)
}

export function functionLine(fn: LinearFunction): PlaneLine {
  return { kind: 'function', m: fn.m, n: fn.n }
}

export function twoLinesResult(model: TwoLinesModel, values: TwoLinesValues): Intersection {
  return intersect(model.f, gFunction(model, values))
}

/** True if the (possibly fractional) point lies inside the window. */
export function pointInWindow(window: PlaneWindow, p: Point): boolean {
  return inWindow(window, { x: p.x.toNumber(), y: p.y.toNumber() })
}

/** True if g is still shown as written in the widget (the term was given and nothing moved). */
function showsGExpr(model: TwoLinesModel, values: TwoLinesValues): boolean {
  return model.gExpr !== undefined && values.m === model.m.value && values.n === model.n.value
}

// ---------------------------------------------------------------------------
// Texts (German, with a real minus) and LaTeX

/** A number with a real minus, fractions as `−2/3`. */
export function rationalText(value: Rational): string {
  const abs = value.abs()
  const digits = abs.isInteger() ? abs.num.toString() : `${abs.num}/${abs.den}`
  return value.sign() < 0 ? `−${digits}` : digits
}

/** `S(2|5)`, `S(2/3|7/3)`. */
export function intersectionPointText(p: Point): string {
  return `${INTERSECTION_LABEL}(${rationalText(p.x)}|${rationalText(p.y)})`
}

export function fText(model: TwoLinesModel): string {
  return displayText(functionToText(model.f))
}

export function gText(model: TwoLinesModel, values: TwoLinesValues): string {
  if (showsGExpr(model, values) && model.gExpr) return displayText(functionEquationToText(model.names[1], model.gExpr))
  return displayText(functionToText(gFunction(model, values)))
}

export function fLatex(model: TwoLinesModel): string {
  return functionToLatex(model.f)
}

export function gLatex(model: TwoLinesModel, values: TwoLinesValues): string {
  if (showsGExpr(model, values) && model.gExpr) return functionEquationToLatex(model.names[1], model.gExpr)
  return functionToLatex(gFunction(model, values))
}

/** The equation f(x) = g(x) and its solution set as LaTeX. */
export function equateLatex(model: TwoLinesModel, values: TwoLinesValues): { equation: string; solution: string } {
  const right = showsGExpr(model, values) && model.gExpr ? model.gExpr : functionExpr(gFunction(model, values))
  const equation: Equation = { left: functionExpr(model.f), right }
  const set = solveEquation(equation)
  // Both sides are linear in x, so there always is a solution set.
  if (!set) throw new RangeError('Two linear functions always give a linear equation')
  return { equation: equationToLatex(equation), solution: solutionSetToLatex(set) }
}

/** `S(2 \mid 5)`, or null without an intersection point. */
export function intersectionLatex(result: Intersection): string | null {
  return result.kind === 'point' ? pointToLatex(result.point, INTERSECTION_LABEL) : null
}

/** Status below the plane (for a point the text comes after the typeset point). */
export function resultText(model: TwoLinesModel, result: Intersection): string {
  const [f, g] = model.names
  switch (result.kind) {
    case 'point':
      return pointInWindow(model.window, result.point) ? '' : 'S liegt außerhalb des sichtbaren Bereichs.'
    case 'parallel':
      return `${f} und ${g} haben dieselbe Steigung, aber verschiedene y-Achsenabschnitte: Sie sind parallel und haben keinen Schnittpunkt.`
    case 'identical':
      return `${f} und ${g} sind identisch: Alle Punkte sind gemeinsam.`
  }
}

/** Short form of the result for the value text of the sliders. */
export function shortResult(model: TwoLinesModel, result: Intersection): string {
  switch (result.kind) {
    case 'point': {
      const text = `Schnittpunkt ${intersectionPointText(result.point)}`
      return pointInWindow(model.window, result.point) ? text : `${text}, außerhalb des Fensters`
    }
    case 'parallel':
      return 'parallel, kein Schnittpunkt'
    case 'identical':
      return 'identisch, alle Punkte gemeinsam'
  }
}

/** Label of a slider of g, e.g. `Steigung m von g`. */
export function gSliderLabel(parameter: LineParameter, name: string): string {
  return parameter === 'm' ? `Steigung m von ${name}` : `y-Achsenabschnitt n von ${name}`
}

/** Value for assistive technology, e.g. `n = 3, g(x) = −x + 3; Schnittpunkt S(1|3)`. */
export function twoLinesValueText(parameter: LineParameter, values: TwoLinesValues, model: TwoLinesModel): string {
  const result = twoLinesResult(model, values)
  return `${parameter} = ${formatNumber(values[parameter])}, ${gText(model, values)}; ${shortResult(model, result)}`
}

/** LaTeX of the start state, for `deckLatex`. */
export function twoLinesLatex(model: TwoLinesModel): string[] {
  const values = initialTwoLinesValues(model)
  const latex = [fLatex(model), gLatex(model, values)]
  if (model.equate) {
    const { equation, solution } = equateLatex(model, values)
    latex.push(equation, solution)
  }
  const point = intersectionLatex(twoLinesResult(model, values))
  if (point) latex.push(point)
  return latex
}
