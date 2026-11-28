import { geometryNumberToText, type ShapeKind } from '../math'
import type { GridPoint, PlaneWindow, PointDrag } from '../plane'
import {
  buildShapePoints,
  moveVertex,
  shapePointsAnnouncement,
  shapePointsLatex,
  shapePointsProblems,
  shapePointsState,
  type ShapePointsModel,
  type ShapePointsState,
  type ShapeVertices,
} from './shapePoints'
import type { ShearWidget } from './types'

/**
 * Logic of the `shear` widget: a parallelogram or triangle on the geometry
 * grid whose top vertex (D, or C for a triangle) slides along the parallel
 * to AB. Base g and height h never change, so the area stays the same; a
 * parallelogram becomes a rectangle when D lies above A. Lengths, height and
 * area come from src/cards/shapePoints.ts. The view is
 * src/components/cards/ShearView.tsx.
 */

export type ShearShape = Extract<ShapeKind, 'parallelogram' | 'triangle'>

export const SHEAR_SHAPES: readonly ShearShape[] = ['parallelogram', 'triangle']

export interface ShearModel {
  shape: ShearShape
  window: PlaneWindow
  start: ShapeVertices
  /** Index of the movable vertex: D (3) for a parallelogram, C (2) for a triangle. */
  top: number
  /** The model of `shape-points` for lengths, area and texts. */
  points: ShapePointsModel
}

/** Shown below the grid. */
export const SHEAR_HINT: Readonly<Record<ShearShape, string>> = {
  parallelogram: 'Ziehe D nach links oder rechts. C folgt, Grundseite und Höhe bleiben gleich.',
  triangle: 'Ziehe C nach links oder rechts, entlang der Parallelen zu AB. Grundseite und Höhe bleiben gleich.',
}

/** Status when the figure has a right angle. */
export const SHEAR_RECTANGLE = 'Jetzt ist es ein Rechteck – der Flächeninhalt ist derselbe.'
export const SHEAR_RIGHT_TRIANGLE = 'Jetzt ist das Dreieck rechtwinklig – der Flächeninhalt ist derselbe.'

/** Name of the dashed rectangle of a parallelogram, drawn for comparison. */
export const SHEAR_COMPARE = 'Rechteck mit derselben Grundseite und Höhe, zum Vergleich'

const isShearShape = (shape: string): shape is ShearShape => (SHEAR_SHAPES as readonly string[]).includes(shape)

/** Problems of the widget (empty if it is fine); the vertices follow the rules of `shape-points`. */
export function shearProblems(widget: ShearWidget): string[] {
  if (!isShearShape(widget.shape)) return [`shear: shape must be a parallelogram or a triangle, not "${String(widget.shape)}"`]
  return shapePointsProblems({ kind: 'shape-points', shape: widget.shape, vertices: widget.vertices }).map((p) =>
    p.replace(/^shape-points:/, 'shear:'),
  )
}

/** Assumes a widget without problems. */
export function buildShear(widget: ShearWidget): ShearModel {
  const points = buildShapePoints({ kind: 'shape-points', shape: widget.shape, vertices: widget.vertices })
  return { shape: widget.shape, window: points.window, start: points.start, top: widget.shape === 'triangle' ? 2 : 3, points }
}

function vertex(vertices: ShapeVertices, i: number): GridPoint {
  const v = vertices[i]
  if (!v) throw new RangeError(`No vertex ${i}`)
  return v
}

/** The top vertex moves horizontally; for a parallelogram C = D + (g|0) must stay inside the grid. */
export function shearDrag(model: ShearModel, vertices: ShapeVertices): Extract<PointDrag, { kind: 'horizontal' }> & { bounds: PlaneWindow } {
  const [x0, x1] = model.window.x
  const g = vertex(vertices, 1).x - vertex(vertices, 0).x
  const right = model.shape === 'parallelogram' ? x1 - g : x1
  return { kind: 'horizontal', bounds: { x: [x0, right], y: model.window.y } }
}

/** The vertices after the top vertex moved to `p` (its row stays). */
export function shearMove(model: ShearModel, vertices: ShapeVertices, p: GridPoint): ShapeVertices {
  const top = vertex(vertices, model.top)
  return moveVertex(model.points, vertices, model.top, { x: p.x, y: top.y })
}

/** How far the top vertex lies to the right of A (parallelogram) in grid units; negative to the left. */
export function shearOffset(model: ShearModel, vertices: ShapeVertices): number {
  return vertex(vertices, model.top).x - vertex(vertices, 0).x
}

/** Status text for a right angle, or null. */
export function shearStatus(model: ShearModel, vertices: ShapeVertices): string | null {
  const top = vertex(vertices, model.top).x
  if (model.shape === 'parallelogram') return top === vertex(vertices, 0).x ? SHEAR_RECTANGLE : null
  return top === vertex(vertices, 0).x || top === vertex(vertices, 1).x ? SHEAR_RIGHT_TRIANGLE : null
}

export interface ShearState extends ShapePointsState {
  status: string | null
}

export function shearState(model: ShearModel, vertices: ShapeVertices): ShearState {
  return { ...shapePointsState(model.points, vertices), status: shearStatus(model, vertices) }
}

/** The dashed rectangle over AB with the height of the figure (parallelogram only). */
export function shearCompare(model: ShearModel, vertices: ShapeVertices): GridPoint[] | null {
  if (model.shape !== 'parallelogram') return null
  const a = vertex(vertices, 0)
  const b = vertex(vertices, 1)
  const y = vertex(vertices, model.top).y
  return [a, b, { x: b.x, y }, { x: a.x, y }]
}

/** Row of the parallel to AB that the top vertex slides along. */
export function shearTrack(model: ShearModel, vertices: ShapeVertices): number {
  return vertex(vertices, model.top).y
}

/** Name of the parallel, e.g. "Parallele zu AB durch D". */
export function shearTrackText(model: ShearModel): string {
  return `Parallele zu AB durch ${model.shape === 'triangle' ? 'C' : 'D'}`
}

/**
 * Extra text for the announcement after a move, e.g. "g = 6 cm, h = 4 cm,
 * A = 24 cm². Der Flächeninhalt bleibt gleich." plus the status.
 */
export function shearAnnouncement(model: ShearModel, vertices: ShapeVertices): string {
  const status = shearStatus(model, vertices)
  return [shapePointsAnnouncement(model.points, vertices), 'Der Flächeninhalt bleibt gleich.', ...(status ? [status] : [])].join(' ')
}

/** `A = 24 cm², wie am Anfang.` */
export function shearAreaText(state: ShapePointsState): string {
  return `A = ${geometryNumberToText(state.area)} cm², wie am Anfang.`
}

/** LaTeX of the calculation, for `deckLatex` (it never changes). */
export function shearLatex(model: ShearModel): string[] {
  return shapePointsLatex(model.points)
}
