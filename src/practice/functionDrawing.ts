import { lineThroughPoints, point } from '../math'
import { sameGridPoint, type GridPoint, type PlaneLine } from '../plane'

/** The two points of a graph being drawn in the practice; `null` until the point is set. */
export interface Drawing {
  p: GridPoint | null
  q: GridPoint | null
}

export const NO_POINTS: Drawing = { p: null, q: null }

/**
 * Where "Punkt setzen" puts a point for keyboard users: P on (0|0), Q on
 * (1|0); if the other point is there, the next free grid point on the x-axis
 * (one to the right, one to the left, two to the right, …).
 */
export function startPoint(which: 'P' | 'Q', other: GridPoint | null): GridPoint {
  const first = which === 'P' ? 0 : 1
  for (let step = 0; ; step++) {
    const offset = step % 2 === 1 ? (step + 1) / 2 : -step / 2
    const candidate = { x: first + offset + 0, y: 0 }
    if (!other || !sameGridPoint(candidate, other)) return candidate
  }
}

/** The line through the drawn points (also a vertical one), or `null` while there are not two different points. */
export function drawnLine({ p, q }: Drawing): PlaneLine | null {
  if (!p || !q || sameGridPoint(p, q)) return null
  const line = lineThroughPoints(point(p.x, p.y), point(q.x, q.y))
  if (line.kind === 'function') return { kind: 'function', m: line.m, n: line.n }
  return line.kind === 'vertical' ? { kind: 'vertical', x: line.x } : null
}
