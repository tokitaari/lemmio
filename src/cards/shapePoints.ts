import {
  areaFormula,
  buildFigure,
  calculationChain,
  calculationToLatex,
  calculationToText,
  evaluateFormula,
  formulaLetters,
  GEOMETRY_WINDOW,
  geometryNumberToText,
  toLength,
  unitToLatex,
  type Letter,
  type Measures,
  type Rational,
  type ShapeKind,
  type TaskFigure,
} from '../math'
import { pointLabelText, pointProblems, type GridPoint, type PlaneWindow, type PointDrag } from '../plane'
import { SHAPE_NAMES, VERTEX_NAMES } from '../shapes'
import type { ShapePointsWidget } from './types'

/**
 * Logic of the `shape-points` widget: a figure on the geometry grid with
 * movable vertices. The base AB stays horizontal and A stays where it is
 * (for a rhombus the centre M), so every length is a whole number:
 *
 * | shape         | movable                         | follows                                |
 * |---------------|---------------------------------|----------------------------------------|
 * | parallelogram | B (horizontal), D (free)        | C = B + D − A                          |
 * | triangle      | B (horizontal), C (free)        | –                                      |
 * | rhombus       | C (horizontal), D (vertical)    | A, B mirrored at M                     |
 * | trapezoid     | B, C (horizontal), D (free)     | C takes the row of D                   |
 *
 * Bounds keep the top above AB, the vertices in order and every vertex that
 * follows inside the grid. The view is src/components/cards/ShapePointsView.tsx.
 */

const SHAPES: readonly ShapeKind[] = ['parallelogram', 'triangle', 'rhombus', 'trapezoid']

/** Vertices A, B, C(, D) as grid points. */
export type ShapeVertices = readonly GridPoint[]

export interface ShapePointsModel {
  shape: ShapeKind
  window: PlaneWindow
  start: ShapeVertices
  /** Area to reach in cm². */
  target?: number
}

/** Indices of the movable vertices. */
export const MOVABLE_VERTICES: Readonly<Record<ShapeKind, readonly number[]>> = {
  parallelogram: [1, 3],
  triangle: [1, 2],
  rhombus: [2, 3],
  trapezoid: [1, 2, 3],
}

/** Shown below the grid. */
export const SHAPE_POINTS_HINT: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'Ziehe B und D. C folgt, damit ABCD ein Parallelogramm bleibt.',
  triangle: 'Ziehe B und C.',
  rhombus: 'Ziehe C und D. A und B folgen gespiegelt am Mittelpunkt, damit ABCD eine Raute bleibt.',
  trapezoid: 'Ziehe B, C und D. C bleibt auf der Parallelen zu AB durch D.',
}

/** Note shown while the height lies outside the figure. */
export const HEIGHT_OUTSIDE_NOTE = 'Die Höhe liegt außerhalb – die Formel gilt trotzdem.'

const VERTEX_COUNT: Readonly<Record<ShapeKind, number>> = { parallelogram: 4, triangle: 3, rhombus: 4, trapezoid: 4 }

/** The vertex the height starts at (parallelogram and trapezoid D, triangle C). */
const TOP: Readonly<Record<ShapeKind, number>> = { parallelogram: 3, triangle: 2, rhombus: 3, trapezoid: 3 }

function vertex(vertices: ShapeVertices, i: number): GridPoint {
  const v = vertices[i]
  if (!v) throw new RangeError(`No vertex ${i}`)
  return v
}

/** Centre M of a rhombus: the midpoint of AC. */
export function rhombusCenter(vertices: ShapeVertices): GridPoint {
  const a = vertex(vertices, 0)
  const c = vertex(vertices, 2)
  return { x: (a.x + c.x) / 2, y: a.y }
}

const isHalfStep = (value: number) => Number.isFinite(value) && Number.isInteger(value * 2)

// ---------------------------------------------------------------------------
// Checks

