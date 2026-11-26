import { equalPoints } from '../functions/analysis'
import type { Point } from '../functions/types'
import {
  areParallel,
  classifyQuadrilateral,
  dot,
  isOnLine,
  isSimplePolygon,
  polygonArea,
  translate,
} from './polygon'
import type { GeometryTask } from './types'

export type DrawHeightTask = Extract<GeometryTask, { kind: 'draw-height' }>
export type FigureDrawingTask = Extract<GeometryTask, { kind: 'complete-shape' | 'draw-area' }>

export type FootCheckResult =
  | { kind: 'correct' }
  /**
   * `onLine`: F lies on the line through the base (also on its extension);
   * `perpendicular`: the segment from the vertex to F is perpendicular to the base.
   */
  | { kind: 'wrong'; onLine: boolean; perpendicular: boolean }

function vertex(points: readonly Point[], index: number): Point {
  const p = points[index]
  if (!p) throw new RangeError(`No vertex ${index}`)
  return p
}

/** Checks the foot F of the height (acceptance criterion 5): only the exact foot counts. */
export function checkFoot(task: DrawHeightTask, foot: Point): FootCheckResult {
  if (equalPoints(foot, task.foot)) return { kind: 'correct' }
  const a = vertex(task.vertices, task.base[0])
  const b = vertex(task.vertices, task.base[1])
  const top = vertex(task.vertices, task.top)
  const ab = { x: b.x.sub(a.x), y: b.y.sub(a.y) }
  const height = { x: top.x.sub(foot.x), y: top.y.sub(foot.y) }
  return {
    kind: 'wrong',
    onLine: isOnLine(foot, a, b),
    perpendicular: !equalPoints(top, foot) && dot(height, ab).isZero(),
  }
}

/**
 * The figure the learner has drawn with the point `placed`: the given
 * vertices plus `placed`; for a parallelogram in `draw-area` also
 * C = B + (D − A).
 */
export function drawnPolygon(task: FigureDrawingTask, placed: Point): Point[] {
  if (task.kind === 'draw-area' && task.shape === 'parallelogram') {
    const a = vertex(task.given, 0)
    const b = vertex(task.given, 1)
    return [a, b, translate(b, placed, a), placed]
  }
  return [...task.given, placed]
}

/** True if the drawn polygon is a figure of the right type. */
function hasRightShape(task: FigureDrawingTask, polygon: readonly Point[]): boolean {
  if (!isSimplePolygon(polygon)) return false
  switch (task.shape) {
    case 'triangle':
      return polygon.length === 3
    case 'parallelogram':
      return classifyQuadrilateral(polygon).parallelogram
    case 'rhombus':
      return classifyQuadrilateral(polygon).rhombus
    case 'trapezoid': {
      const [a, b, c, d] = polygon
      return a !== undefined && b !== undefined && c !== undefined && d !== undefined && areParallel(a, b, d, c)
    }
  }
}

export type DrawingCheckResult =
  | { kind: 'correct' }
  /** `shape`: a proper figure of the right type; `area`: the area is right. */
  | { kind: 'wrong'; shape: boolean; area: boolean }

/**
 * Checks a completed figure or a figure with a given area (acceptance
 * criterion 5): type (not degenerate, not self-intersecting, parallel or
 * equal sides) and area, computed exactly from the coordinates. Where the
 * position is unique (complete-shape), the type check already decides it.
 */
export function checkDrawing(task: FigureDrawingTask, placed: Point): DrawingCheckResult {
  const polygon = drawnPolygon(task, placed)
  const shape = hasRightShape(task, polygon)
  const area = polygonArea(polygon).equals(task.area)
  return shape && area ? { kind: 'correct' } : { kind: 'wrong', shape, area }
}
