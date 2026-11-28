import type { Markup } from '../content/types'
import type { Coordinates, FormRequirement, Letter, Quantity, ShapeKind } from '../math'
import type { PlaneWindow, Range } from '../plane'

/**
 * Explanations are decks of cards (similar to brilliant.org): one card at a
 * time, each with a short text, at most one interactive element and usually
 * one question that must be answered before moving on.
 *
 * Everything here is plain data, so decks can be checked in Node tests
 * (markup parses, claims are true, every question can be solved).
 */

export interface Card {
  /** Unique within its deck; stored progress refers to cards by id, so keep it stable when editing a deck. */
  id: string
  title: string
  /** Paragraphs. */
  body: Markup[]
  /** At most one interactive element, shown after the text. */
  widget?: CardWidget
  /** Question shown after the widget; "Weiter" stays locked until it is solved or the solution was revealed. */
  question?: CardQuestion
}

/**
 * Interactive elements. Each kind has its own component (see
 * src/components/cards/CardWidgetView.tsx); new kinds are added to this union.
 */
export type CardWidget =
  | TermStepsWidget
  | AreaModelWidget
  | BalanceWidget
  | EquationStepsWidget
  | LineSlidersWidget
  | SlopeTriangleWidget
  | LinePointsWidget
  | ValueTableWidget
  | TwoLinesWidget
  | ShapeSlidersWidget
  | ShapePointsWidget

/**
 * A transformation shown line by line: the start term, then `= term` per step
 * with an optional note. Every step must be equivalent to the start term.
 */
export interface TermStepsWidget {
  kind: 'term-steps'
  /** Start term in input syntax. */
  start: string
  steps: TermStep[]
  /** Accessible name of the list, e.g. "Lösungsweg". Default: "Umformung". */
  label?: string
}

export interface TermStep {
  /** Term in input syntax; multiplication dots in the source are kept when typeset. */
  term: string
  note?: Markup
}

/**
 * Area model: the product of two sums drawn as a rectangle whose sides are
 * split into the summands; every partial area is one product. A negative
 * summand is drawn as a strip cut off from the end of its side, so e.g.
 * `(a-b)^2` shows the square `a^2` minus two strips `ab` plus the corner
 * `b^2` that was cut off twice. Logic and checks: src/cards/areaModel.ts.
 */
export interface AreaModelWidget {
  kind: 'area-model'
  /** Summands of the first factor along the left edge (one row each), input syntax, e.g. `['x', '3']`. */
  first: string[]
  /** Summands of the second factor along the top edge (one column each), e.g. `['x', '-5']`. */
  second: string[]
  /**
   * - `expand`: the partial areas start empty and are revealed one by one, then like terms are combined.
   * - `factor`: the partial areas are given, the sides start as "?" and are revealed (factoring backwards).
   * - `explore`: drawn to scale; the learner drags the variable lengths and sees a numeric check.
   */
  mode: AreaModelMode
  /**
   * Lengths of the variables. Without lengths the model is a sketch (not to
   * scale); with lengths it is drawn to scale, which needs summands like `3`
   * or `2x`. Required for `explore`, where `min` and `max` set the drag range.
   */
  lengths?: Record<string, AreaLength>
  /** Accessible name of the calculation below the figure. Default: "Rechnung". */
  label?: string
}

export type AreaModelMode = 'expand' | 'factor' | 'explore'

/** Integer length of a variable; `min`/`max` are needed for `explore` only. */
export interface AreaLength {
  value: number
  min?: number
  max?: number
}

/**
 * Balance: a linear equation as a pair of scales. A box weighs x, a small
 * weight 1; negative terms are balloons that pull their pan up. Doing the
 * same on both sides keeps the balance level, doing it on one side only tips
 * it; dividing splits both pans into equal groups and keeps one. Logic and
 * checks: src/cards/balance.ts.
 */
export interface BalanceWidget {
  kind: 'balance'
  /**
   * The equation in input syntax, e.g. `3x + 2 = x + 8`: linear in one
   * variable with whole numbers, at most 6 x pieces and 12 unit pieces per
   * side. If it has exactly one solution, that must be a whole number ≥ 0
   * (it is the weight of a box). Equations without or with infinitely many
   * solutions work too: the balance then never or always is level.
   */
  equation: string
  /**
   * - `steps`: the given transformations are applied to both sides one by one.
   * - `explore`: the learner picks transformations from a palette and applies
   *   them to both sides or to one side only.
   */
  mode: BalanceMode
  /**
   * `steps` only: the transformations as written next to an equation, e.g.
   * `['| - x', '| - 2', '| : 2']`. Allowed are `+ T` and `- T` (whole numbers
   * and whole multiples of the variable), `: n` for n from 2 to 6 if all
   * pieces split into n equal groups, and `· (-1)`.
   */
  steps?: string[]
  /** `explore` only: the palette, same syntax as `steps`. Default: `+ 1`, `- 1`, `+ x`, `- x`, `: 2`, `: 3`. */
  operations?: string[]
  /** Accessible name of the lines below the figure. Default: "Umformungen". */
  label?: string
}

export type BalanceMode = 'steps' | 'explore'