/** Problems of the widget (empty if it is fine); `validateDeck` reports them with the card. */
export function shapePointsProblems(widget: ShapePointsWidget): string[] {
  const at = 'shape-points'
  if (!SHAPES.includes(widget.shape)) return [`${at}: unknown shape "${String(widget.shape)}"`]
  const count = VERTEX_COUNT[widget.shape]
  if (widget.vertices.length !== count) return [`${at}: a ${widget.shape} needs ${count} vertices`]
  const vertices = widget.vertices.map(([x, y]) => ({ x, y }))
  const outside = vertices.flatMap((p, i) => (pointProblems(p, GEOMETRY_WINDOW).length > 0 ? [VERTEX_NAMES[i]] : []))
  if (outside.length > 0) return [`${at}: vertices ${outside.join(', ')} must be grid points of the grid 0…12 × 0…10`]

  const problems = bindingProblems(widget.shape, vertices).map((p) => `${at}: ${p}`)
  if (problems.length > 0 || widget.target === undefined) return problems

  const model = buildShapePoints(widget)
  const target = widget.target
  if (!isHalfStep(target) || target <= 0) return [`${at}: target must be a positive multiple of 0,5`]
  if (target === shapeArea(model.shape, model.start).toNumber()) return [`${at}: target equals the start area`]
  if (!reachableDoubleAreas(model).has(target * 2)) return [`${at}: target ${target} cm² cannot be reached`]
  return []
}

function bindingProblems(shape: ShapeKind, v: ShapeVertices): string[] {
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => v[i])
  if (!a || !b || !c) return ['missing vertices']
  if (shape === 'rhombus') {
    if (!d) return ['missing vertices']
    const problems: string[] = []
    if (a.y !== c.y || a.x >= c.x) problems.push('the diagonal AC must be horizontal with A left of C')
    if (b.x !== d.x || b.y >= d.y) problems.push('the diagonal BD must be vertical with B below D')
    if (problems.length > 0) return problems
    if ((a.x + c.x) % 2 !== 0 || (b.y + d.y) % 2 !== 0) return ['e and f must be even, so that the centre M is a grid point']
    const m = rhombusCenter(v)
    if (b.x !== m.x || (b.y + d.y) / 2 !== m.y) return ['the diagonals must have the same midpoint M']
    return []
  }
  const problems: string[] = []
  if (a.y !== b.y || a.x >= b.x) problems.push('AB must be horizontal with A left of B')
  if (a.y < 1) problems.push('AB needs y ≥ 1, so its label fits below it')
  const top = shape === 'triangle' ? [c] : [c, d]
  if (top.some((p) => !p || p.y <= a.y)) problems.push(shape === 'triangle' ? 'C must lie above AB' : 'C and D must lie above AB')
  if (problems.length > 0 || !d) return problems
  if (shape === 'parallelogram' && (c.x !== b.x + d.x - a.x || c.y !== b.y + d.y - a.y)) {
    problems.push('a parallelogram needs C = B + D − A')
  }
  if (shape === 'trapezoid' && (c.y !== d.y || c.x <= d.x)) problems.push('CD must be parallel to AB with C right of D')
  return problems
}

/** Twice every area (cm²) the movable vertices can reach; twice, so that halves are whole numbers. */
export function reachableDoubleAreas(model: ShapePointsModel): Set<number> {
  const { window } = model
  const a = vertex(model.start, 0)
  const areas = new Set<number>()
  const up = (from: number, to: number) => Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)
  if (model.shape === 'rhombus') {
    const m = rhombusCenter(model.start)
    for (const k of up(1, Math.min(m.x - window.x[0], window.x[1] - m.x))) {
      for (const l of up(1, Math.min(m.y - window.y[0], window.y[1] - m.y))) areas.add(4 * k * l)
    }
    return areas
  }
  const bases = up(1, window.x[1] - a.x)
  const heights = up(1, window.y[1] - a.y)
  for (const g of bases) {
    for (const h of heights) {
      if (model.shape === 'parallelogram') areas.add(2 * g * h)
      else if (model.shape === 'triangle') areas.add(g * h)
      else for (const c of up(1, window.x[1] - window.x[0])) areas.add((g + c) * h)
    }
  }
  return areas
}

// ---------------------------------------------------------------------------
// Model and moves

/** Assumes a widget without problems. */
export function buildShapePoints(widget: ShapePointsWidget): ShapePointsModel {
  return {
    shape: widget.shape,
    window: GEOMETRY_WINDOW,
    start: widget.vertices.map(([x, y]) => ({ x, y })),
    target: widget.target,
  }
}

