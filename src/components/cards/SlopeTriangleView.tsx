import { useMemo, useState } from 'react'
import {
  buildSlopeTriangle,
  fixedQ,
  lineLatex,
  rightAngleMark,
  slopeLatex,
  slopeTriangle,
  triangleAnnouncement,
  triangleDescription,
  triangleLabels,
  type SlopeTriangle,
  type SlopeTriangleModel,
  type SlopeTriangleWidget,
} from '../../cards'
import type { GridPoint } from '../../plane'
import CoordinatePlane, { type PlaneGeometry, type PlanePointItem } from '../plane/CoordinatePlane'
import Tex from '../Tex'

interface TrianglePoints {
  p: GridPoint
  q: GridPoint
}

/** Q follows P in a fixed triangle; in a resizable one both are free on the line. */
function withQ(model: SlopeTriangleModel, points: TrianglePoints): TrianglePoints {
  return model.resizable ? points : { p: points.p, q: fixedQ(model, points.p) }
}

/**
 * Slope triangle at a fixed line: P (and with `resizable` also Q) moves
 * along the line, by pointer or keyboard, through the coordinate plane. The
 * triangle is drawn as an overlay with the legs "rechts" and "hoch"; below,
 * m = hoch : rechts. Every move is announced by the plane, together with
 * the new triangle. Nothing is animated.
 */
export default function SlopeTriangleView({ widget }: { widget: SlopeTriangleWidget }) {
  const model = useMemo(() => buildSlopeTriangle(widget), [widget])
  const [points, setPoints] = useState<TrianglePoints>(model.start)

  const current = withQ(model, points)
  const triangle = slopeTriangle(current.p, current.q)

  const moveTo = (from: TrianglePoints, id: string, at: GridPoint): TrianglePoints =>
    withQ(model, id === 'p' ? { ...from, p: at } : { ...from, q: at })

  const items: PlanePointItem[] = [
    { id: 'p', label: 'P', x: current.p.x, y: current.p.y, drag: model.pDrag, showCoordinates: true },
    { id: 'q', label: 'Q', x: current.q.x, y: current.q.y, drag: model.qDrag, showCoordinates: true },
  ]

  return (
    <div className="widget slope-widget">
      <CoordinatePlane
        window={model.window}
        label={widget.label ?? 'Steigungsdreieck'}
        lines={[{ id: 'f', line: model.line, label: model.name }]}
        points={items}
        onPointChange={(id, at) => setPoints((from) => moveTo(from, id, at))}
        describe={(id, at) => {
          // Only the point with this id moved; the other one is still where it is drawn.
          const moved = moveTo(current, id, at)
          return triangleAnnouncement(slopeTriangle(moved.p, moved.q))
        }}
        overlay={(geometry) => <TriangleDrawing triangle={triangle} geometry={geometry} />}
      />
      <p className="line-equation">
        <Tex latex={lineLatex(model.line, model.name)} />
      </p>
      <p className="slope-calc">
        <Tex latex={slopeLatex(triangle)} />
      </p>
    </div>
  )
}

/** The triangle with its legs, the right angle and the labels, in SVG units of the plane. */
function TriangleDrawing({ triangle, geometry }: { triangle: SlopeTriangle; geometry: PlaneGeometry }) {
  const { toView } = geometry
  const left = toView(triangle.left)
  const right = toView(triangle.right)
  const corner = toView(triangle.corner)
  const labels = triangleLabels(triangle, geometry.window)
  const mark = rightAngleMark(triangle)
    .map((p) => toView(p))
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
  const run = toView(labels.run.at)
  const rise = toView(labels.rise.at)
  return (
    <g className="slope-triangle" role="img" aria-label={triangleDescription(triangle)}>
      <polygon className="slope-area" points={`${left.x},${left.y} ${corner.x},${corner.y} ${right.x},${right.y}`} />
      {/* The area covers the line between P and Q, so that part of the line is drawn again on top. */}
      <line className="slope-hypotenuse" x1={left.x} y1={left.y} x2={right.x} y2={right.y} />
      <line className="slope-leg" x1={left.x} y1={left.y} x2={corner.x} y2={corner.y} />
      <line className="slope-leg" x1={corner.x} y1={corner.y} x2={right.x} y2={right.y} />
      <polyline className="slope-corner" points={mark} />
      <text className="slope-label" x={run.x} y={run.y} textAnchor={labels.run.anchor} dominantBaseline="central">
        {labels.run.text}
      </text>
      <text className="slope-label" x={rise.x} y={rise.y} textAnchor={labels.rise.anchor} dominantBaseline="central">
        {labels.rise.text}
      </text>
    </g>
  )
}
