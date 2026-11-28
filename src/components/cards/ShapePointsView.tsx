import { useMemo, useState } from 'react'
import {
  buildShapePoints,
  HEIGHT_OUTSIDE_NOTE,
  moveVertex,
  SHAPE_POINTS_HINT,
  shapePointsAnnouncement,
  shapePointsState,
  shapePolygonText,
  shapeTargetHint,
  shapeTargetReached,
  vertexDrag,
  type ShapePointsWidget,
  type ShapeVertices,
} from '../../cards'
import { layoutShape, SHAPE_NAMES, VERTEX_NAMES } from '../../shapes'
import CoordinatePlane, { type PlanePointItem } from '../plane/CoordinatePlane'
import ShapeDrawing from '../shapes/ShapeDrawing'
import Tex from '../Tex'

/** Point ids are the indices of the vertices: `v0` is A, `v1` is B, … */
const vertexId = (i: number) => `v${i}`
const vertexIndex = (id: string) => Number(id.slice(1))

/**
 * A figure on the geometry grid (no axes, one square = 1 cm) with movable
 * vertices; the vertices that keep the shape follow (see
 * src/cards/shapePoints.ts). Lengths, height and area follow every move;
 * the plane announces each move with the new lengths and the area. With a
 * target area the status says when it is reached. Nothing is animated.
 */
export default function ShapePointsView({ widget }: { widget: ShapePointsWidget }) {
  const model = useMemo(() => buildShapePoints(widget), [widget])
  const [vertices, setVertices] = useState<ShapeVertices>(model.start)
  const state = useMemo(() => shapePointsState(model, vertices), [model, vertices])
  const layout = useMemo(() => layoutShape(state.figure), [state.figure])
  const target = model.target

  const points = vertices.map((v, i): PlanePointItem => {
    const drag = vertexDrag(model, vertices, i)
    const item = { id: vertexId(i), label: VERTEX_NAMES[i] ?? '?', x: v.x, y: v.y }
    return drag ? { ...item, drag } : { ...item, tone: 'muted' }
  })

  return (
    <div className="widget shape-widget">
      <CoordinatePlane
        axes={false}
        window={model.window}
        label={widget.label ?? `${SHAPE_NAMES[model.shape]} mit ziehbaren Ecken`}
        polygons={[{ id: 'shape', points: vertices, description: shapePolygonText(model.shape, vertices) }]}
        points={points}
        onPointChange={(id, p) => setVertices((from) => moveVertex(model, from, vertexIndex(id), p))}
        describe={(id, p) => shapePointsAnnouncement(model, moveVertex(model, vertices, vertexIndex(id), p))}
        overlay={() => <ShapeDrawing layout={layout} outline={false} decorative />}
      />
      <p className="line-note">{SHAPE_POINTS_HINT[model.shape]}</p>
      <p className="shape-values">
        {state.lengths.map((length) => (
          <span key={length.letter}>
            <span className="shape-letter">{length.letter}</span>
            {length.text}
          </span>
        ))}
      </p>
      <p className="shape-formula">
        <Tex latex={state.latex} />
      </p>
      {state.outside && <p className="shape-note">{HEIGHT_OUTSIDE_NOTE}</p>}
      {target !== undefined && (
        <p className={state.reached ? 'line-status is-done' : 'line-status'}>
          {state.reached ? shapeTargetReached(target) : shapeTargetHint(target)}
        </p>
      )}
    </div>
  )
}