/**
 * How a vertex may be dragged at the current position, or undefined if it
 * follows the others (or stays, like A).
 */
export function vertexDrag(model: ShapePointsModel, vertices: ShapeVertices, index: number): PointDrag | undefined {
  if (!MOVABLE_VERTICES[model.shape].includes(index)) return undefined
  const { window } = model
  const [x0, x1] = window.x
  const [y0, y1] = window.y
  const a = vertex(vertices, 0)
  const bounds = (x: readonly [number, number], y: readonly [number, number] = window.y): PlaneWindow => ({ x, y })
  switch (model.shape) {
    case 'parallelogram': {
      const b = vertex(vertices, 1)
      const d = vertex(vertices, 3)
      // C = B + D − A must stay inside the grid; B stays right of A, D above AB.
      if (index === 1) return { kind: 'horizontal', bounds: bounds([a.x + 1, x1 - (d.x - a.x)]) }
      return { kind: 'free', bounds: bounds([x0, x1 - (b.x - a.x)], [a.y + 1, y1]) }
    }
    case 'triangle':
      if (index === 1) return { kind: 'horizontal', bounds: bounds([a.x + 1, x1]) }
      return { kind: 'free', bounds: bounds([x0, x1], [a.y + 1, y1]) }
    case 'rhombus': {
      const m = rhombusCenter(vertices)
      // The mirrored vertex must stay inside the grid.
      if (index === 2) return { kind: 'horizontal', bounds: bounds([m.x + 1, Math.min(x1, 2 * m.x - x0)]) }
      return { kind: 'vertical', bounds: bounds([x0, x1], [m.y + 1, Math.min(y1, 2 * m.y - y0)]) }
    }
    case 'trapezoid': {
      const c = vertex(vertices, 2)
      const d = vertex(vertices, 3)
      if (index === 1) return { kind: 'horizontal', bounds: bounds([a.x + 1, x1]) }
      if (index === 2) return { kind: 'horizontal', bounds: bounds([d.x + 1, x1]) }
      return { kind: 'free', bounds: bounds([x0, c.x - 1], [a.y + 1, y1]) }
    }
  }
}

/** The vertices after vertex `index` moved to `p`, with the vertices that follow it. */
export function moveVertex(model: ShapePointsModel, vertices: ShapeVertices, index: number, p: GridPoint): ShapeVertices {
  const next = vertices.map((v, i) => (i === index ? p : v))
  const a = vertex(next, 0)
  switch (model.shape) {
    case 'parallelogram': {
      const b = vertex(next, 1)
      const d = vertex(next, 3)
      return next.map((v, i) => (i === 2 ? { x: b.x + d.x - a.x, y: b.y + d.y - a.y } : v))
    }
    case 'rhombus': {
      const m = rhombusCenter(vertices)
      if (index === 2) return next.map((v, i) => (i === 0 ? { x: 2 * m.x - p.x, y: m.y } : v))
      return next.map((v, i) => (i === 1 ? { x: m.x, y: 2 * m.y - p.y } : v))
    }
    case 'trapezoid':
      if (index !== 3) return next
      return next.map((v, i) => (i === 2 ? { x: v.x, y: p.y } : v))
    case 'triangle':
      return next
  }
}

// ---------------------------------------------------------------------------
// Lengths, area and texts

/** Letters of the area formula, e.g. g, h. */
export function pointsLetters(shape: ShapeKind): Letter[] {
  return formulaLetters(areaFormula(shape))
}

/** The lengths of the area formula, read off the grid. */
export function shapePointsMeasures(shape: ShapeKind, vertices: ShapeVertices): Measures {
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => vertices[i] ?? { x: 0, y: 0 }) as [GridPoint, GridPoint, GridPoint, GridPoint]
  switch (shape) {
    case 'parallelogram':
      return { g: toLength(b.x - a.x), h: toLength(d.y - a.y) }
    case 'triangle':
      return { g: toLength(b.x - a.x), h: toLength(c.y - a.y) }
    case 'rhombus':
      return { e: toLength(c.x - a.x), f: toLength(d.y - b.y) }
    case 'trapezoid':
      return { a: toLength(b.x - a.x), c: toLength(c.x - d.x), h: toLength(d.y - a.y) }
  }
}

