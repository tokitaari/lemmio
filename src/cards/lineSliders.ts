import { formatNumber, type PlaneLine, type PlaneWindow, type Range } from '../plane'
import {
  commonLineProblems,
  isWhole,
  lineEquationText,
  lineLatex,
  targetProblems,
  widgetName,
  widgetWindow,
} from './lineCommon'
import type { LineSlider, LineSlidersWidget, LineTarget } from './types'

/**
 * Logic of the `line-sliders` widget: ranges of the sliders, checks and
 * texts. The view is src/components/cards/LineSlidersView.tsx.
 */

export type LineParameter = 'm' | 'n'

/** Default range of the slope slider. */
export const SLOPE_RANGE: Range = [-4, 4]

/** The slope slider never goes beyond −10…10; steeper lines leave the window almost at once. */
export const SLOPE_LIMIT = 10

export interface SliderModel {
  parameter: LineParameter
  value: number
  min: number
  max: number
  /** Shown as a slider; otherwise the value is fixed. */
  varies: boolean
}

export interface LineSlidersModel {
  name: string
  window: PlaneWindow
  m: SliderModel
  n: SliderModel
  target?: LineTarget
}

export interface LineValues {
  m: number
  n: number
}

function varies(widget: LineSlidersWidget, parameter: LineParameter): boolean {
  const vary = widget.vary ?? 'both'
  return vary === 'both' || vary === parameter
}

function sliderModel(widget: LineSlidersWidget, parameter: LineParameter): SliderModel {
  const slider: LineSlider = widget[parameter]
  const [min, max] = parameter === 'm' ? SLOPE_RANGE : widgetWindow(widget).y
  return { parameter, value: slider.value, min: slider.min ?? min, max: slider.max ?? max, varies: varies(widget, parameter) }
}

/** Problems of the widget (empty if it is fine); `validateDeck` reports them with the card. */
export function lineSlidersProblems(widget: LineSlidersWidget): string[] {
  const at = 'line-sliders'
  const problems = commonLineProblems(widget)
  if (widget.vary !== undefined && !['both', 'm', 'n'].includes(widget.vary)) problems.push(`${at}: vary must be both, m or n`)
  if (problems.length > 0) return problems

  const window = widgetWindow(widget)
  const sliders = { m: sliderModel(widget, 'm'), n: sliderModel(widget, 'n') }
  for (const slider of [sliders.m, sliders.n]) {
    const p = slider.parameter
    if (!isWhole(slider.value)) {
      problems.push(`${at}: ${p} must be a whole number`)
      continue
    }
    if (!slider.varies) continue
    if (!isWhole(slider.min) || !isWhole(slider.max)) {
      problems.push(`${at}: range of ${p} must have whole numbers`)
      continue
    }
    if (slider.min >= slider.max) problems.push(`${at}: range of ${p} is empty (${slider.min}…${slider.max})`)
    if (slider.value < slider.min || slider.value > slider.max) {
      problems.push(`${at}: ${p} = ${slider.value} lies outside its range ${slider.min}…${slider.max}`)
    }
  }
  const m = sliders.m
  if (m.varies ? m.min < -SLOPE_LIMIT || m.max > SLOPE_LIMIT : Math.abs(m.value) > SLOPE_LIMIT) {
    problems.push(`${at}: m must stay within −${SLOPE_LIMIT}…${SLOPE_LIMIT}`)
  }
  // With n inside the y-range, the line crosses the y-axis inside the window and is always visible.
  const n = sliders.n
  const [nLow, nHigh] = n.varies ? [n.min, n.max] : [n.value, n.value]
  if (nLow < window.y[0] || nHigh > window.y[1]) problems.push(`${at}: n must stay inside the y-range of the window`)

  if (widget.target && problems.length === 0) {
    const target = widget.target
    const targetIssues = targetProblems(at, target, window)
    problems.push(...targetIssues)
    if (targetIssues.length === 0) {
      for (const slider of [m, n]) {
        const want = target[slider.parameter]
        const reachable = slider.varies ? want >= slider.min && want <= slider.max : want === slider.value
        if (!reachable) problems.push(`${at}: target ${slider.parameter} = ${want} cannot be reached with the sliders`)
      }
      if (target.m === m.value && target.n === n.value) problems.push(`${at}: target equals the start`)
    }
  }
  return problems
}

/** Assumes a widget without problems. */
export function buildLineSliders(widget: LineSlidersWidget): LineSlidersModel {
  return {
    name: widgetName(widget),
    window: widgetWindow(widget),
    m: sliderModel(widget, 'm'),
    n: sliderModel(widget, 'n'),
    target: widget.target,
  }
}

export function initialValues(model: LineSlidersModel): LineValues {
  return { m: model.m.value, n: model.n.value }
}

export function valuesLine(values: LineValues): PlaneLine {
  return { kind: 'function', m: values.m, n: values.n }
}

/** Label of a slider. */
export const SLIDER_LABELS: Record<LineParameter, string> = { m: 'Steigung m', n: 'y-Achsenabschnitt n' }

/** Value for assistive technology: the value and the new equation, e.g. `m = 2, f(x) = 2x − 3`. */
export function sliderValueText(parameter: LineParameter, values: LineValues, name: string): string {
  return `${parameter} = ${formatNumber(values[parameter])}, ${lineEquationText(valuesLine(values), name)}`
}

/** LaTeX of the start equation, for `deckLatex`. */
export function lineSlidersLatex(model: LineSlidersModel): string[] {
  return [lineLatex(valuesLine(initialValues(model)), model.name)]
}