/**
 * A linear equation solved line by line, in school notation: each line with
 * the operation written next to it, the next line below. Revealed step by
 * step; for `+`, `−`, `·` and `:` an intermediate line first shows the
 * operation written onto both sides (highlighted), then the simplified line
 * replaces it. Logic and checks: src/cards/equationSteps.ts.
 */
export interface EquationStepsWidget {
  kind: 'equation-steps'
  /** The equation in input syntax, e.g. `3x + 2 = x + 8`; linear in one variable. */
  start: string
  /** Each step applied to the line before must give its equation (checked with `checkStep`). */
  steps: EquationStepsLine[]
  /** Optional last line with the solution set, e.g. `L = {3}`, `L = { }`, `L = ℚ`; must be the right one. */
  solution?: string
  /** Accessible name of the list. Default: "Lösungsweg". */
  label?: string
}

export interface EquationStepsLine {
  /** As written next to an equation: `| - x`, `| : 2`, `| · (-1)`, `⇄` or `T` (Term umformen). */
  operation: string
  /** The line after the operation, in input syntax; how far it is simplified is up to the author. */
  equation: string
  /** Explanation shown next to the operation. */
  note?: Markup
}

/**
 * The graph of f(x) = mx + n with a slider for m and one for n; the
 * equation below follows. The point (0|n) on the y-axis is marked. With a
 * `target` a dashed target line is shown and reaching it is announced (it
 * does not lock "Weiter"; that is what questions are for). Logic and checks:
 * src/cards/lineSliders.ts.
 */
export interface LineSlidersWidget {
  kind: 'line-sliders'
  /** Slope; range −4…4 by default, at most −10…10. */
  m: LineSlider
  /** y-intercept; range: the y-range of the window by default, and never beyond it. */
  n: LineSlider
  /** Which sliders are shown; the other value stays fixed. Default: `both`. */
  vary?: 'both' | 'm' | 'n'
  target?: LineTarget
  /** Name of the function, one lower-case letter. Default: `f`. */
  name?: string
  /** Visible window; −8…8 on both axes by default. */
  window?: PlaneWindow
  /** Accessible name of the coordinate plane. */
  label?: string
}

/** Start value and range of a slider; whole numbers, step 1. */
export interface LineSlider {
  value: number
  min?: number
  max?: number
}

/** A line y = mx + n to reach, drawn dashed; whole numbers, n inside the window. */
export interface LineTarget {
  m: number
  n: number
}

/**
 * Slope triangle at the graph of f(x) = mx + n: from P go `run` units to
 * the right ("rechts") and m · run up ("hoch", negative if the line falls)
 * to reach Q; below, m = hoch : rechts. P can be dragged along the line;
 * with `resizable` Q can be dragged too, so the triangle changes its size
 * but not the slope. Logic and checks: src/cards/slopeTriangle.ts.
 */
export interface SlopeTriangleWidget {
  kind: 'slope-triangle'
  /** Slope, a whole number ≠ 0. */
  m: number
  /** y-intercept, a whole number. */
  n: number
  /** x of P at the start. Default: 0. */
  at?: number
  /** Width of the triangle at the start, 1…6. Default: 1. */
  run?: number
  /** Q is movable as well, which changes the width. */
  resizable?: boolean
  name?: string
  window?: PlaneWindow
  label?: string
}

/**
 * Two movable points P and Q with the line through them; the equation and a
 * table of values follow. Slopes may be fractions here; a vertical line is
 * named as no function. Logic and checks: src/cards/linePoints.ts.
 */
export interface LinePointsWidget {
  kind: 'line-points'
  /** Start positions of P and Q: different grid points in the window. */
  points: readonly [Coordinates, Coordinates]
  /** x values of the table of values (1–7 different whole numbers), or `false` for none. Default: −2…2. */
  table?: readonly number[] | false
  target?: LineTarget
  name?: string
  window?: PlaneWindow
  label?: string
}

/**
 * Table of values for f(x) = mx + n: the learner enters the y values, each
 * correct value puts its point into the coordinate plane. With `show:
 * 'equation'` the equation is given and the line appears once every value
 * is right; with `show: 'graph'` the line is given (values are read off the
 * graph) and the equation appears at the end. Logic and checks:
 * src/cards/valueTable.ts.
 */
export interface ValueTableWidget {
  kind: 'value-table'
  /** Slope, a whole number. */
  m: number
  /** y-intercept, a whole number. */
  n: number
  /** x values (1–7 different whole numbers); every point (x|f(x)) must lie in the window. Default: −2…2. */
  table?: readonly number[]
  /** x values from `table` whose y value is filled in already; at least one value stays open. */
  given?: readonly number[]
  /** What is given: the equation (default) or the graph. */
  show?: ValueTableShow
  name?: string
  window?: PlaneWindow
  label?: string
}

export type ValueTableShow = 'equation' | 'graph'

/**
 * Two lines f and g with their intersection: a point S, parallel (no
 * point) or identical (all points). With `vary` the slope and/or
 * y-intercept of g get sliders, so the case can change. Logic and checks:
 * src/cards/twoLines.ts.
 */