export function shapeArea(shape: ShapeKind, vertices: ShapeVertices): Rational {
  return evaluateFormula(areaFormula(shape), shapePointsMeasures(shape, vertices))
}

/** True if the foot of the height lies on the extension of AB (never for a rhombus). */
export function heightOutside(shape: ShapeKind, vertices: ShapeVertices): boolean {
  if (shape === 'rhombus') return false
  const a = vertex(vertices, 0)
  const b = vertex(vertices, 1)
  const top = vertex(vertices, TOP[shape])
  return top.x < a.x || top.x > b.x
}

/** Figure for the overlay: labelled lengths and the height (or the diagonals) in grid units. */
export function shapePointsFigure(shape: ShapeKind, vertices: ShapeVertices): TaskFigure {
  return buildFigure(
    shape,
    vertices.map((v) => [v.x, v.y] as const),
    pointsLetters(shape),
    shapePointsMeasures(shape, vertices),
  )
}

export interface ShapePointsState {
  figure: TaskFigure
  area: Rational
  /** `g = 5 cm`, `h = 3 cm` in the order of the formula. */
  lengths: { letter: Letter; text: string }[]
  /** `A = g·h = 5·3 = 15 cm²` */
  text: string
  latex: string
  outside: boolean
  reached: boolean
}

export function shapePointsState(model: ShapePointsModel, vertices: ShapeVertices): ShapePointsState {
  const measures = shapePointsMeasures(model.shape, vertices)
  const formula = areaFormula(model.shape)
  const chain = calculationChain(formula, measures)
  const area = evaluateFormula(formula, measures)
  return {
    figure: shapePointsFigure(model.shape, vertices),
    area,
    lengths: pointsLetters(model.shape).map((letter) => ({
      letter,
      text: ` = ${geometryNumberToText(measures[letter] ?? toLength(0))} cm`,
    })),
    text: `${calculationToText('area', chain)} cm²`,
    latex: `${calculationToLatex('area', chain)}\\,${unitToLatex('cm²')}`,
    outside: heightOutside(model.shape, vertices),
    reached: model.target !== undefined && area.toNumber() === model.target,
  }
}

/** `A = 15 cm²` */
export function areaText(area: Rational): string {
  return `A = ${geometryNumberToText(area)} cm²`
}

export function shapeTargetHint(target: number): string {
  return `Ziel: Bringe den Flächeninhalt auf ${geometryNumberToText(toLength(target))} cm².`
}

export function shapeTargetReached(target: number): string {
  return `Geschafft: A = ${geometryNumberToText(toLength(target))} cm².`
}

/**
 * Extra text for the announcement after a move, e.g. "g = 5 cm, h = 3 cm,
 * A = 15 cm². Die Höhe liegt außerhalb." and, at the target, "Geschafft: …".
 */
export function shapePointsAnnouncement(model: ShapePointsModel, vertices: ShapeVertices): string {
  const state = shapePointsState(model, vertices)
  let text = [...state.lengths.map((l) => `${l.letter}${l.text}`), areaText(state.area)].join(', ') + '.'
  if (state.outside) text += ' Die Höhe liegt außerhalb.'
  if (state.reached && model.target !== undefined) text += ` ${shapeTargetReached(model.target)}`
  return text
}

/** Accessible name of the polygon, e.g. "Parallelogramm ABCD mit A(2|2), B(7|2), C(9|5), D(4|5)". */
export function shapePolygonText(shape: ShapeKind, vertices: ShapeVertices): string {
  const names = VERTEX_NAMES.slice(0, vertices.length)
  const points = vertices.map((v, i) => pointLabelText(names[i] ?? '?', v)).join(', ')
  return `${SHAPE_NAMES[shape]} ${names.join('')} mit ${points}`
}

/** LaTeX of the start calculation, for `deckLatex`. */
export function shapePointsLatex(model: ShapePointsModel): string[] {
  return [shapePointsState(model, model.start).latex]
}
