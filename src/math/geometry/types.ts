import type { Equation, EquationTask } from '../equations/types'
import type { Point } from '../functions/types'
import type { Rational } from '../rational'
import type { Rng } from '../random'
import type { SubtopicId } from '../tasks/types'

/** The figures of the topic "Vierecke und Flächen". */
export type ShapeKind = 'parallelogram' | 'triangle' | 'rhombus' | 'trapezoid'

/**
 * Letters for lengths: g (Grundseite), h (Höhe), a–d (Seiten) and e, f
 * (Diagonalen der Raute). They are the variables of formulas and calculations.
 */
export type Letter = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'

/** Lengths in cm by letter, e.g. { g: 6, h: 4 }; whole numbers or ending in ,5. */
export type Measures = Readonly<Partial<Record<Letter, Rational>>>

/** What a calculation computes: the area A (in cm²) or the perimeter u (in cm). */
export type Quantity = 'area' | 'perimeter'

/** Units are chosen with a key, not typed. */
export type Unit = 'cm' | 'cm²'

/** Coordinates in cm for drawing a figure, y pointing up. Floating point: only for drawing, never for checks. */
export type Vec = readonly [x: number, y: number]

/** A labelled length of a figure, e.g. "g = 6 cm" along AB or the dashed height h. */
export interface FigureLabel {
  letter: Letter
  /** Exact length in cm. */
  value: Rational
  /** False for the length asked for in a Rückwärts task: the figure shows "h = ?". */
  given: boolean
  kind: 'side' | 'height' | 'diagonal'
  /** Segment that carries the label; for the height from the vertex to the foot on the line AB. */
  from: Vec
  to: Vec
}

/**
 * Figure of a calculation task, true to scale. The vertices A, B, C(, D) run
 * counterclockwise; except for a rhombus given by its diagonals, A = (0|0)
 * and B lie on the x-axis. A height may end outside AB (obtuse triangle): then
 * the figure needs the extension of AB.
 */
export interface TaskFigure {
  shape: ShapeKind
  vertices: readonly Vec[]
  labels: readonly FigureLabel[]
  /** Rhombus with labelled diagonals e = AC and f = BD. */
  diagonals: boolean
}

/** What a calculation (Rechenkette) must compute, e.g. `A = g · h : 2 = 6 · 4 : 2 = 12`. */
export interface CalculationKey {
  quantity: Quantity
  /** Expected result. */
  value: Rational
  unit: Unit
  /** The letters the learner may use, with their lengths. */
  measures: Measures
  /** Model answer without unit, e.g. `A = g·h/2 = 6·4/2 = 12`; accepted by `checkCalculation`. */
  answer: string
}

/** One line of a worked solution; `text` can be shown without KaTeX. */
export interface GeometrySolutionLine {
  text: string
  latex: string
  /** German explanation. */
  note?: string
}

interface TaskBase {
  topic: SubtopicId
  /** Generator variant, e.g. "area-obtuse"; useful for tests and later statistics. */
  variant: string
  /** Identity of the exercise; used to avoid repetitions. */
  key: string
  /** German instruction in plain text, including the given data. */
  instruction: string
  shape: ShapeKind
  /** Worked solution. */
  steps: GeometrySolutionLine[]
}

/**
 * Exercise about areas and perimeters. `kind` says what the learner does:
 * - `area`, `perimeter`: calculate A or u as a chain (`checkCalculation`)
 *   and choose the unit
 * - `reverse`: insert into the area formula (`checkSubstitution`), then solve
 *   `equation` line by line as in the practice of linear equations; the last
 *   line is `unknown = result`, then the unit
 * - `draw-height`: set the foot F of the height from `vertices[top]` onto the
 *   line through `vertices[base]` (`checkFoot`), then calculate the area
 * - `complete-shape`: set the missing vertex `wanted` (`checkDrawing`)
 * - `draw-area`: set `wanted` so that the figure has the area `area`
 *   (`checkDrawing`); `solution` is one of many solutions
 *
 * Drawing tasks use grid points of GEOMETRY_WINDOW, one unit = 1 cm.
 */
export type GeometryTask =
  | (TaskBase & { kind: 'area'; figure: TaskFigure; calculation: CalculationKey })
  | (TaskBase & { kind: 'perimeter'; figure: TaskFigure; calculation: CalculationKey })
  | (TaskBase & {
      kind: 'reverse'
      figure: TaskFigure
      /** The length asked for; also the variable of `equation`. */
      unknown: Letter
      /** Given area in cm². */
      value: Rational
      /** The known lengths (the letters of the formula without `unknown`). */
      measures: Measures
      /** Expected first line: the formula with the known numbers inserted, e.g. `12 = 6·h/2`. */
      substitution: Equation
      /** `substitution` as an equation task (printed with decimals), solved line by line. */
      equation: EquationTask
      result: Rational
      unit: Unit
    })
  | (TaskBase & {
      kind: 'draw-height'
      /** Vertices A, B, C(, D). */
      vertices: readonly Point[]
      /** Indices of the base AB. */
      base: readonly [number, number]
      /** Index of the vertex the height starts at. */
      top: number
      /** Name of the point to set ("F"). */
      wanted: string
      foot: Point
      /** True if the foot lies on the extension of AB. */
      outside: boolean
      /** The area calculation after reading g and h (or a, c and h) in the grid. */
      calculation: CalculationKey
    })
  | (TaskBase & {
      kind: 'complete-shape'
      /** Vertices A, B, C. */
      given: readonly Point[]
      /** Name of the vertex to set ("D"). */
      wanted: string
      /** All vertices A, B, C, D. */
      solution: readonly Point[]
      area: Rational
    })
  | (TaskBase & {
      kind: 'draw-area'
      /** Vertices A, B. */
      given: readonly Point[]
      /** "C" (triangle) or "D" (parallelogram; C follows from A, B and D). */
      wanted: string
      /** One solution: all vertices. */
      solution: readonly Point[]
      area: Rational
    })

export type GeometryTaskKind = GeometryTask['kind']

export type GeometryTaskGenerator = (rng: Rng) => GeometryTask
