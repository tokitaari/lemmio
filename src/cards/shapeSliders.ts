import {
  buildAreaTask,
  buildPerimeterTask,
  formulaFor,
  formulaLetters,
  geometryNumberToText,
  QUANTITY_SYMBOL,
  toLength,
  type GeometryTask,
  type Lengths,
  type Letter,
  type Quantity,
  type ShapeKind,
  type TaskFigure,
} from '../math'
import { layoutShape, type ShapeBounds } from '../shapes'
import type { ShapeMeasure, ShapeSlidersWidget } from './types'

/**
 * Logic of the `shape-sliders` widget: sliders for the lengths of a figure,
 * checks, the figure and the formula with the numbers inserted. The view is
 * src/components/cards/ShapeSlidersView.tsx.
 */

const SHAPES: readonly ShapeKind[] = ['parallelogram', 'triangle', 'rhombus', 'trapezoid']

/** Lengths stay within 1…12 cm, so every figure fits a narrow screen. */
export const SHAPE_LENGTH_LIMIT: readonly [number, number] = [1, 12]

/** Slider range when a measure gives none. */
export const SHAPE_SLIDER_RANGE: readonly [number, number] = [1, 10]

/** Step of every slider in cm. */
export const SHAPE_STEP = 0.5

/** Range of `offset` in cm. */
export const OFFSET_LIMIT: readonly [number, number] = [-6, 12]

export interface ShapeSliderModel {
  letter: Letter
  value: number
  min: number
  max: number
  /** Shown as a slider; otherwise the length is fixed. */
  varies: boolean
}

export interface ShapeSlidersModel {
  shape: ShapeKind
  quantity: Quantity
  /** In the order of the formula. */
  sliders: ShapeSliderModel[]
  offset?: number
  /** Frame (in cm) that holds the figure for every slider position. */
  frame: ShapeBounds
}

/** Current length by letter, in cm. */
export type ShapeValues = Readonly<Partial<Record<Letter, number>>>

/** The figure and the calculation for the current lengths. */
export interface ShapeCalculation {
  figure: TaskFigure
  /** `A = g·h/2 = 6·4/2 = 12 cm²` */
  text: string
  latex: string
  /** `A = 12 cm²`, for the value texts of the sliders. */
  result: string
}

/** Letters of the formula of a figure, e.g. g, h for the area of a triangle. */
export function shapeLetters(shape: ShapeKind, quantity: Quantity): Letter[] {
  return formulaLetters(formulaFor(shape, quantity))
}

const isHalfStep = (value: number) => Number.isFinite(value) && Number.isInteger(value / SHAPE_STEP)

function sliderOf(letter: Letter, measure: ShapeMeasure): ShapeSliderModel {
  if (typeof measure === 'number') return { letter, value: measure, min: measure, max: measure, varies: false }
  return {
    letter,
    value: measure.value,
    min: measure.min ?? SHAPE_SLIDER_RANGE[0],
    max: measure.max ?? SHAPE_SLIDER_RANGE[1],
    varies: true,
  }
}

function quantityOf(widget: ShapeSlidersWidget): Quantity {
  return widget.quantity ?? 'area'
}

/** Problems of the widget (empty if it is fine); `validateDeck` reports them with the card. */
export function shapeSlidersProblems(widget: ShapeSlidersWidget): string[] {
  const at = 'shape-sliders'
  if (!SHAPES.includes(widget.shape)) return [`${at}: unknown shape "${String(widget.shape)}"`]
  const quantity = quantityOf(widget)
  if (quantity !== 'area' && quantity !== 'perimeter') return [`${at}: quantity must be area or perimeter`]

  const problems: string[] = []
  const letters = shapeLetters(widget.shape, quantity)
  for (const letter of letters) {
    if (widget.measures[letter] === undefined) problems.push(`${at}: missing length ${letter}`)
  }
  for (const name of Object.keys(widget.measures)) {
    if (!(letters as string[]).includes(name)) problems.push(`${at}: the ${quantity} formula of a ${widget.shape} has no length ${name}`)
  }
  if (problems.length > 0) return problems

  const [low, high] = SHAPE_LENGTH_LIMIT
  const sliders = letters.map((letter) => sliderOf(letter, widget.measures[letter] ?? 0))
  for (const s of sliders) {
    const numbers = s.varies ? [s.value, s.min, s.max] : [s.value]
    if (!numbers.every(isHalfStep)) {
      problems.push(`${at}: ${s.letter} must be whole or end in ,5`)
      continue
    }
    if (s.min < low || s.max > high || s.value < low || s.value > high) problems.push(`${at}: ${s.letter} must stay within ${low}…${high} cm`)
    if (s.varies && s.min >= s.max) problems.push(`${at}: range of ${s.letter} is empty (${s.min}…${s.max})`)
    else if (s.value < s.min || s.value > s.max) problems.push(`${at}: ${s.letter} = ${s.value} lies outside its range ${s.min}…${s.max}`)
  }

  if (widget.offset !== undefined) {
    if (quantity !== 'area' || widget.shape === 'rhombus') problems.push(`${at}: offset is only for the area of a parallelogram, triangle or trapezoid`)
    else if (!isHalfStep(widget.offset) || widget.offset < OFFSET_LIMIT[0] || widget.offset > OFFSET_LIMIT[1]) {
      problems.push(`${at}: offset must be a multiple of 0,5 in ${OFFSET_LIMIT[0]}…${OFFSET_LIMIT[1]}`)
    }
  }
  if (problems.length > 0) return problems

  const range = Object.fromEntries(sliders.map((s) => [s.letter, s])) as Partial<Record<Letter, ShapeSliderModel>>
  const lo = (letter: Letter) => range[letter]?.min ?? 0
  const hi = (letter: Letter) => range[letter]?.max ?? 0
  if (widget.shape === 'trapezoid' && quantity === 'area' && !(hi('c') < lo('a'))) {
    problems.push(`${at}: c must stay shorter than a for every slider position`)
  }
  if (widget.shape === 'triangle' && quantity === 'perimeter') {
    const sides: Letter[] = ['a', 'b', 'c']
    for (const side of sides) {
      const others = sides.filter((s) => s !== side)
      if (!(hi(side) < others.reduce((sum, o) => sum + lo(o), 0))) {
        problems.push(`${at}: ${side} must stay shorter than the other two sides together for every slider position`)
      }
    }
  }
  if (widget.shape === 'trapezoid' && quantity === 'perimeter') {
    // The legs b, d and the difference s = a − c must form a triangle.
    const sLow = lo('a') - hi('c')
    const sHigh = hi('a') - lo('c')
    const legDifference = Math.max(hi('b') - lo('d'), hi('d') - lo('b'), 0)
    if (!(sLow > legDifference && sHigh < lo('b') + lo('d'))) {
      problems.push(`${at}: there is no trapezoid for every slider position (need |b − d| < a − c < b + d)`)
    }
  }
  return problems
}

