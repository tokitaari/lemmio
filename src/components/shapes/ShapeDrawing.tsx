import { labelText, shapeToView, svgPoints, type ShapeLabelLayout, type ShapeLayout } from '../../shapes'

export interface ShapeDrawingProps {
  layout: ShapeLayout
  /** `attempt`: the learner's own figure, dashed in the danger colour and without fill (practice, ST 7). */
  variant?: 'figure' | 'attempt'
  /**
   * False: only height, extension, diagonals and length labels, without outline
   * and vertex names, e.g. above a polygon of the coordinate plane whose
   * points already carry the names.
   */
  outline?: boolean
  /** True inside an element that already carries the description (ShapeFigure). */
  decorative?: boolean
}

/**
 * A figure as an SVG group in the coordinates of the coordinate plane
 * (1 cm = one grid unit, y up): filled outline, dashed height with its
 * right angle and foot, the dashed extension of the base if the foot lies
 * outside, the diagonals of a rhombus and horizontal labels with a halo.
 * Usable inside ShapeFigure and as an overlay of CoordinatePlane.
 */
export default function ShapeDrawing({ layout, variant = 'figure', outline = true, decorative = false }: ShapeDrawingProps) {
  const { height, diagonals } = layout
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': layout.description }
  return (
    <g className={`shape-drawing${variant === 'attempt' ? ' is-attempt' : ''}`} {...a11y}>
      {height?.extension && <Segment className="shape-extension" from={height.extension[0]} to={height.extension[1]} />}
      {outline && <polygon className="shape-outline" points={svgPoints(layout.vertices)} />}
      {diagonals && (
        <g className="shape-diagonals">
          {diagonals.lines.map(([from, to], i) => (
            <Segment key={i} className="shape-diagonal" from={from} to={to} />
          ))}
          <polyline className="shape-right-angle is-muted" points={svgPoints(diagonals.rightAngle)} />
        </g>
      )}
      {height && (
        <g className="shape-height">
          {!height.onVertex && <Segment className="shape-height-line" from={height.top} to={height.foot} />}
          <polyline className="shape-right-angle" points={svgPoints(height.rightAngle)} />
          <circle className="shape-foot" cx={shapeToView(height.foot).x} cy={shapeToView(height.foot).y} r={2.5} />
        </g>
      )}
      {layout.labels
        .filter((label) => outline || label.kind !== 'vertex')
        .map((label) => (
          <Label key={`${label.kind}-${label.id}`} label={label} />
        ))}
    </g>
  )
}

function Segment({ className, from, to }: { className: string; from: readonly [number, number]; to: readonly [number, number] }) {
  const a = shapeToView(from)
  const b = shapeToView(to)
  return <line className={className} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
}

function Label({ label }: { label: ShapeLabelLayout }) {
  const at = shapeToView(label.at)
  const className = ['shape-text', `shape-text-${label.kind}`, label.given ? '' : 'is-unknown'].filter(Boolean).join(' ')
  return (
    <text className={className} x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" data-label={labelText(label)}>
      {label.letter && <tspan className="shape-letter">{label.letter}</tspan>}
      {label.text}
    </text>
  )
}
