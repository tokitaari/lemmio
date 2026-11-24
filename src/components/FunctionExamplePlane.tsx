import { functionExampleFigure } from '../content'
import type { FunctionTask } from '../math'
import CoordinatePlane, { type PlaneLineItem, type PlanePointItem } from './plane/CoordinatePlane'

/** The graph(s) and points of a worked example about linear functions, without movable points. */
export default function FunctionExamplePlane({ task }: { task: FunctionTask }) {
  const figure = functionExampleFigure(task)
  const lines = figure.lines.map(
    (line): PlaneLineItem => ({
      id: line.name,
      label: line.name,
      line: { kind: 'function', m: line.m, n: line.n },
      tone: line.name === task.fn.name ? 'accent' : 'pink',
      ...(line.dashed ? { dashed: true } : {}),
    }),
  )
  const points = figure.points.map(
    (p): PlanePointItem => ({ id: p.label, label: p.label, x: p.x, y: p.y, tone: 'pink', showCoordinates: true }),
  )
  return (
    <div className="example-plane">
      <CoordinatePlane label="Graph zum Beispiel" lines={lines} points={points} />
    </div>
  )
}
