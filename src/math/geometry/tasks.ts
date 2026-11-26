import { add, num, times, v, type Expr } from '../ast'
import { equationToLatex, equationToText, sidePolynomials } from '../equations/equation'
import { buildEquationTask } from '../equations/tasks'
import type { Equation, EquationTask } from '../equations/types'
import { point } from '../functions/analysis'
import { pointToLatex, pointToText } from '../functions/print'
import type { Coordinates } from '../functions/tasks'
import type { Point } from '../functions/types'
import { pick, randInt, type Rng } from '../random'
import { Rational } from '../rational'
import { SERIES_LENGTH } from '../tasks'
import type { SubtopicId } from '../tasks/types'
import {
  buildFigure,
  parallelogramVertices,
  rhombusFromDiagonals,
  rhombusFromSide,
  trapezoidFromSides,
  trapezoidVertices,
  triangleFromSides,
  triangleVertices,
} from './figures'
import {
  areaFormula,
  calculationChain,
  calculationToLatex,
  calculationToText,
  DECIMAL,
  evaluateFormula,
  formulaFor,
  formulaLetters,
  insertMeasures,
  isLetter,
  length,
  numberText,
  QUANTITY_UNIT,
  unitToLatex,
  withUnit,
  withUnitLatex,
} from './formulas'
import {
  areParallel,
  classifyQuadrilateral,
  cross,
  exactDistance,
  footOfPerpendicular,
  isSimplePolygon,
  lineParameter,
  polygonArea,
} from './polygon'
import type {
  CalculationKey,
  GeometrySolutionLine,
  GeometryTask,
  GeometryTaskGenerator,
  GeometryTaskKind,
  Letter,
  Measures,
  Quantity,
  ShapeKind,
  Vec,
} from './types'

// `as const` keeps the literal types inside object literals (task.topic, register keys).
const PARALLELOGRAM = 'geometrie/vierecke-und-flaechen/parallelogramm' as const
const TRIANGLE = 'geometrie/vierecke-und-flaechen/dreieck' as const
const RHOMBUS = 'geometrie/vierecke-und-flaechen/raute' as const
const TRAPEZOID = 'geometrie/vierecke-und-flaechen/trapez' as const

const TOPIC_OF: Readonly<Record<ShapeKind, SubtopicId>> = {
  parallelogram: PARALLELOGRAM,
  triangle: TRIANGLE,
  rhombus: RHOMBUS,
  trapezoid: TRAPEZOID,
}

/** Grid of the drawing tasks: x from 0 to 12, y from 0 to 10; one unit = 1 cm. */
export const GEOMETRY_WINDOW = { x: [0, 12], y: [0, 10] } as const

/** Kinds without drawing; a series restricted to them replaces drawing slots by area tasks. */
export const CALCULATION_KINDS: readonly GeometryTaskKind[] = ['area', 'perimeter', 'reverse']

/** Lengths by letter as numbers (at most two decimals) or exact numbers, e.g. `{ g: 6.5, h: 4 }`. */
export type Lengths = Readonly<Partial<Record<Letter, number | Rational>>>

/** Shape parameter for the drawing of a figure (cm, floating point). */
export interface FigureOptions {
  /**
   * Parallelogram and trapezoid: how far the top side is shifted to the
   * right of A; triangle: x of the apex C (negative or beyond g for an
   * obtuse triangle). Ignored if a side (b, or a/b of a triangle) fixes it.
   */
  offset?: number
  variant?: string
}

const GENITIVE: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'des Parallelogramms',
  triangle: 'des Dreiecks',
  rhombus: 'der Raute',
  trapezoid: 'des Trapezes',
}

const INDEFINITE: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'Ein Parallelogramm',
  triangle: 'Ein Dreieck',
  rhombus: 'Eine Raute',
  trapezoid: 'Ein Trapez',
}

const DEFINITE: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'das Parallelogramm',
  triangle: 'das Dreieck',
  rhombus: 'die Raute',
  trapezoid: 'das Trapez',
}

const LENGTH_NAMES: Readonly<Record<Letter, string>> = {
  a: 'die Seite',
  b: 'die Seite',
  c: 'die Seite',
  d: 'die Seite',
  e: 'die Diagonale',
  f: 'die Diagonale',
  g: 'die Grundseite',
  h: 'die Höhe',
}

const AREA_NOTES: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'Flächeninhalt eines Parallelogramms: Grundseite mal Höhe.',
  triangle: 'Flächeninhalt eines Dreiecks: Grundseite mal Höhe, geteilt durch 2.',
  rhombus: 'Flächeninhalt einer Raute: Diagonale mal Diagonale, geteilt durch 2.',
  trapezoid: 'Flächeninhalt eines Trapezes: Summe der parallelen Seiten mal Höhe, geteilt durch 2.',
}

const PERIMETER_NOTES: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'Umfang: Je zwei Seiten sind gleich lang, also 2 · (a + b).',
  triangle: 'Umfang: die drei Seiten addieren.',
  rhombus: 'Umfang: Alle vier Seiten sind gleich lang, also 4 · a.',
  trapezoid: 'Umfang: die vier Seiten addieren.',
}

/** Lengths that may be shown in an area task without being needed (distractors). */
const DISTRACTORS: Readonly<Record<ShapeKind, readonly Letter[]>> = {
  parallelogram: ['b'],
  triangle: ['a', 'b'],
  rhombus: [],
  trapezoid: [],
}

const NAMES = ['A', 'B', 'C', 'D'] as const

