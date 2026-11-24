import { functionExampleFigure } from '../content'
import type { FunctionTask } from '../math'
import type { PlaneLine } from '../plane'
import CoordinatePlane, { type PlaneLineItem, type PlanePointItem } from './plane/CoordinatePlane'

interface FunctionExamplePlaneProps {
  task: FunctionTask
  /** Accessible name in front of the window description. */
  label?: string
  /** A wrong line drawn by the learner, shown dashed next to the right one (model solution in the practice area). */
  drawn?: PlaneLine
}

/** The graph(s) and points of a worked example about linear functions, without movable points. */
export default function FunctionExamplePlane({ task, label = 'Graph zum Beispiel', drawn }: FunctionExamplePlaneProps) {
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
  if (drawn) lines.push({ id: 'drawn', line: drawn, tone: 'danger', dashed: true })
  const points = figure.points.map(
    (p): PlanePointItem => ({ id: p.label, label: p.label, x: p.x, y: p.y, tone: 'pink', showCoordinates: true }),
  )
  return (
    <div className="example-plane">
      <CoordinatePlane label={label} lines={lines} points={points} />
    </div>
  )
}
