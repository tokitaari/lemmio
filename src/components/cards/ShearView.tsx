import { useMemo, useState } from 'react'
import {
  buildShear,
  HEIGHT_OUTSIDE_NOTE,
  SHEAR_COMPARE,
  SHEAR_HINT,
  shearAnnouncement,
  shearAreaText,
  shearCompare,
  shearDrag,
  shearMove,
  shearState,
  shearTrack,
  shearTrackText,
  shapePolygonText,
  type ShapeVertices,
  type ShearWidget,
} from '../../cards'
import { layoutShape, SHAPE_NAMES, VERTEX_NAMES, vertexLabelDirections } from '../../shapes'
import CoordinatePlane, { type PlanePointItem, type PlanePolygonItem } from '../plane/CoordinatePlane'
import ShapeDrawing from '../shapes/ShapeDrawing'
import Tex from '../Tex'

const vertexId = (i: number) => `v${i}`

/**
 * Shear on the geometry grid: only the top vertex moves, left and right
 * along the dashed parallel to AB (pointer, arrow keys, Pos1/Ende); C of a
 * parallelogram follows. Base, height and area stay; a parallelogram shows
 * the rectangle with the same base and height dashed for comparison. The
 * plane announces each move with lengths and area. Nothing is animated.
 */
export default function ShearView({ widget }: { widget: ShearWidget }) {
  const model = useMemo(() => buildShear(widget), [widget])
  const [vertices, setVertices] = useState<ShapeVertices>(model.start)
  const state = useMemo(() => shearState(model, vertices), [model, vertices])
  const layout = useMemo(() => layoutShape(state.figure), [state.figure])
  const compare = shearCompare(model, vertices)

  // Vertex names outside along the bisector (as in ShapeFigure), so they do not run into the side labels.
  const directions = useMemo(() => vertexLabelDirections(layout.vertices), [layout.vertices])
  const points = vertices.map((v, i): PlanePointItem => {
    const direction = directions[i]
    const item = {
      id: vertexId(i),
      label: VERTEX_NAMES[i] ?? '?',
      x: v.x,
      y: v.y,
      ...(direction ? { labelDirection: { x: direction[0], y: direction[1] } } : {}),
    }
    return i === model.top ? { ...item, drag: shearDrag(model, vertices) } : { ...item, tone: 'muted' }
  })
  const polygons: PlanePolygonItem[] = [{ id: 'shape', points: vertices, description: shapePolygonText(model.shape, vertices) }]
  if (compare) polygons.push({ id: 'compare', points: compare, tone: 'muted', dashed: true, filled: false, description: SHEAR_COMPARE })

  return (
    <div className="widget shape-widget shear-widget">
      <CoordinatePlane
        axes={false}
        window={model.window}
        label={widget.label ?? `${SHAPE_NAMES[model.shape]} scheren`}
        lines={[
          {
            id: 'track',
            line: { kind: 'function', m: 0, n: shearTrack(model, vertices) },
            tone: 'muted',
            dashed: true,
            description: shearTrackText(model),
          },
        ]}
        polygons={polygons}
        points={points}
        onPointChange={(_id, p) => setVertices((from) => shearMove(model, from, p))}
        describe={(_id, p) => shearAnnouncement(model, shearMove(model, vertices, p))}
        overlay={() => <ShapeDrawing layout={layout} outline={false} decorative />}
      />
      <p className="line-note">{SHEAR_HINT[model.shape]}</p>
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
      <p className={state.status ? 'line-status is-done' : 'line-status'}>{state.status ?? shearAreaText(state)}</p>
    </div>
  )
}
