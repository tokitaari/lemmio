import { useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import {
  AXIS_OVERSHOOT,
  axisTicks,
  clientToPlane,
  clipLine,
  DEFAULT_WINDOW,
  describeWindow,
  dragHint,
  edgeAnnouncement,
  formatNumber,
  gridLines,
  lineLabelAnchor,
  lineText,
  movePoint,
  occupiedAnnouncement,
  placeAt,
  planeFrame,
  planeKey,
  pointAnnouncement,
  pointLabelOffset,
  pointLabelText,
  pointValueRange,
  pointValueText,
  sameGridPoint,
  snapPoint,
  toView,
  UNIT,
  type GridPoint,
  type PlaneLine,
  type PlanePosition,
  type PlaneWindow,
  type PointDrag,
} from '../../plane'

/** Colour of a line or point; f is usually `accent`, g `pink`. */
export type PlaneTone = 'accent' | 'pink' | 'muted' | 'danger'

export interface PlaneLineItem {
  id: string
  line: PlaneLine
  /** Name shown at the line, e.g. "f"; also used in the accessible name ("Gerade f(x) = …"). */
  label?: string
  tone?: PlaneTone
  dashed?: boolean
  /**
   * Accessible name instead of "Gerade f(x) = …", for lines whose equation
   * the learner has to find (e.g. "Gerade f durch (0|2) und (1|1)").
   */
  description?: string
}

export interface PlanePointItem {
  id: string
  /** Name, e.g. "P". */
  label: string
  x: number
  y: number
  /** Movable if set; see `PointDrag`. */
  drag?: PointDrag
  tone?: PlaneTone
  /** Shows "P(2|5)" instead of "P". */
  showCoordinates?: boolean
  /**
   * Direction of the name from the point (plane units, y up), e.g. outside
   * along the bisector for the vertices of a figure, so that the name does
   * not run into the side labels. Without it the name stands to the upper
   * right (left or below near the edge).
   */
  labelDirection?: PlanePosition
}

/** A filled polygon, e.g. a figure drawn on the geometry grid. */
export interface PlanePolygonItem {
  id: string
  /** Vertices in grid units, in order. */
  points: readonly PlanePosition[]
  tone?: PlaneTone
  dashed?: boolean
  /** Lightly filled in its tone; false: outline only. Default true. */
  filled?: boolean
  /** Accessible name, e.g. "Dreieck ABC mit A(2|2), B(8|2), C(4|7)". */
  description: string
}

/** What an overlay needs to draw in the plane's coordinates. */
export interface PlaneGeometry {
  window: PlaneWindow
  /** SVG units per grid unit. */
  unit: number
  /** Grid units → SVG units. */
  toView: (p: PlanePosition) => { x: number; y: number }
}

export interface CoordinatePlaneProps {
  /** Visible window; −8…8 on both axes by default. Check custom windows with `planeWindowProblems`. */
  window?: PlaneWindow
  /** False: a plain grid without axes, numbers and axis names (geometry, one square = 1 cm). Default true. */
  axes?: boolean
  lines?: readonly PlaneLineItem[]
  /** Drawn above the grid, below lines, overlay and points. */
  polygons?: readonly PlanePolygonItem[]
  points?: readonly PlanePointItem[]
  /** A movable point snapped to a new grid point (pointer or keyboard). The caller updates `points`. */
  onPointChange?: (id: string, p: GridPoint) => void
  /** Tapping the grid gives the nearest grid point (pointer only; keyboard users move existing points). */
  onPlace?: (p: GridPoint) => void
  /** Extra text for the announcement after a move, e.g. the new equation. */
  describe?: (id: string, p: GridPoint) => string
  /** Accessible name in front of the window description. */
  label?: string
  /** Extra drawing (e.g. a slope triangle), above the lines and below the points. */
  overlay?: (geometry: PlaneGeometry) => ReactNode
}

/** Radii of a point in SVG units: hit area, focus ring, dot of a movable and of a fixed point. */
const POINT_RADIUS = { hit: 22, ring: 12, movable: 7, fixed: 5 } as const

/** Arrow tip of an axis: length and half width in SVG units. */
const ARROW = { length: 9, half: 5 } as const

/** Offsets of the numbers from their axis, in SVG units. */
const TICK = { size: 4, below: 15, left: 6 } as const

const geometryToView = (p: PlanePosition) => toView(p)

/** SVG points attribute of a polygon in grid units. */
function polygonPoints(points: readonly PlanePosition[]): string {
  return points
    .map((p) => {
      const v = toView(p)
      return `${v.x},${v.y}`
    })
    .join(' ')
}

/**
 * Coordinate plane as SVG: grid, axes with numbers (or, with
 * `axes={false}`, a plain grid), polygons, lines clipped to the window,
 * fixed and movable points. Movable points snap to grid points while
 * they are dragged (Pointer Events with pointer capture) and move with the
 * arrow keys, Pos1/Ende and Bild↑/Bild↓; they are sliders for assistive
 * technology, and every completed move is announced in a live region.
 *
 * The component is controlled: it reports moves with `onPointChange` and
 * shows the points it is given. A grid point taken by another movable point
 * cannot be entered. Nothing is animated, so reduced motion needs no extra
 * handling.
 */
export default function CoordinatePlane({
  window: win = DEFAULT_WINDOW,
  axes = true,
  lines = [],
  polygons = [],
  points = [],
  onPointChange,
  onPlace,
  describe,
  label,
  overlay,
}: CoordinatePlaneProps) {
  const frame = useMemo(() => planeFrame(win, { axes }), [win, axes])
  const grid = useMemo(() => gridLines(win), [win])
  const ticks = useMemo(() => ({ x: axisTicks(win, 'x'), y: axisTicks(win, 'y') }), [win])

  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState<string | null>(null)
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ pointerId: number; id: string; start: GridPoint; last: GridPoint } | null>(null)

  const [xMin, xMax] = win.x
  const [yMin, yMax] = win.y
  const view = frame.view

  /** Other movable points block a grid point; fixed points do not. */
  const occupiedFor = (id: string): GridPoint[] =>
    points.filter((p) => p.id !== id && p.drag).map((p) => ({ x: p.x, y: p.y }))

  const announceMove = (item: PlanePointItem, p: GridPoint) => {
    const extra = describe?.(item.id, p)
    setAnnouncement(extra ? `${pointAnnouncement(item.label, p)}. ${extra}` : pointAnnouncement(item.label, p))
  }

  // ---- Keyboard

  const onPointKey = (e: KeyboardEvent<SVGGElement>, item: PlanePointItem) => {
    const key = planeKey(e.key)
    if (!key || !item.drag || e.altKey || e.ctrlKey || e.metaKey) return
    // Always handled here, so the card deck does not turn the card.
    e.preventDefault()
    const occupied = occupiedFor(item.id)
    const result = movePoint({ x: item.x, y: item.y }, key, item.drag, win, occupied)
    if (result.kind === 'moved') {
      onPointChange?.(item.id, result.point)
      announceMove(item, result.point)
    } else if (result.kind === 'edge') {
      setAnnouncement(edgeAnnouncement(item.label, result.bound === true))
    } else {
      const other = points.find((p) => p.id !== item.id && p.drag && sameGridPoint(p, result.by))
      setAnnouncement(occupiedAnnouncement(other?.label ?? 'ein Punkt'))
    }
  }

  // ---- Pointer

  const pointerAt = (clientX: number, clientY: number): PlanePosition | null => {
    const svg = svgRef.current
    return svg ? clientToPlane(frame, svg.getBoundingClientRect(), clientX, clientY) : null
  }

  const onPointDown = (e: PointerEvent<SVGGElement>, item: PlanePointItem) => {
    if (e.button !== 0 || !item.drag) return
    e.preventDefault()
    const el = e.currentTarget
    el.focus()
    if (typeof el.setPointerCapture === 'function') el.setPointerCapture(e.pointerId)
    const at = { x: item.x, y: item.y }
    drag.current = { pointerId: e.pointerId, id: item.id, start: at, last: at }
    setDragging(item.id)
  }

  const onPointMove = (e: PointerEvent<SVGGElement>, item: PlanePointItem) => {
    const current = drag.current
    if (!current || current.pointerId !== e.pointerId || current.id !== item.id || !item.drag) return
    const raw = pointerAt(e.clientX, e.clientY)
    if (!raw) return
    const next = snapPoint(raw, current.last, item.drag, win, occupiedFor(item.id))
    if (sameGridPoint(next, current.last)) return
    current.last = next
    onPointChange?.(item.id, next)
  }

  // Up, cancel and lost capture all end the drag; the move is announced once, at the end.
  const onPointUp = (e: PointerEvent<SVGGElement>, item: PlanePointItem) => {
    const current = drag.current
    if (!current || current.pointerId !== e.pointerId) return
    drag.current = null
    setDragging(null)
    if (!sameGridPoint(current.start, current.last)) announceMove(item, current.last)
  }

  const onGridClick = (e: MouseEvent<SVGRectElement>) => {
    const raw = pointerAt(e.clientX, e.clientY)
    const p = raw && placeAt(raw, win)
    if (p) onPlace?.(p)
  }

  // ---- Drawing

  const geometry: PlaneGeometry = { window: win, unit: UNIT, toView: geometryToView }
  const hintKinds = [...new Set(points.flatMap((p) => (p.drag ? [p.drag.kind] : [])))]
  const xTip = (xMax + AXIS_OVERSHOOT) * UNIT
  const yTip = -(yMax + AXIS_OVERSHOOT) * UNIT
  const windowText = describeWindow(win, { axes })
  const name = label ? `${label}. ${windowText}` : windowText

  return (
    <div className="plane">
      <svg
        ref={svgRef}
        className="plane-svg"
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        role="group"
        aria-label={name}
      >
        <g className="plane-grid" aria-hidden="true">
          {grid.x.map((x) => (
            <line key={`x${x}`} x1={x * UNIT} y1={-yMin * UNIT} x2={x * UNIT} y2={-yMax * UNIT} />
          ))}
          {grid.y.map((y) => (
            <line key={`y${y}`} x1={xMin * UNIT} y1={-y * UNIT} x2={xMax * UNIT} y2={-y * UNIT} />
          ))}
        </g>

        {axes && (
          <g className="plane-axes" aria-hidden="true">
            <line x1={xMin * UNIT} y1={0} x2={xTip} y2={0} />
            <line x1={0} y1={-yMin * UNIT} x2={0} y2={yTip} />
            <polygon
              className="plane-arrow"
              points={`${xTip},0 ${xTip - ARROW.length},${-ARROW.half} ${xTip - ARROW.length},${ARROW.half}`}
            />
            <polygon
              className="plane-arrow"
              points={`0,${yTip} ${-ARROW.half},${yTip + ARROW.length} ${ARROW.half},${yTip + ARROW.length}`}
            />
            {ticks.x.map((t) => (
              <line key={`tx${t.value}`} x1={t.value * UNIT} y1={-TICK.size} x2={t.value * UNIT} y2={TICK.size} />
            ))}
            {ticks.y.map((t) => (
              <line key={`ty${t.value}`} x1={-TICK.size} y1={-t.value * UNIT} x2={TICK.size} y2={-t.value * UNIT} />
            ))}
            {ticks.x.map(
              (t) =>
                t.label && (
                  <text
                    key={`lx${t.value}`}
                    className="plane-number"
                    x={t.value * UNIT}
                    y={TICK.below}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {t.label}
                  </text>
                ),
            )}
            {ticks.y.map(
              (t) =>
                t.label && (
                  <text
                    key={`ly${t.value}`}
                    className="plane-number"
                    x={-TICK.left}
                    y={-t.value * UNIT}
                    textAnchor="end"
                    dominantBaseline="central"
                  >
                    {t.label}
                  </text>
                ),
            )}
            <text className="plane-number" x={-TICK.left} y={TICK.below} textAnchor="end" dominantBaseline="central">
              {formatNumber(0)}
            </text>
            <text className="plane-axis-name" x={xTip} y={-14} textAnchor="end" dominantBaseline="central">
              x
            </text>
            <text className="plane-axis-name" x={12} y={yTip + 4} textAnchor="start" dominantBaseline="central">
              y
            </text>
          </g>
        )}

        {polygons.map((item) => (
          <g
            key={item.id}
            className={[
              'plane-polygon',
              `plane-tone-${item.tone ?? 'accent'}`,
              item.filled === false ? '' : 'is-filled',
              item.dashed ? 'is-dashed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="img"
            aria-label={item.description}
          >
            <polygon points={polygonPoints(item.points)} />
          </g>
        ))}

        {lines.map((item) => {
          const segment = clipLine(item.line, win)
          if (!segment) return null
          const from = toView(segment.from)
          const to = toView(segment.to)
          const anchor = item.label ? toView(lineLabelAnchor(segment, win)) : null
          return (
            <g
              key={item.id}
              className={`plane-line plane-tone-${item.tone ?? 'accent'}${item.dashed ? ' is-dashed' : ''}`}
              role="img"
              aria-label={item.description ?? `Gerade ${lineText(item.line, item.label)}`}
            >
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
              {anchor && (
                <text className="plane-line-label" x={anchor.x} y={anchor.y} textAnchor="middle" dominantBaseline="central">
                  {item.label}
                </text>
              )}
            </g>
          )
        })}

        {onPlace && (
          <rect
            className="plane-place"
            x={(xMin - 0.5) * UNIT}
            y={-(yMax + 0.5) * UNIT}
            width={(xMax - xMin + 1) * UNIT}
            height={(yMax - yMin + 1) * UNIT}
            onClick={onGridClick}
          />
        )}

        {overlay?.(geometry)}

        {points.map((item) => {
          const at = toView(item)
          const text = item.showCoordinates ? pointLabelText(item.label, item) : item.label
          // Labels go to the upper right, or to the left/below near the right/top edge, unless a direction is given.
          const leftSide = item.x >= xMax - 1
          const below = item.y >= yMax - 0.5
          const placed = item.labelDirection ? pointLabelOffset(item.labelDirection, text) : null
          const labelX = placed ? placed.x : leftSide ? -10 : 10
          const labelY = placed ? placed.y : below ? 16 : -12
          const anchor = placed ? 'middle' : leftSide ? 'end' : 'start'
          const className = [
            'plane-point',
            `plane-tone-${item.tone ?? 'accent'}`,
            item.drag ? 'is-movable' : '',
            dragging === item.id ? 'is-dragging' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const pointLabel = (
            <text className="plane-point-label" x={labelX} y={labelY} textAnchor={anchor} dominantBaseline="central">
              {text}
            </text>
          )
          if (!item.drag) {
            return (
              <g
                key={item.id}
                className={className}
                transform={`translate(${at.x} ${at.y})`}
                role="img"
                aria-label={`Punkt ${item.label}: ${pointValueText(item)}`}
              >
                <circle className="plane-point-dot" r={POINT_RADIUS.fixed} />
                {pointLabel}
              </g>
            )
          }
          const range = pointValueRange(item, item.drag, win)
          const kind = item.drag.kind
          return (
            <g
              key={item.id}
              className={className}
              transform={`translate(${at.x} ${at.y})`}
              role="slider"
              tabIndex={0}
              aria-roledescription="verschiebbarer Punkt"
              aria-label={`Punkt ${item.label}`}
              aria-valuenow={range.now}
              aria-valuemin={range.min}
              aria-valuemax={range.max}
              aria-valuetext={pointValueText(item)}
              aria-orientation={kind === 'vertical' ? 'vertical' : kind === 'free' ? undefined : 'horizontal'}
              aria-describedby={`${ids}-hint-${kind}`}
              onPointerDown={(e) => onPointDown(e, item)}
              onPointerMove={(e) => onPointMove(e, item)}
              onPointerUp={(e) => onPointUp(e, item)}
              onPointerCancel={(e) => onPointUp(e, item)}
              onLostPointerCapture={(e) => onPointUp(e, item)}
              onKeyDown={(e) => onPointKey(e, item)}
            >
              <circle className="plane-point-hit" r={POINT_RADIUS.hit} />
              <circle className="plane-point-ring" r={POINT_RADIUS.ring} />
              <circle className="plane-point-dot" r={POINT_RADIUS.movable} />
              {pointLabel}
            </g>
          )
        })}
      </svg>

      {hintKinds.map((kind) => (
        <p key={kind} id={`${ids}-hint-${kind}`} hidden>
          {dragHint(kind)}
        </p>
      ))}

      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