export interface TwoLinesWidget {
  kind: 'two-lines'
  /** f(x) = mx + n; whole numbers, n inside the y-range of the window. */
  f: LineCoefficients
  /**
   * g(x) = mx + n, or a term in x shown as written, e.g. `2(x + 1) - 3`
   * (linear, whole m and n; only with `vary: 'none'`).
   */
  g: LineCoefficients | string
  /** Sliders for g. Default: `none`. */
  vary?: TwoLinesVary
  /** Slider ranges of g; defaults like `line-sliders` (m −4…4, n the y-range). */
  gRange?: { m?: Range; n?: Range }
  /** Shows the equation f(x) = g(x) with its solution set. Default: false. */
  equate?: boolean
  /** Names of f and g, different lower-case letters. Default: f, g. */
  names?: readonly [string, string]
  window?: PlaneWindow
  label?: string
}

export type TwoLinesVary = 'none' | 'm' | 'n' | 'both'

/** Slope m and y-intercept n of a line. */
export interface LineCoefficients {
  m: number
  n: number
}

/**
 * A figure true to scale with sliders for its lengths (step 0,5 cm); the
 * figure and the formula with the numbers inserted follow, e.g.
 * `A = g·h = 6,5·4 = 26 cm²`. The figure keeps its frame, so nothing jumps
 * while a slider is dragged. Logic and checks: src/cards/shapeSliders.ts.
 */
export interface ShapeSlidersWidget {
  kind: 'shape-sliders'
  shape: ShapeKind
  /** Area (default) or perimeter. */
  quantity?: Quantity
  /**
   * Exactly the letters of the formula: area g, h (parallelogram, triangle),
   * e, f (rhombus), a, c, h (trapezoid); perimeter a, b (parallelogram),
   * a, b, c (triangle), a (rhombus), a, b, c, d (trapezoid). A number is a
   * fixed length, a `ShapeSlider` gets a slider. Lengths in cm, whole or ,5,
   * within 1…12; every slider position must give a figure.
   */
  measures: Readonly<Partial<Record<Letter, ShapeMeasure>>>
  /**
   * Area only, not for a rhombus: parallelogram and trapezoid how far the
   * top side is shifted to the right of A, triangle x of the apex C
   * (negative or beyond g: obtuse), in cm, a multiple of 0,5 in −6…12.
   * Default: the shape keeps its proportions (trapezoid isosceles).
   */
  offset?: number
  /** Accessible name in front of the description of the figure. */
  label?: string
}

/** A fixed length, or a slider with its start value and range (default 1…10). */
export type ShapeMeasure = number | ShapeSlider

export interface ShapeSlider {
  value: number
  min?: number
  max?: number
}

/**
 * A figure on the geometry grid (0…12 × 0…10, one square = 1 cm) with
 * movable vertices; the base AB stays horizontal, so g and h are whole
 * numbers. A stays where it is (for a rhombus the centre M). Movable:
 * parallelogram B and D (C follows), triangle B and C, rhombus C and D
 * (A and B follow, mirrored at M), trapezoid B, C and D (C follows D up and
 * down). Height, lengths and area follow every move. With a `target` area
 * the status says when it is reached (it does not lock "Weiter"). Logic and
 * checks: src/cards/shapePoints.ts.
 */
export interface ShapePointsWidget {
  kind: 'shape-points'
  shape: ShapeKind
  /**
   * Start vertices A, B, C(, D) counterclockwise, grid points of the grid.
   * AB is horizontal with y ≥ 1 (room for its label) and the top above AB;
   * a parallelogram has C = B + D − A, a trapezoid CD ∥ AB with C right of D.
   * A rhombus has the horizontal diagonal AC and the vertical diagonal BD
   * with the same midpoint M (a grid point), so e and f are even.
   */
  vertices: readonly Coordinates[]
  /** Area to reach in cm², a multiple of 0,5 other than the start area. */
  target?: number
  /** Accessible name of the grid. */
  label?: string
}

export type CardQuestion = ChoiceQuestion | TermQuestion

/** Single choice: exactly one option is correct. */
export interface ChoiceQuestion {
  kind: 'choice'
  prompt: Markup
  options: ChoiceOption[]
  /** Shown once the question is solved or revealed. */
  explanation?: Markup
}

export interface ChoiceOption {
  text: Markup
  correct?: true
  /** Shown when this (wrong) option is picked, e.g. which mistake leads to it. */
  feedback?: Markup
}

/**
 * Free term input, checked with `checkAnswer` like in the practice area:
 * equivalence to `answer`, then the required form.
 */
export interface TermQuestion {
  kind: 'term'
  prompt: Markup
  /** Optional term shown large below the prompt, in input syntax. */
  term?: string
  /** Model answer in input syntax; it must pass its own check (tested). */
  answer: string
  form: FormRequirement
  /** Letters for the input keys; default: the letters of `answer`. */
  variables?: string[]
  explanation?: Markup
}

/** A deck of cards for one subtopic (or a demo). */
export interface Deck {
  /** Storage key of the deck, e.g. the SubtopicId "algebra/terme/ausmultiplizieren". */
  id: string
  cards: Card[]
}