/** Values of a slider used for the frame: its ends and its middle (on the 0,5 grid). */
function frameValues(s: ShapeSliderModel): number[] {
  if (!s.varies) return [s.value]
  return [...new Set([s.min, Math.round(s.min + s.max) / 2, s.max, s.value])]
}

function unionBounds(all: readonly ShapeBounds[]): ShapeBounds {
  return {
    minX: Math.min(...all.map((b) => b.minX)),
    minY: Math.min(...all.map((b) => b.minY)),
    maxX: Math.max(...all.map((b) => b.maxX)),
    maxY: Math.max(...all.map((b) => b.maxY)),
  }
}

function combinations(sliders: readonly ShapeSliderModel[]): ShapeValues[] {
  let result: Partial<Record<Letter, number>>[] = [{}]
  for (const s of sliders) result = result.flatMap((values) => frameValues(s).map((v) => ({ ...values, [s.letter]: v })))
  return result
}

/** Assumes a widget without problems. */
export function buildShapeSliders(widget: ShapeSlidersWidget): ShapeSlidersModel {
  const quantity = quantityOf(widget)
  const sliders = shapeLetters(widget.shape, quantity).map((letter) => sliderOf(letter, widget.measures[letter] ?? 0))
  const partial = { shape: widget.shape, quantity, sliders, offset: widget.offset }
  const frame = unionBounds(combinations(sliders).map((values) => layoutShape(shapeTaskFigure(partial, values)).bounds))
  return { ...partial, frame }
}

export function initialShapeValues(model: Pick<ShapeSlidersModel, 'sliders'>): ShapeValues {
  return Object.fromEntries(model.sliders.map((s) => [s.letter, s.value]))
}

function shapeTask(model: Pick<ShapeSlidersModel, 'shape' | 'quantity' | 'offset'>, values: ShapeValues): GeometryTask {
  const lengths: Lengths = values
  if (model.quantity === 'perimeter') return buildPerimeterTask(model.shape, lengths)
  return buildAreaTask(model.shape, lengths, model.offset === undefined ? {} : { offset: model.offset })
}

function shapeTaskFigure(model: Pick<ShapeSlidersModel, 'shape' | 'quantity' | 'offset'>, values: ShapeValues): TaskFigure {
  const task = shapeTask(model, values)
  if (task.kind !== 'area' && task.kind !== 'perimeter') throw new RangeError(`Unexpected task ${task.kind}`)
  return task.figure
}

/** Figure and formula for the current lengths, e.g. `A = g·h/2 = 6·4/2 = 12 cm²`. */
export function shapeCalculation(model: ShapeSlidersModel, values: ShapeValues): ShapeCalculation {
  const task = shapeTask(model, values)
  if (task.kind !== 'area' && task.kind !== 'perimeter') throw new RangeError(`Unexpected task ${task.kind}`)
  const line = task.steps[0]
  if (!line) throw new RangeError('A calculation task without a solution line')
  const { quantity, value, unit } = task.calculation
  return {
    figure: task.figure,
    text: line.text,
    latex: line.latex,
    result: `${QUANTITY_SYMBOL[quantity]} = ${geometryNumberToText(value)} ${unit}`,
  }
}

/** Names of the lengths next to the sliders. */
export const SHAPE_LENGTH_NAMES: Readonly<Record<Letter, string>> = {
  a: 'Seite a',
  b: 'Seite b',
  c: 'Seite c',
  d: 'Seite d',
  e: 'Diagonale e',
  f: 'Diagonale f',
  g: 'Grundseite g',
  h: 'Höhe h',
}

/** A length with its unit and a decimal comma, e.g. `6,5 cm`. */
export function lengthText(value: number): string {
  return `${geometryNumberToText(toLength(value))} cm`
}

/** Value text of a slider: the length and the new result, e.g. `g = 6,5 cm, A = 13 cm²`. */
export function shapeSliderValueText(letter: Letter, value: number, calculation: ShapeCalculation): string {
  return `${letter} = ${lengthText(value)}, ${calculation.result}`
}

/** Text of a fixed length, e.g. `Höhe h = 4 cm (fest)`. */
export function fixedLengthText(letter: Letter, value: number): string {
  return `${SHAPE_LENGTH_NAMES[letter]} = ${lengthText(value)} (fest)`
}

/** LaTeX of the start calculation, for `deckLatex`. */
export function shapeSlidersLatex(model: ShapeSlidersModel): string[] {
  return [shapeCalculation(model, initialShapeValues(model)).latex]
}