/** "a, b und c" */
function joinList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} und ${parts[parts.length - 1]}`
}

function line(text: string, latex: string, note?: string): GeometrySolutionLine {
  return note === undefined ? { text, latex } : { text, latex, note }
}

function toMeasures(lengths: Lengths): Measures {
  const measures: Partial<Record<Letter, Rational>> = {}
  for (const [name, value] of Object.entries(lengths)) {
    if (!isLetter(name) || value === undefined) throw new RangeError(`Not a length: ${name}`)
    const exact = length(value)
    if (exact.sign() <= 0) throw new RangeError(`Lengths must be positive: ${name}`)
    measures[name] = exact
  }
  return measures
}

function only(measures: Measures, letters: readonly Letter[]): Measures {
  const out: Partial<Record<Letter, Rational>> = {}
  for (const letter of letters) {
    const value = measures[letter]
    if (value) out[letter] = value
  }
  return out
}

function required(measures: Measures, letter: Letter): number {
  const value = measures[letter]
  if (!value) throw new RangeError(`Missing length ${letter}`)
  return value.toNumber()
}

/** `g = 6,5 cm` */
function lengthText(letter: Letter, value: Rational): string {
  return `${letter} = ${withUnit(value, 'cm')}`
}

function lengthLine(letter: Letter, value: Rational, note: string): GeometrySolutionLine {
  return line(lengthText(letter, value), `${letter} = ${withUnitLatex(value, 'cm')}`, note)
}

function measuresKey(measures: Measures, letters: readonly Letter[]): string {
  return letters.map((letter) => `${letter} = ${numberText(measures[letter] ?? Rational.ZERO)}`).join(', ')
}

/** Calculation key and the worked line `A = g·h/2 = 6·4/2 = 12 cm²`. */
function calculation(
  quantity: Quantity,
  formula: Expr,
  measures: Measures,
  note: string,
): { key: CalculationKey; line: GeometrySolutionLine } {
  const chain = calculationChain(formula, measures)
  const unit = QUANTITY_UNIT[quantity]
  const answer = calculationToText(quantity, chain)
  return {
    key: { quantity, value: evaluateFormula(formula, measures), unit, measures, answer },
    line: line(`${answer} ${unit}`, `${calculationToLatex(quantity, chain)}\\,${unitToLatex(unit)}`, note),
  }
}

/** Letters labelled in an area task: the formula letters, then the distractors that have a length. */
function areaLetters(shape: ShapeKind, measures: Measures): Letter[] {
  const letters = formulaLetters(areaFormula(shape))
  for (const name of Object.keys(measures)) {
    if (!isLetter(name) || letters.includes(name)) continue
    if (!DISTRACTORS[shape].includes(name)) throw new RangeError(`A ${shape} has no extra length ${name} here`)
    letters.push(name)
  }
  return letters
}

/** Vertices of the figure of an area or Rückwärts task. */
function areaVertices(shape: ShapeKind, measures: Measures, offset: number | undefined): Vec[] {
  switch (shape) {
    case 'parallelogram': {
      const g = required(measures, 'g')
      const h = required(measures, 'h')
      const b = measures.b?.toNumber()
      if (b !== undefined && !(b > h)) throw new RangeError('The side b must be longer than the height')
      const shift = b !== undefined ? Math.sqrt(b * b - h * h) : (offset ?? Math.min(g / 3, 2))
      return parallelogramVertices(g, h, shift)
    }
    case 'triangle': {
      const g = required(measures, 'g')
      const h = required(measures, 'h')
      const a = measures.a?.toNumber()
      const b = measures.b?.toNumber()
      if ((a !== undefined && !(a > h)) || (b !== undefined && !(b > h))) {
        throw new RangeError('The sides a and b must be longer than the height')
      }
      let apex = offset ?? (2 * g) / 5
      if (b !== undefined) apex = Math.sqrt(b * b - h * h)
      else if (a !== undefined) apex = g - Math.sqrt(a * a - h * h)
      return triangleVertices(g, h, apex)
    }
    case 'rhombus':
      return rhombusFromDiagonals(required(measures, 'e'), required(measures, 'f'))
    case 'trapezoid': {
      const a = required(measures, 'a')
      const c = required(measures, 'c')
      if (!(c < a)) throw new RangeError('The side c must be shorter than a')
      return trapezoidVertices(a, c, required(measures, 'h'), offset ?? (a - c) / 2)
    }
  }
}

/**
 * Task "calculate the area", e.g. `buildAreaTask('triangle', { g: 6, h: 4 })`.
 * Extra sides in `lengths` (parallelogram: b; triangle: a, b) are shown as
 * distractors and fix the shape. Also used for fixed worked examples.
 *
 * @throws RangeError for missing or impossible lengths.
 */
export function buildAreaTask(shape: ShapeKind, lengths: Lengths, options: FigureOptions = {}): GeometryTask {
  const measures = toMeasures(lengths)
  const letters = areaLetters(shape, measures)
  const formula = areaFormula(shape)
  const shown = only(measures, letters)
  const figure = buildFigure(shape, areaVertices(shape, measures, options.offset), letters, shown)
  const outside = shape === 'triangle' && isObtuse(figure.vertices)
  const note = outside
    ? `${AREA_NOTES.triangle} Die Höhe liegt außerhalb, die Formel gilt trotzdem.`
    : AREA_NOTES[shape]
  const { key, line: result } = calculation('area', formula, shown, note)
  const data = joinList(letters.map((letter) => lengthText(letter, shown[letter] ?? Rational.ZERO)))
  return {
    kind: 'area',
    topic: TOPIC_OF[shape],
    variant: options.variant ?? 'example',
    key: `area: ${shape}, ${measuresKey(shown, letters)}`,
    instruction: `Berechne den Flächeninhalt ${GENITIVE[shape]} mit ${data}.`,
    shape,
    figure,
    calculation: key,
    steps: [result],
  }
}

/** True if the apex of a triangle lies outside the base (height outside). */
function isObtuse(vertices: readonly Vec[]): boolean {
  const apex = vertices[2]
  const b = vertices[1]
  return apex !== undefined && b !== undefined && (apex[0] < 0 || apex[0] > b[0])
}

/** Vertices of the figure of a perimeter task. */
function perimeterVertices(shape: ShapeKind, measures: Measures): Vec[] {
  switch (shape) {
    case 'parallelogram': {
      const a = required(measures, 'a')
      const b = required(measures, 'b')
      return parallelogramVertices(a, b * 0.9, b * Math.sqrt(1 - 0.81))
    }
    case 'triangle': {
      const vertices = triangleFromSides(required(measures, 'a'), required(measures, 'b'), required(measures, 'c'))
      if (!vertices) throw new RangeError('There is no triangle with these sides')
      return vertices
    }
    case 'rhombus':
      return rhombusFromSide(required(measures, 'a'))
    case 'trapezoid': {
      const vertices = trapezoidFromSides(
        required(measures, 'a'),
        required(measures, 'b'),
        required(measures, 'c'),
        required(measures, 'd'),
      )
      if (!vertices) throw new RangeError('There is no trapezoid with these sides')
      return vertices
    }
  }
}

/**
 * Task "calculate the perimeter", e.g. `buildPerimeterTask('triangle', { a: 5, b: 4, c: 3 })`.
 *
 * @throws RangeError for missing lengths or if there is no such figure.
 */
export function buildPerimeterTask(shape: ShapeKind, lengths: Lengths, options: FigureOptions = {}): GeometryTask {
  const formula = formulaFor(shape, 'perimeter')
  const letters = formulaLetters(formula)
  const measures = only(toMeasures(lengths), letters)
  const figure = buildFigure(shape, perimeterVertices(shape, measures), letters, measures)
  const { key, line: result } = calculation('perimeter', formula, measures, PERIMETER_NOTES[shape])
  const data = joinList(letters.map((letter) => lengthText(letter, measures[letter] ?? Rational.ZERO)))
  return {
    kind: 'perimeter',
    topic: TOPIC_OF[shape],
    variant: options.variant ?? 'example',
    key: `perimeter: ${shape}, ${measuresKey(measures, letters)}`,
    instruction: `Berechne den Umfang ${GENITIVE[shape]} mit ${data}.`,
    shape,
    figure,
    calculation: key,
    steps: [result],
  }
}

/**
 * Task "calculate a length from the area", e.g.
 * `buildReverseTask('triangle', { g: 6, h: 4 }, 'h')`: A = 12 cm² and g are
 * given, h is asked for. `lengths` holds all letters of the area formula.
 *
 * @throws RangeError for missing lengths or if `unknown` is not in the formula.
 */
export function buildReverseTask(
  shape: ShapeKind,
  lengths: Lengths,
  unknown: Letter,
  options: FigureOptions = {},
): GeometryTask {
  const formula = areaFormula(shape)
  const letters = formulaLetters(formula)
  if (!letters.includes(unknown)) throw new RangeError(`The area of a ${shape} does not depend on ${unknown}`)
  const all = only(toMeasures(lengths), letters)
  const result = all[unknown]
  if (!result) throw new RangeError(`Missing length ${unknown}`)
  const knownLetters = letters.filter((letter) => letter !== unknown)
  const known = only(all, knownLetters)
  const value = evaluateFormula(formula, all)
  const topic = TOPIC_OF[shape]
  const variant = options.variant ?? 'example'
  const substitution: Equation = { left: num(value), right: insertMeasures(formula, known) }
  const equation = buildEquationTask(topic, substitution.left, substitution.right, variant, DECIMAL)
  const figure = buildFigure(shape, areaVertices(shape, all, options.offset), letters, all, unknown)
  const givenParts = [
    `den Flächeninhalt A = ${withUnit(value, 'cm²')}`,
    ...knownLetters.map((letter) => `${LENGTH_NAMES[letter]} ${lengthText(letter, all[letter] ?? Rational.ZERO)}`),
  ]
  return {
    kind: 'reverse',
    topic,
    variant,
    key: `reverse: ${shape}, ${unknown}, A = ${numberText(value)}, ${measuresKey(known, knownLetters)}`,
    instruction: `${INDEFINITE[shape]} hat ${joinList(givenParts)}. Berechne ${LENGTH_NAMES[unknown]} ${unknown}.`,
    shape,
    figure,
    unknown,
    value,
    measures: known,
    substitution,
    equation,
    result,
    unit: 'cm',
    steps: [
      line(calculationToText('area', [formula]), calculationToLatex('area', [formula]), AREA_NOTES[shape]),
      line(
        equationToText(substitution, DECIMAL),
        equationToLatex(substitution, DECIMAL),
        'Den Flächeninhalt und die bekannten Längen einsetzen.',
      ),
      line(
        `${unknown} = ${withUnit(result, 'cm')}`,
        `${unknown} = ${withUnitLatex(result, 'cm')}`,
        `Die Gleichung nach ${unknown} auflösen.`,
      ),
    ],
  }
}

// Drawing tasks on the grid.

function gridPoints(coordinates: readonly Coordinates[]): Point[] {
  return coordinates.map(([x, y]) => point(x, y))
}

function vertexAt(points: readonly Point[], index: number): Point {
  const p = points[index]
  if (!p) throw new RangeError(`No vertex ${index}`)
  return p
}

function exactLength(p: Point, q: Point, what: string): Rational {
  const value = exactDistance(p, q)
  if (!value) throw new RangeError(`The length of ${what} is not a rational number`)
  return value
}

/** "A(1|2), B(7|2) und C(3|6)" */
function pointsText(points: readonly Point[]): string {
  return joinList(points.map((p, i) => pointToText(p, NAMES[i] ?? 'P')))
}

function pointLine(p: Point, label: string, note: string): GeometrySolutionLine {
  return line(pointToText(p, label), pointToLatex(p, label), note)
}

function shapeProblem(shape: ShapeKind, polygon: readonly Point[]): string | undefined {
  if (!isSimplePolygon(polygon)) return 'not a proper polygon'
  if (shape === 'triangle') return polygon.length === 3 ? undefined : 'a triangle has three vertices'
  if (polygon.length !== 4) return 'a quadrilateral has four vertices'
  const kind = classifyQuadrilateral(polygon)
  if (shape === 'parallelogram' && !kind.parallelogram) return 'not a parallelogram'
  if (shape === 'rhombus' && !kind.rhombus) return 'not a rhombus'
  const [a, b, c, d] = polygon
  if (shape === 'trapezoid' && !(a && b && c && d && areParallel(a, b, d, c))) return 'AB and CD are not parallel'
  return undefined
}

/**
 * Task "draw the height from vertex `top` onto AB, then calculate the area".
 * The base AB and the height must have rational lengths (axis-parallel base).
 *
 * @throws RangeError for an improper figure, a foot on a vertex or irrational lengths.
 */
export function buildDrawHeightTask(
  shape: 'triangle' | 'parallelogram' | 'trapezoid',
  coordinates: readonly Coordinates[],
  top: number,
  variant = 'example',
): GeometryTask {
  const vertices = gridPoints(coordinates)
  const problem = shapeProblem(shape, vertices)
  if (problem) throw new RangeError(`Not a ${shape}: ${problem}`)
  if (top < 2 || top >= vertices.length) throw new RangeError('The height starts at C or D')
  const a = vertexAt(vertices, 0)
  const b = vertexAt(vertices, 1)
  const apex = vertexAt(vertices, top)
  const foot = footOfPerpendicular(apex, a, b)
  const t = lineParameter(apex, a, b)
  if (t.isZero() || t.isOne()) throw new RangeError('The foot of the height must not be a vertex')
  const outside = t.sign() < 0 || t.compare(Rational.ONE) > 0
  const base = exactLength(a, b, 'AB')
  const height = exactLength(apex, foot, 'the height')
  const topName = NAMES[top] ?? 'C'
  const measures: Measures =
    shape === 'trapezoid'
      ? { a: base, c: exactLength(vertexAt(vertices, 2), vertexAt(vertices, 3), 'CD'), h: height }
      : { g: base, h: height }
  const { key, line: result } = calculation('area', areaFormula(shape), measures, AREA_NOTES[shape])
  const lengthLines =
    shape === 'trapezoid'
      ? [
          lengthLine('a', base, 'Länge der Seite AB (Kästchen zählen).'),
          lengthLine('c', measures.c ?? Rational.ZERO, 'Länge der Seite CD.'),
        ]
      : [lengthLine('g', base, 'Länge der Grundseite AB (Kästchen zählen).')]
  const name = shape === 'triangle' ? 'ABC' : 'ABCD'
  const parallel = shape === 'trapezoid' ? ' mit AB ∥ CD' : ''
  return {
    kind: 'draw-height',
    topic: TOPIC_OF[shape],
    variant,
    key: `draw-height: ${shape}, ${pointsText(vertices)}, ${topName}`,
    instruction:
      `Gegeben ist ${DEFINITE[shape]} ${name}${parallel} mit ${pointsText(vertices)}. ` +
      `Zeichne die Höhe von ${topName} auf die Gerade AB ein: Setze ihren Fußpunkt F. ` +
      'Berechne dann den Flächeninhalt (1 Kästchen = 1 cm).',
    shape,
    vertices,
    base: [0, 1],
    top,
    wanted: 'F',
    foot,
    outside,
    calculation: key,
    steps: [
      pointLine(
        foot,
        'F',
        outside
          ? `Das Lot von ${topName} trifft die Verlängerung von AB: Die Höhe liegt außerhalb.`
          : `Das Lot von ${topName} auf die Gerade AB.`,
      ),
      ...lengthLines,
      lengthLine('h', height, `Länge der Höhe ${topName}F.`),
      result,
    ],
  }
}

/** "3 nach rechts und 1 nach oben" for the shift from p to q. */
function shiftText(from: Point, to: Point): string {
  const dx = to.x.sub(from.x)
  const dy = to.y.sub(from.y)
  const parts: string[] = []
  if (!dx.isZero()) parts.push(`${numberText(dx.abs())} nach ${dx.sign() > 0 ? 'rechts' : 'links'}`)
  if (!dy.isZero()) parts.push(`${numberText(dy.abs())} nach ${dy.sign() > 0 ? 'oben' : 'unten'}`)
  return joinList(parts)
}

/**
 * Task "set the fourth vertex D" of a parallelogram, rhombus or trapezoid
 * (AB ∥ CD, with its area given). `coordinates` are all four vertices.
 *
 * @throws RangeError for an improper figure or (trapezoid) irrational lengths.
 */
export function buildCompleteShapeTask(
  shape: 'parallelogram' | 'rhombus' | 'trapezoid',
  coordinates: readonly Coordinates[],
  variant = 'example',
): GeometryTask {
  const solution = gridPoints(coordinates)
  const problem = shapeProblem(shape, solution)
  if (problem) throw new RangeError(`Not a ${shape}: ${problem}`)
  const given = solution.slice(0, 3)
  const a = vertexAt(solution, 0)
  const b = vertexAt(solution, 1)
  const c = vertexAt(solution, 2)
  const d = vertexAt(solution, 3)
  const area = polygonArea(solution)
  let steps: GeometrySolutionLine[]
  let instruction: string
  if (shape === 'trapezoid') {
    const ab = exactLength(a, b, 'AB')
    const cd = exactLength(c, d, 'CD')
    const h = cross({ x: b.x.sub(a.x), y: b.y.sub(a.y) }, { x: c.x.sub(a.x), y: c.y.sub(a.y) }).abs().div(ab)
    const equation: Equation = {
      left: num(area),
      right: { type: 'div', num: times(add(num(ab), v('c')), num(h)), den: num(2) },
    }
    instruction =
      `${pointsText(given)} sind Ecken des Trapezes ABCD mit AB ∥ CD und dem Flächeninhalt ` +
      `${withUnit(area, 'cm²')}. Setze die vierte Ecke D (1 Kästchen = 1 cm).`
    steps = [
      lengthLine('h', h, 'Die Höhe ist der Abstand der parallelen Seiten AB und CD.'),
      line(
        equationToText(equation, DECIMAL),
        equationToLatex(equation, DECIMAL),
        'In A = (a + c) · h : 2 einsetzen.',
      ),
      lengthLine('c', cd, 'Die Gleichung nach c auflösen.'),
      pointLine(d, 'D', `Von C aus ${numberText(cd)} Kästchen parallel zu AB, in Richtung von B nach A.`),
    ]
  } else {
    const rhombus = shape === 'rhombus' ? ' Bei der Raute sind dann alle vier Seiten gleich lang.' : ''
    instruction = `${pointsText(given)} sind Ecken ${GENITIVE[shape]} ABCD. Setze die vierte Ecke D.`
    steps = [pointLine(d, 'D', `Von C aus so weit wie von B nach A: ${shiftText(b, a)}.${rhombus}`)]
  }
  return {
    kind: 'complete-shape',
    topic: TOPIC_OF[shape],
    variant,
    key: `complete-shape: ${shape}, ${pointsText(solution)}`,
    instruction,
    shape,
    given,
    wanted: 'D',
    solution,
    area,
    steps,
  }
}

/**
 * Task "set C (triangle) or D (parallelogram; C follows) so that the figure
 * has the area of `coordinates`". `coordinates` are all vertices of one
 * solution; A and B are given.
 *
 * @throws RangeError for an improper figure or an irrational length of AB.
 */
export function buildDrawAreaTask(
  shape: 'triangle' | 'parallelogram',
  coordinates: readonly Coordinates[],
  variant = 'example',
): GeometryTask {
  const solution = gridPoints(coordinates)
  const problem = shapeProblem(shape, solution)
  if (problem) throw new RangeError(`Not a ${shape}: ${problem}`)
  const a = vertexAt(solution, 0)
  const b = vertexAt(solution, 1)
  const area = polygonArea(solution)
  const g = exactLength(a, b, 'AB')
  const triangle = shape === 'triangle'
  const h = triangle ? area.mul(Rational.of(2)).div(g) : area.div(g)
  const formula = areaFormula(shape)
  const equation: Equation = { left: num(area), right: insertMeasures(formula, { g }) }
  const wanted = triangle ? 'C' : 'D'
  const placed = vertexAt(solution, triangle ? 2 : 3)
  const steps = [
    line(calculationToText('area', [formula]), calculationToLatex('area', [formula]), AREA_NOTES[shape]),
    line(
      equationToText(equation, DECIMAL),
      equationToLatex(equation, DECIMAL),
      `Den Flächeninhalt und die Grundseite g = AB = ${withUnit(g, 'cm')} einsetzen.`,
    ),
    lengthLine('h', h, 'Die Gleichung nach h auflösen.'),
    pointLine(
      placed,
      wanted,
      `${wanted} liegt ${numberText(h)} Kästchen von der Geraden AB entfernt. Jeder Punkt in diesem Abstand passt.`,
    ),
  ]
  if (!triangle) {
    steps.push(pointLine(vertexAt(solution, 2), 'C', 'C ergibt sich: von B aus so weit wie von A nach D.'))
  }
  const name = triangle ? 'ABC' : 'ABCD'
  const follows = triangle ? '' : '; C ergibt sich'
  return {
    kind: 'draw-area',
    topic: TOPIC_OF[shape],
    variant,
    key: `draw-area: ${shape}, ${pointsText(solution.slice(0, 2))}, A = ${numberText(area)}`,
    instruction:
      `Gegeben sind ${pointsText(solution.slice(0, 2))}. Setze ${wanted} so, dass ${DEFINITE[shape]} ${name} ` +
      `den Flächeninhalt ${withUnit(area, 'cm²')} hat${follows} (1 Kästchen = 1 cm).`,
    shape,
    given: solution.slice(0, 2),
    wanted,
    solution,
    area,
    steps,
  }
}

// Generators.

/** Share of lengths that end in ,5. */
const HALF_SHARE = 1 / 3
/** Share of area tasks (parallelogram, triangle) with a distractor side. */
const DISTRACTOR_SHARE = 1 / 3
/** Share of drawing tasks with a vertical base. */
const VERTICAL_SHARE = 1 / 3

/** A length in [min, max] in steps of 0.5; ends in ,5 in about a third of the cases. */
function drawLength(rng: Rng, min: number, max: number): Rational {
  const half = max > min && rng() < HALF_SHARE
  const whole = randInt(rng, min, half ? max - 1 : max)
  return Rational.of(2 * whole + (half ? 1 : 0), 2)
}

/** At most `places` decimals. */
function fits(value: Rational, places = 2): boolean {
  const found = value.decimalPlaces()
  return found !== undefined && found <= places
}

/** Strict triangle inequality with a margin of 1 cm. */
function isTriangle(a: Rational, b: Rational, c: Rational): boolean {
  const margin = Rational.ONE
  return (
    a.add(b).compare(c.add(margin)) >= 0 &&
    a.add(c).compare(b.add(margin)) >= 0 &&
    b.add(c).compare(a.add(margin)) >= 0
  )
}

/**
 * True if the line by line solution of a Rückwärts task has nice numbers:
 * at most two decimals everywhere, divisors with at most one decimal.
 */
function hasNiceNumbers(equation: EquationTask): boolean {
  const lines = [equation.equation, ...equation.steps.map((step) => step.equation)]
  const numbersFit = lines.every((current) => {
    const { left, right } = sidePolynomials(current)
    return [left, right].every((side) => side.terms().every((term) => fits(term.coef)))
  })
  const divisorsFit = equation.steps.every((step) => {
    const operation = step.operation
    if (operation.kind !== 'divide' && operation.kind !== 'multiply') return true
    return fits(evaluateFormula(operation.operand, {}), 1)
  })
  return numbersFit && divisorsFit
}

function reverse(shape: ShapeKind, lengths: Measures, unknown: Letter, variant: string, offset?: number) {
  const task = buildReverseTask(shape, lengths, unknown, offset === undefined ? { variant } : { variant, offset })
  return task.kind === 'reverse' && hasNiceNumbers(task.equation) && fits(task.result) ? task : undefined
}

/** x of the top side or apex as a share of the base, for figures without a fixing side. */
function offsetOf(base: Rational, rng: Rng): number {
  return base.toNumber() * (0.2 + 0.3 * rng())
}

type Builder = (rng: Rng, variant: string) => GeometryTask | undefined

function parallelogramArea(rng: Rng, variant: string): GeometryTask | undefined {
  const g = drawLength(rng, 3, 12)
  const h = drawLength(rng, 2, 8)
  if (rng() < DISTRACTOR_SHARE) {
    return buildAreaTask('parallelogram', { g, h, b: h.add(drawLength(rng, 1, 4)) }, { variant })
  }
  return buildAreaTask('parallelogram', { g, h }, { variant, offset: offsetOf(g, rng) })
}

function parallelogramReverse(unknown: Letter): Builder {
  return (rng, variant) => {
    const g = drawLength(rng, 3, 12)
    return reverse('parallelogram', { g, h: drawLength(rng, 2, 8) }, unknown, variant, offsetOf(g, rng))
  }
}

function triangleArea(form: 'inside' | 'right' | 'obtuse'): Builder {
  return (rng, variant) => {
    const g = drawLength(rng, 3, 12)
    const h = drawLength(rng, 2, 8)
    if (!fits(g.mul(h).div(Rational.of(2)))) return undefined
    const base = g.toNumber()
    if (form === 'right') return buildAreaTask('triangle', { g, h }, { variant, offset: 0 })
    if (form === 'obtuse') {
      const beyond = 1 + 2 * rng()
      return buildAreaTask('triangle', { g, h }, { variant, offset: rng() < 0.5 ? -beyond : base + beyond })
    }
    if (rng() < DISTRACTOR_SHARE) {
      const b = h.add(drawLength(rng, 1, 4))
      const apex = Math.sqrt(b.toNumber() ** 2 - h.toNumber() ** 2)
      if (apex > 0.5 && apex < base - 0.5) return buildAreaTask('triangle', { g, h, b }, { variant })
    }
    return buildAreaTask('triangle', { g, h }, { variant, offset: base * (0.25 + 0.5 * rng()) })
  }
}

function triangleReverse(unknown: Letter): Builder {
  return (rng, variant) => {
    const g = drawLength(rng, 3, 12)
    const h = drawLength(rng, 2, 8)
    return reverse('triangle', { g, h }, unknown, variant, g.toNumber() * (0.25 + 0.5 * rng()))
  }
}

function trianglePerimeter(rng: Rng, variant: string): GeometryTask | undefined {
  const a = drawLength(rng, 2, 12)
  const b = drawLength(rng, 2, 12)
  const c = drawLength(rng, 2, 12)
  return isTriangle(a, b, c) ? buildPerimeterTask('triangle', { a, b, c }, { variant }) : undefined
}

function rhombusArea(rng: Rng, variant: string): GeometryTask | undefined {
  const e = drawLength(rng, 2, 12)
  const f = drawLength(rng, 2, 12)
  if (e.equals(f) || !fits(e.mul(f).div(Rational.of(2)))) return undefined
  return buildAreaTask('rhombus', { e, f }, { variant })
}

function rhombusReverse(unknown: Letter): Builder {
  return (rng, variant) => {
    const e = drawLength(rng, 2, 12)
    const f = drawLength(rng, 2, 12)
    return e.equals(f) ? undefined : reverse('rhombus', { e, f }, unknown, variant)
  }
}

/** a in 4…12, c in 2…a − 1, h in 2…8. */
function trapezoidLengths(rng: Rng): { a: Rational; c: Rational; h: Rational } {
  const a = drawLength(rng, 4, 12)
  return { a, c: drawLength(rng, 2, Math.ceil(a.toNumber()) - 1), h: drawLength(rng, 2, 8) }
}

function trapezoidArea(isosceles: boolean): Builder {
  return (rng, variant) => {
    const { a, c, h } = trapezoidLengths(rng)
    if (c.compare(a) >= 0) return undefined
    const s = a.sub(c).toNumber()
    const offset = isosceles ? s / 2 : s * (rng() < 0.5 ? 0.15 : 0.85)
    return buildAreaTask('trapezoid', { a, c, h }, { variant, offset })
  }
}

function trapezoidReverse(unknown: Letter): Builder {
  return (rng, variant) => {
    const { a, c, h } = trapezoidLengths(rng)
    if (c.compare(a) >= 0) return undefined
    return reverse('trapezoid', { a, c, h }, unknown, variant)
  }
}

function trapezoidPerimeter(rng: Rng, variant: string): GeometryTask | undefined {
  const a = drawLength(rng, 5, 12)
  const c = drawLength(rng, 2, Math.ceil(a.toNumber()) - 2)
  const b = drawLength(rng, 2, 9)
  const d = drawLength(rng, 2, 9)
  const s = a.sub(c)
  if (s.compare(Rational.of(2)) < 0 || !isTriangle(s, b, d)) return undefined
  return buildPerimeterTask('trapezoid', { a, b, c, d }, { variant })
}

const MARGIN = 1

/**
 * Moves (and for `vertical` turns by 90°) figure coordinates to a random
 * place in the grid with a margin of one unit; undefined if they do not fit.
 */
function place(rng: Rng, local: readonly Coordinates[], vertical: boolean): Coordinates[] | undefined {
  const turned = local.map(([x, y]): Coordinates => (vertical ? [0 - y, x] : [x, y]))
  const xs = turned.map(([x]) => x)
  const ys = turned.map(([, y]) => y)
  const lowX = GEOMETRY_WINDOW.x[0] + MARGIN - Math.min(...xs)
  const highX = GEOMETRY_WINDOW.x[1] - MARGIN - Math.max(...xs)
  const lowY = GEOMETRY_WINDOW.y[0] + MARGIN - Math.min(...ys)
  const highY = GEOMETRY_WINDOW.y[1] - MARGIN - Math.max(...ys)
  if (lowX > highX || lowY > highY) return undefined
  const dx = randInt(rng, lowX, highX)
  const dy = randInt(rng, lowY, highY)
  return turned.map(([x, y]): Coordinates => [x + dx, y + dy])
}

function triangleDrawHeight(outside: boolean): Builder {
  return (rng, variant) => {
    const g = randInt(rng, 3, 8)
    const h = randInt(rng, 2, 7)
    const x = outside ? (rng() < 0.5 ? -randInt(rng, 1, 3) : g + randInt(rng, 1, 3)) : randInt(rng, 1, g - 1)
    const placed = place(rng, [[0, 0], [g, 0], [x, h]], rng() < VERTICAL_SHARE)
    return placed && buildDrawHeightTask('triangle', placed, 2, variant)
  }
}

function parallelogramDrawHeight(rng: Rng, variant: string): GeometryTask | undefined {
  const g = randInt(rng, 3, 8)
  const h = randInt(rng, 2, 6)
  const offset = randInt(rng, 1, 3)
  const fromD = rng() < 0.5
  if (fromD && offset >= g) return undefined
  const placed = place(rng, [[0, 0], [g, 0], [g + offset, h], [offset, h]], rng() < VERTICAL_SHARE)
  return placed && buildDrawHeightTask('parallelogram', placed, fromD ? 3 : 2, variant)
}

function trapezoidDrawHeight(rng: Rng, variant: string): GeometryTask | undefined {
  const a = randInt(rng, 4, 8)
  const c = randInt(rng, 2, a - 1)
  const h = randInt(rng, 2, 6)
  const offset = randInt(rng, -1, a - c + 1)
  const fromD = rng() < 0.5
  const footX = fromD ? offset : offset + c
  if (footX === 0 || footX === a) return undefined
  const placed = place(rng, [[0, 0], [a, 0], [offset + c, h], [offset, h]], rng() < VERTICAL_SHARE)
  return placed && buildDrawHeightTask('trapezoid', placed, fromD ? 3 : 2, variant)
}

function parallelogramComplete(rng: Rng, variant: string): GeometryTask | undefined {
  const u: Coordinates = [randInt(rng, 3, 6), randInt(rng, -2, 2)]
  const w: Coordinates = [randInt(rng, -2, 3), randInt(rng, 2, 5)]
  if (u[0] * w[1] - u[1] * w[0] <= 0) return undefined
  const placed = place(rng, [[0, 0], u, [u[0] + w[0], u[1] + w[1]], w], false)
  return placed && buildCompleteShapeTask('parallelogram', placed, variant)
}

function rhombusAxisComplete(rng: Rng, variant: string): GeometryTask | undefined {
  const e = pick(rng, [2, 4, 6, 8])
  const f = pick(rng, [2, 4, 6, 8])
  if (e === f) return undefined
  const placed = place(rng, [[0, f / 2], [e / 2, 0], [e, f / 2], [e / 2, f]], false)
  return placed && buildCompleteShapeTask('rhombus', placed, variant)
}

/** Pairs of grid vectors of equal length (not parallel, not perpendicular): the sides of tilted rhombi. */
const RHOMBUS_SIDES: readonly (readonly [Coordinates, Coordinates])[] = (() => {
  const vectors: Coordinates[] = []
  for (let x = -5; x <= 5; x++) for (let y = -5; y <= 5; y++) if (x !== 0 || y !== 0) vectors.push([x, y])
  const pairs: [Coordinates, Coordinates][] = []
  for (const u of vectors) {
    for (const w of vectors) {
      const square = u[0] * u[0] + u[1] * u[1]
      if (square < 5 || square > 25 || square !== w[0] * w[0] + w[1] * w[1]) continue
      const turn = u[0] * w[1] - u[1] * w[0]
      if (turn < 3 || u[0] * w[0] + u[1] * w[1] === 0) continue
      pairs.push([u, w])
    }
  }
  return pairs
})()

function rhombusTiltedComplete(rng: Rng, variant: string): GeometryTask | undefined {
  const [u, w] = pick(rng, RHOMBUS_SIDES)
  const placed = place(rng, [[0, 0], u, [u[0] + w[0], u[1] + w[1]], w], false)
  return placed && buildCompleteShapeTask('rhombus', placed, variant)
}

function trapezoidComplete(rng: Rng, variant: string): GeometryTask | undefined {
  const a = randInt(rng, 4, 8)
  const c = randInt(rng, 2, a - 1)
  const h = randInt(rng, 2, 5)
  const offset = randInt(rng, 0, a - c)
  const placed = place(rng, [[0, 0], [a, 0], [offset + c, h], [offset, h]], rng() < VERTICAL_SHARE)
  return placed && buildCompleteShapeTask('trapezoid', placed, variant)
}

function triangleDrawArea(rng: Rng, variant: string): GeometryTask | undefined {
  const g = randInt(rng, 2, 8)
  const h = randInt(rng, 2, 7)
  const x = randInt(rng, 0, g)
  const placed = place(rng, [[0, 0], [g, 0], [x, h]], rng() < VERTICAL_SHARE)
  return placed && buildDrawAreaTask('triangle', placed, variant)
}

function parallelogramDrawArea(rng: Rng, variant: string): GeometryTask | undefined {
  const g = randInt(rng, 2, 8)
  const h = randInt(rng, 2, 6)
  const offset = randInt(rng, 0, 3)
  const placed = place(rng, [[0, 0], [g, 0], [g + offset, h], [offset, h]], rng() < VERTICAL_SHARE)
  return placed && buildDrawAreaTask('parallelogram', placed, variant)
}

interface TopicPlan {
  /** The variants of a series, slot by slot. */
  series: readonly string[]
  builders: Readonly<Record<string, Builder>>
}

/**
 * Series of 10: slots F F Z R F Z U R F Z (F area, Z drawing, R Rückwärts,
 * U perimeter); the rhombus has only two drawing tasks, its last slot is an
 * area task.
 */
type GeometryTopic = typeof PARALLELOGRAM | typeof TRIANGLE | typeof RHOMBUS | typeof TRAPEZOID

const PLANS: Readonly<Record<GeometryTopic, TopicPlan>> = {
  [PARALLELOGRAM]: {
    series: [
      'area',
      'area',
      'draw-height',
      'reverse-h',
      'area',
      'complete-shape',
      'perimeter',
      'reverse-g',
      'area',
      'draw-area',
    ],
    builders: {
      area: parallelogramArea,
      perimeter: (rng, variant) =>
        buildPerimeterTask('parallelogram', { a: drawLength(rng, 3, 12), b: drawLength(rng, 2, 9) }, { variant }),
      'reverse-h': parallelogramReverse('h'),
      'reverse-g': parallelogramReverse('g'),
      'draw-height': parallelogramDrawHeight,
      'complete-shape': parallelogramComplete,
      'draw-area': parallelogramDrawArea,
    },
  },
  [TRIANGLE]: {
    series: [
      'area-inside',
      'area-right',
      'draw-height-inside',
      'reverse-h',
      'area-obtuse',
      'draw-height-outside',
      'perimeter',
      'reverse-g',
      'area-inside',
      'draw-area',
    ],
    builders: {
      'area-inside': triangleArea('inside'),
      'area-right': triangleArea('right'),
      'area-obtuse': triangleArea('obtuse'),
      perimeter: trianglePerimeter,
      'reverse-h': triangleReverse('h'),
      'reverse-g': triangleReverse('g'),
      'draw-height-inside': triangleDrawHeight(false),
      'draw-height-outside': triangleDrawHeight(true),
      'draw-area': triangleDrawArea,
    },
  },
  [RHOMBUS]: {
    series: [
      'area',
      'area',
      'complete-axis',
      'reverse-f',
      'area',
      'complete-tilted',
      'perimeter',
      'reverse-e',
      'area',
      'area',
    ],
    builders: {
      area: rhombusArea,
      perimeter: (rng, variant) => buildPerimeterTask('rhombus', { a: drawLength(rng, 2, 12) }, { variant }),
      'reverse-e': rhombusReverse('e'),
      'reverse-f': rhombusReverse('f'),
      'complete-axis': rhombusAxisComplete,
      'complete-tilted': rhombusTiltedComplete,
    },
  },
  [TRAPEZOID]: {
    series: [
      'area-isosceles',
      'area-general',
      'draw-height',
      'reverse-h',
      'area-isosceles',
      'complete-shape',
      'perimeter',
      'reverse-c',
      'area-general',
      'complete-shape',
    ],
    builders: {
      'area-isosceles': trapezoidArea(true),
      'area-general': trapezoidArea(false),
      perimeter: trapezoidPerimeter,
      'reverse-h': trapezoidReverse('h'),
      'reverse-c': trapezoidReverse('c'),
      'draw-height': trapezoidDrawHeight,
      'complete-shape': trapezoidComplete,
    },
  },
}

/** The task kind of a variant name such as "area-obtuse" or "complete-tilted". */
function variantKind(variant: string): GeometryTaskKind {
  if (variant.startsWith('area')) return 'area'
  if (variant.startsWith('reverse')) return 'reverse'
  if (variant.startsWith('draw-height')) return 'draw-height'
  if (variant.startsWith('complete')) return 'complete-shape'
  if (variant === 'draw-area') return 'draw-area'
  return 'perimeter'
}

function planOf(topic: SubtopicId): TopicPlan {
  if (!Object.hasOwn(PLANS, topic)) throw new Error(`No geometry generator for subtopic "${topic}"`)
  return PLANS[topic as GeometryTopic]
}

function buildVariant(topic: SubtopicId, variant: string, rng: Rng): GeometryTask {
  const builder = planOf(topic).builders[variant]
  if (!builder) throw new Error(`No geometry variant "${variant}" for subtopic "${topic}"`)
  for (;;) {
    const task = builder(rng, variant)
    if (task) return task
  }
}

/** A generator that draws a variant of the series at random. */
function generatorFor(topic: GeometryTopic): GeometryTaskGenerator {
  return (rng) => buildVariant(topic, pick(rng, PLANS[topic].series), rng)
}

/**
 * Generators of the topic "Vierecke und Flächen", the fourth register next
 * to the term, equation and function generators: the answers are
 * calculations (Rechenketten) with a unit, substituted formulas solved line
 * by line, and points set in a grid.
 */
export const geometryGenerators = {
  [PARALLELOGRAM]: generatorFor(PARALLELOGRAM),
  [TRIANGLE]: generatorFor(TRIANGLE),
  [RHOMBUS]: generatorFor(RHOMBUS),
  [TRAPEZOID]: generatorFor(TRAPEZOID),
} as const satisfies Record<SubtopicId, GeometryTaskGenerator>

/** All subtopics that have a geometry generator. */
export const GEOMETRY_SUBTOPIC_IDS = Object.keys(geometryGenerators) as (keyof typeof geometryGenerators)[]

const MAX_ATTEMPTS = 200

/** Generates a geometry task whose key is not in `exclude` (see `generateTask`). */
export function generateGeometryTask(topic: SubtopicId, rng: Rng, exclude: Iterable<string> = []): GeometryTask {
  const excluded = new Set(exclude)
  planOf(topic)
  const generate: GeometryTaskGenerator = geometryGenerators[topic as GeometryTopic]
  let task = generate(rng)
  for (let i = 1; i < MAX_ATTEMPTS && excluded.has(task.key); i++) task = generate(rng)
  return task
}

export interface GeometrySeriesOptions {
  /** Allowed kinds; slots of other kinds become area tasks (until the drawing practice exists). */
  kinds?: readonly GeometryTaskKind[]
}

/** The variants of a series slot by slot, after applying `kinds`. */
export function geometrySeriesVariants(topic: SubtopicId, options: GeometrySeriesOptions = {}): string[] {
  const { series } = planOf(topic)
  const allowed = options.kinds
  const areas = series.filter((variant) => variantKind(variant) === 'area')
  let next = 0
  return series.map((variant) => {
    if (!allowed || allowed.includes(variantKind(variant))) return variant
    return areas[next++ % areas.length] ?? variant
  })
}

/**
 * A series of 10 geometry tasks without repetitions, with a fixed
 * composition per subtopic (see PLANS).
 */
export function generateGeometrySeries(
  topic: SubtopicId,
  rng: Rng,
  options: GeometrySeriesOptions = {},
): GeometryTask[] {
  const tasks: GeometryTask[] = []
  for (const variant of geometrySeriesVariants(topic, options)) {
    const keys = new Set(tasks.map((task) => task.key))
    let task = buildVariant(topic, variant, rng)
    for (let i = 1; i < MAX_ATTEMPTS && keys.has(task.key); i++) task = buildVariant(topic, variant, rng)
    tasks.push(task)
  }
  return tasks
}

/** Length of a geometry series; the same as for the other subtopics. */
export const GEOMETRY_SERIES_LENGTH = SERIES_LENGTH
