import { point, Rational, valueAt, type FunctionTask, type LinearFunction, type Point } from '../math'

/** A line of a worked example: the graph of a linear function with whole numbers. */
export interface FigureLine {
  name: string
  m: number
  n: number
  /** Drawn dashed, e.g. g on top of f when both are the same line. */
  dashed?: boolean
}

/** A labelled point of a worked example. */
export interface FigurePoint {
  label: string
  x: number
  y: number
}

export interface FunctionFigure {
  lines: FigureLine[]
  points: FigurePoint[]
}

function figureLine(fn: LinearFunction, dashed = false): FigureLine {
  return { name: fn.name, m: fn.m.toNumber(), n: fn.n.toNumber(), ...(dashed ? { dashed } : {}) }
}

function figurePoint(label: string, p: Point): FigurePoint {
  return { label, x: p.x.toNumber(), y: p.y.toNumber() }
}

/**
 * What the coordinate plane of a worked example shows: the graph(s) and the
 * points of the task and its solution (P and Q of a drawn graph, the given
 * points, the zero N, the intersection S). The content tests check that
 * everything has whole numbers and fits into the window.
 */
export function functionExampleFigure(task: FunctionTask): FunctionFigure {
  const f = figureLine(task.fn)
  switch (task.kind) {
    case 'read-equation':
      return { lines: [f], points: [] }
    case 'draw-graph':
      // As in the worked solution: P on the y-axis, Q one step to the right.
      return {
        lines: [f],
        points: [figurePoint('P', point(0, task.fn.n)), figurePoint('Q', point(1, valueAt(task.fn, Rational.ONE)))],
      }
    case 'from-point-slope':
    case 'point-test':
      return { lines: [f], points: [figurePoint('P', task.point)] }
    case 'from-two-points':
      return { lines: [f], points: [figurePoint('P', task.points[0]), figurePoint('Q', task.points[1])] }
    case 'zero':
      return { lines: [f], points: task.zero.kind === 'single' ? [figurePoint('N', point(task.zero.x, 0))] : [] }
    case 'intersection':
      return {
        lines: [f, figureLine(task.other, task.intersection.kind === 'identical')],
        points: task.intersection.kind === 'point' ? [figurePoint('S', task.intersection.point)] : [],
      }
  }
}
