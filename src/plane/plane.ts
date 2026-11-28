import { FUNCTION_WINDOW, functionToText, linearFunction, Rational } from '../math'

/**
 * Coordinate plane: window, grid, lines clipped to the window, conversion
 * between grid units and SVG units, snapping of points to grid points and
 * keyboard steps. Pure logic without React; the component is
 * src/components/plane/CoordinatePlane.tsx.
 *
 * Points of the plane are integer grid points (`GridPoint`); callers convert
 * them to `Point` of src/math with `point(x, y)`.
 */

// ---------------------------------------------------------------------------
// Types

/** Inclusive integer range [min, max]. */
export type Range = readonly [min: number, max: number]

/** Visible part of the plane in grid units, e.g. −8…8 on both axes. */
export interface PlaneWindow {
  x: Range
  y: Range
}

/** A point with integer coordinates. */
export interface GridPoint {
  x: number
  y: number
}

/** A position in grid units (not necessarily integer), e.g. under the pointer. */
export interface PlanePosition {
  x: number
  y: number
}

/**
 * A straight line: the graph of y = mx + n or a vertical line x = c. Numbers
 * must be integers when given as numbers. The shape matches
 * `lineThroughPoints` of src/math (apart from "same-point").
 */
export type PlaneLine =
  | { kind: 'function'; m: Rational | number; n: Rational | number }
  | { kind: 'vertical'; x: Rational | number }

/**
 * How a point may be moved:
 * - `free`: to every grid point of the window
 * - `vertical`: up and down, x stays (e.g. n on the y-axis)
 * - `horizontal`: left and right, y stays (e.g. a zero on the x-axis)
 * - `on-line`: only to grid points on the line; `range` limits them to
 *   x values in [min, max] (y values for a vertical line), e.g. so that a
 *   slope triangle attached to the point stays inside the window
 *
 * `bounds` limits `free`, `vertical` and `horizontal` points to a part of
 * the window (for `vertical` only its y-range counts, for `horizontal` only
 * its x-range), e.g. so that the top vertex of a figure stays above its base
 * and a vertex that follows it stays inside the window.
 */
export type PointDrag =
  | { kind: 'free'; bounds?: PlaneWindow }
  | { kind: 'vertical'; bounds?: PlaneWindow }
  | { kind: 'horizontal'; bounds?: PlaneWindow }
  | { kind: 'on-line'; line: PlaneLine; range?: Range }

/** Keys a movable point reacts to (see `planeKey`). */
export type PlaneKey = 'left' | 'right' | 'up' | 'down' | 'home' | 'end' | 'page-up' | 'page-down'

/**
 * Outcome of a keyboard step: moved, or stopped at the edge or by another
 * point. `bound` marks an edge that is the point's `bounds`, not the window.
 */
export type PointMove =
  | { kind: 'moved'; point: GridPoint }
  | { kind: 'edge'; bound?: true }
  | { kind: 'occupied'; by: GridPoint }

// ---------------------------------------------------------------------------
// Window

/** Standard window −8…8 on both axes; the generated graph tasks fit into it. */
export const DEFAULT_WINDOW: PlaneWindow = { x: [-FUNCTION_WINDOW, FUNCTION_WINDOW], y: [-FUNCTION_WINDOW, FUNCTION_WINDOW] }

/** Smallest and largest span of an axis in grid units. */
export const WINDOW_SPAN = { min: 4, max: 20 } as const

/** Up to this span every integer of an axis is labelled, above it every second one. */
export const LABEL_EVERY_UNIT_UP_TO = 10

/** German problems of a window; empty if it can be drawn. Both axes must be visible, so 0 lies on both ranges. */
export function planeWindowProblems(window: PlaneWindow): string[] {
  const problems: string[] = []
  for (const axis of ['x', 'y'] as const) {
    const [min, max] = window[axis]
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      problems.push(`${axis}-Bereich: Grenzen müssen ganze Zahlen sein.`)
      continue
    }
    if (min > 0 || max < 0) problems.push(`${axis}-Bereich: 0 muss im Fenster liegen, damit die Achse sichtbar ist.`)
    const span = max - min
    if (span < WINDOW_SPAN.min || span > WINDOW_SPAN.max) {
      problems.push(`${axis}-Bereich: Spannweite ${span}, erlaubt sind ${WINDOW_SPAN.min} bis ${WINDOW_SPAN.max}.`)
    }
  }
  return problems
}

export function inWindow(window: PlaneWindow, p: PlanePosition): boolean {
  return p.x >= window.x[0] && p.x <= window.x[1] && p.y >= window.y[0] && p.y <= window.y[1]
}

function clamp(value: number, [min, max]: Range): number {
  return Math.min(max, Math.max(min, value))
}

// ---------------------------------------------------------------------------
// Frame: grid units ↔ SVG units

/** SVG units per grid unit. Both axes use the same scale, so slopes are not distorted. */
export const UNIT = 20

/**
 * Margins around the window in grid units. Right and top hold the arrow tips
 * and the axis names; left and bottom grow when an axis lies on the edge of
 * the window, so its numbers still fit.
 */
export const MARGIN = { right: 1.1, top: 1.1, side: 0.4, labels: 1.4 } as const

/** How far the axes reach beyond the window, in grid units. */
export const AXIS_OVERSHOOT = 0.7

export interface PlaneFrame {
  window: PlaneWindow
  /** viewBox in SVG units; the origin of the plane is at SVG (0, 0), y points up in the plane and down in SVG. */
  view: { x: number; y: number; width: number; height: number }
}

/**
 * Frame of a window. Without axes (`axes: false`, a plain grid for geometry)
 * every side gets the narrow margin, since there are no arrows, numbers or
 * axis names.
 */
export function planeFrame(window: PlaneWindow, { axes = true }: { axes?: boolean } = {}): PlaneFrame {
  if (!axes) return frameWithMargins(window, MARGIN.side, MARGIN.side, MARGIN.side, MARGIN.side)
  const left = window.x[0] === 0 ? MARGIN.labels : MARGIN.side
  const bottom = window.y[0] === 0 ? MARGIN.labels : MARGIN.side
  return frameWithMargins(window, left, bottom, MARGIN.right, MARGIN.top)
}

function frameWithMargins(window: PlaneWindow, left: number, bottom: number, right: number, top: number): PlaneFrame {
  // Rounded, so the viewBox carries no floating-point noise.
  const r = (v: number) => Math.round(v * 100) / 100 + 0
  const x = r((window.x[0] - left) * UNIT)
  const y = r(-(window.y[1] + top) * UNIT)
  const width = r((window.x[1] - window.x[0] + left + right) * UNIT)
  const height = r((window.y[1] - window.y[0] + bottom + top) * UNIT)
  return { window, view: { x, y, width, height } }
}

/** Grid units → SVG units. */
export function toView(p: PlanePosition): { x: number; y: number } {
  // `+ 0` turns −0 into 0, so attributes read "0".
  return { x: p.x * UNIT + 0, y: -p.y * UNIT + 0 }
}

/** SVG units → grid units. */
export function fromView(x: number, y: number): PlanePosition {
  return { x: x / UNIT + 0, y: -y / UNIT + 0 }
}

/**
 * Pointer position in client pixels → grid units, given the bounding box of
 * the SVG element. Returns null while the SVG has no size.
 */
export function clientToPlane(
  frame: PlaneFrame,
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): PlanePosition | null {
  if (box.width <= 0 || box.height <= 0) return null
  const { view } = frame
  const x = view.x + ((clientX - box.left) / box.width) * view.width
  const y = view.y + ((clientY - box.top) / box.height) * view.height
  const p = fromView(x, y)
  return Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null
}

// ---------------------------------------------------------------------------
// Grid and axes

function integers([min, max]: Range): number[] {
  const values: number[] = []
  for (let v = Math.ceil(min); v <= max; v++) values.push(v)
  return values
}

/** Positions of the grid lines: every integer of the window. */
export function gridLines(window: PlaneWindow): { x: number[]; y: number[] } {
  return { x: integers(window.x), y: integers(window.y) }
}

/** 1 for small spans, 2 above `LABEL_EVERY_UNIT_UP_TO`. */
export function labelStep([min, max]: Range): number {
  return max - min <= LABEL_EVERY_UNIT_UP_TO ? 1 : 2
}

export interface AxisTick {
  value: number
  /** Number shown next to the tick (with a real minus), or null. */
  label: string | null
}

/** Ticks of an axis at every integer except 0; 0 is labelled once at the origin. */
export function axisTicks(window: PlaneWindow, axis: 'x' | 'y'): AxisTick[] {
  const step = labelStep(window[axis])
  return integers(window[axis])
    .filter((v) => v !== 0)
    .map((value) => ({ value, label: value % step === 0 ? formatNumber(value) : null }))
}

// ---------------------------------------------------------------------------
// Lines

const toRational = (value: Rational | number): Rational => (value instanceof Rational ? value : Rational.of(value))

export interface Segment {
  from: PlanePosition
  to: PlanePosition
}

/**
 * The part of a line inside the window, from edge to edge; `from` is the left
 * end (the lower end of a vertical line). Null if the line misses the window
 * or only touches a corner.
 */
export function clipLine(line: PlaneLine, window: PlaneWindow): Segment | null {
  const [xMin, xMax] = window.x
  const [yMin, yMax] = window.y
  if (line.kind === 'vertical') {
    const x = toRational(line.x).toNumber()
    return x >= xMin && x <= xMax ? { from: { x, y: yMin }, to: { x, y: yMax } } : null
  }
  const m = toRational(line.m).toNumber()
  const n = toRational(line.n).toNumber()
  if (m === 0) return n >= yMin && n <= yMax ? { from: { x: xMin, y: n }, to: { x: xMax, y: n } } : null
  const a = (yMin - n) / m
  const b = (yMax - n) / m
  const lo = Math.max(xMin, Math.min(a, b))
  const hi = Math.min(xMax, Math.max(a, b))
  if (!(lo < hi)) return null
  // Exact window values at the ends where the line leaves through the top or bottom.
  const yAt = (x: number) => clamp(m * x + n, window.y)
  return { from: { x: lo, y: yAt(lo) }, to: { x: hi, y: yAt(hi) } }
}

/** Distance of the line label from the right (upper) end, along the line and sideways, in grid units. */
const LABEL_INSET = { along: 0.9, aside: 0.6, edge: 0.35 } as const

/**
 * Position of the line's name (e.g. "f"): near the right end of the visible
 * segment (the upper end of a vertical line), shifted to the left of the
 * direction of travel, so it sits above a rising line, and kept inside the
 * window.
 */
export function lineLabelAnchor(segment: Segment, window: PlaneWindow): PlanePosition {
  const dx = segment.to.x - segment.from.x
  const dy = segment.to.y - segment.from.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const along = Math.min(LABEL_INSET.along, length / 2)
  const x = segment.to.x - ux * along - uy * LABEL_INSET.aside
  const y = segment.to.y - uy * along + ux * LABEL_INSET.aside
  const inner = (r: Range): Range => [r[0] + LABEL_INSET.edge, r[1] - LABEL_INSET.edge]
  return { x: clamp(x, inner(window.x)), y: clamp(y, inner(window.y)) }
}

/** Grid points of the window that lie on the line, ordered by x (by y for a vertical line). */
export function gridPointsOnLine(line: PlaneLine, window: PlaneWindow): GridPoint[] {
  if (line.kind === 'vertical') {
    const x = toRational(line.x)
    if (!x.isInteger()) return []
    const xi = x.toNumber()
    if (xi < window.x[0] || xi > window.x[1]) return []
    return integers(window.y).map((y) => ({ x: xi, y }))
  }
  const m = toRational(line.m)
  const n = toRational(line.n)
  const points: GridPoint[] = []
  for (const x of integers(window.x)) {
    const y = m.mul(Rational.of(x)).add(n)
    if (!y.isInteger()) continue
    const yi = y.toNumber()
    if (yi >= window.y[0] && yi <= window.y[1]) points.push({ x, y: yi })
  }
  return points
}

/** Grid points an `on-line` point can reach: those of its line in the window, limited to its range. */
export function lineTrack(drag: { line: PlaneLine; range?: Range }, window: PlaneWindow): GridPoint[] {
  const points = gridPointsOnLine(drag.line, window)
  const range = drag.range
  if (!range) return points
  const coordinate = drag.line.kind === 'vertical' ? 'y' : 'x'
  return points.filter((p) => p[coordinate] >= range[0] && p[coordinate] <= range[1])
}

/** True if the grid point lies on the line. */
export function isOnLine(line: PlaneLine, p: GridPoint): boolean {
  if (line.kind === 'vertical') return toRational(line.x).equals(Rational.of(p.x))
  return toRational(line.m).mul(Rational.of(p.x)).add(toRational(line.n)).equals(Rational.of(p.y))
}

// ---------------------------------------------------------------------------
// Points: snapping and keyboard steps

export function sameGridPoint(a: GridPoint, b: GridPoint): boolean {
  return a.x === b.x && a.y === b.y
}

function isOccupied(p: GridPoint, occupied: readonly GridPoint[]): GridPoint | undefined {
  return occupied.find((o) => sameGridPoint(o, p))
}

/**
 * Grid points a point can reach with its drag kind, in keyboard order. Free
 * points have no single track; they move along their row or column.
 */
function track(current: GridPoint, drag: PointDrag, window: PlaneWindow, along: 'row' | 'column'): GridPoint[] {
  if (drag.kind === 'on-line') return lineTrack(drag, window)
  const area = dragWindow(drag, window)
  const direction = drag.kind === 'vertical' ? 'column' : drag.kind === 'horizontal' ? 'row' : along
  return direction === 'row'
    ? integers(area.x).map((x) => ({ x, y: current.y }))
    : integers(area.y).map((y) => ({ x: current.x, y }))
}

/**
 * The part of the window a point may enter: the window itself, or its
 * intersection with the point's `bounds`. Points on a line use their range
 * instead (see `lineTrack`), so for them it is the window.
 */
export function dragWindow(drag: PointDrag, window: PlaneWindow): PlaneWindow {
  if (drag.kind === 'on-line' || !drag.bounds) return window
  const cut = (outer: Range, inner: Range): Range => [Math.max(outer[0], inner[0]), Math.min(outer[1], inner[1])]
  return { x: cut(window.x, drag.bounds.x), y: cut(window.y, drag.bounds.y) }
}

/** German problems of a point's position; empty if it is a grid point of the window that its drag kind allows. */
export function pointProblems(p: GridPoint, window: PlaneWindow, drag?: PointDrag): string[] {
  if (!Number.isInteger(p.x) || !Number.isInteger(p.y)) return ['Punkt: Koordinaten müssen ganze Zahlen sein.']
  if (!inWindow(window, p)) return ['Punkt: liegt außerhalb des Fensters.']
  if (drag && drag.kind !== 'on-line') {
    const area = dragWindow(drag, window)
    const inX = p.x >= area.x[0] && p.x <= area.x[1]
    const inY = p.y >= area.y[0] && p.y <= area.y[1]
    if ((drag.kind !== 'vertical' && !inX) || (drag.kind !== 'horizontal' && !inY)) {
      return ['Punkt: liegt außerhalb seines Bereichs.']
    }
  }
  if (drag?.kind === 'on-line') {
    if (!isOnLine(drag.line, p)) return ['Punkt: liegt nicht auf seiner Geraden.']
    if (!lineTrack(drag, window).some((q) => sameGridPoint(q, p))) return ['Punkt: liegt außerhalb seines Bereichs auf der Geraden.']
  }
  return []
}

/** Nearest grid point in the window to a position, e.g. where the plane was tapped; null if far outside. */
export function placeAt(raw: PlanePosition, window: PlaneWindow): GridPoint | null {
  const near = (v: number, [min, max]: Range) => v >= min - 0.5 && v <= max + 0.5
  if (!near(raw.x, window.x) || !near(raw.y, window.y)) return null
  return { x: clamp(Math.round(raw.x), window.x) + 0, y: clamp(Math.round(raw.y), window.y) + 0 }
}

/**
 * Where a dragged point snaps to for a pointer position: the nearest grid
 * point its drag kind allows, inside the window. If another point occupies
 * that grid point, the point stays at `current` until a free one is reached.
 */
export function snapPoint(
  raw: PlanePosition,
  current: GridPoint,
  drag: PointDrag,
  window: PlaneWindow,
  occupied: readonly GridPoint[] = [],
): GridPoint {
  let target: GridPoint
  if (drag.kind === 'on-line') {
    const candidates = lineTrack(drag, window)
    let best: GridPoint | undefined
    let bestDistance = Infinity
    for (const c of candidates) {
      const d = Math.hypot(c.x - raw.x, c.y - raw.y)
      if (d < bestDistance) {
        best = c
        bestDistance = d
      }
    }
    if (!best) return current
    target = best
  } else {
    const area = dragWindow(drag, window)
    const x = drag.kind === 'vertical' ? current.x : clamp(Math.round(raw.x), area.x)
    const y = drag.kind === 'horizontal' ? current.y : clamp(Math.round(raw.y), area.y)
    target = { x: x + 0, y: y + 0 }
  }
  return isOccupied(target, occupied) ? current : target
}

/** Maps `KeyboardEvent.key` to a plane key, or undefined for keys the plane ignores. */
export function planeKey(key: string): PlaneKey | undefined {
  switch (key) {
    case 'ArrowLeft':
      return 'left'
    case 'ArrowRight':
      return 'right'
    case 'ArrowUp':
      return 'up'
    case 'ArrowDown':
      return 'down'
    case 'Home':
      return 'home'
    case 'End':
      return 'end'
    case 'PageUp':
      return 'page-up'
    case 'PageDown':
      return 'page-down'
    default:
      return undefined
  }
}

/**
 * A keyboard step of a point:
 * - free: ←/→ x ∓ 1, ↑/↓ y ± 1, Pos1/Ende to the left/right edge, Bild↑/Bild↓ to the top/bottom edge
 * - vertical: ↑/→/Bild↑ up, ↓/←/Bild↓ down, Pos1/Ende to the bottom/top edge
 * - horizontal: →/↑ right, ←/↓ left, Pos1/Ende (and Bild↓/Bild↑) to the left/right edge
 * - on-line: →/↑ to the next grid point on the line, ←/↓ to the previous one, Pos1/Ende (and Bild↓/Bild↑) to the first/last
 *
 * Points with `bounds` move only inside them, Pos1/Ende etc. go to their edges.
 *
 * Occupied grid points are skipped. If the point cannot move, the result says
 * why: the edge (of the window or of the bounds), or the point that blocks the way.
 */
export function movePoint(
  current: GridPoint,
  key: PlaneKey,
  drag: PointDrag,
  window: PlaneWindow,
  occupied: readonly GridPoint[] = [],
): PointMove {
  const result = stepPoint(current, key, drag, window, occupied)
  if (result.kind !== 'edge' || drag.kind === 'on-line' || !drag.bounds) return result
  // Stopped: by the bounds if the same step would work without them.
  const unbounded = stepPoint(current, key, { kind: drag.kind }, window, occupied)
  return unbounded.kind === 'edge' ? result : { kind: 'edge', bound: true }
}

function stepPoint(
  current: GridPoint,
  key: PlaneKey,
  drag: PointDrag,
  window: PlaneWindow,
  occupied: readonly GridPoint[],
): PointMove {
  const vertical = key === 'up' || key === 'down' || key === 'page-up' || key === 'page-down'
  const points = track(current, drag, window, vertical && drag.kind === 'free' ? 'column' : 'row')
  if (points.length === 0) return { kind: 'edge' }
  const increase = key === 'right' || key === 'up' || key === 'end' || key === 'page-up'
  const toEnd = key === 'home' || key === 'end' || ((key === 'page-up' || key === 'page-down') && drag.kind !== 'free')
  const freeToEnd = drag.kind === 'free' && (key === 'page-up' || key === 'page-down')

  const index = points.findIndex((p) => sameGridPoint(p, current))
  if (index < 0) {
    // Not on its track (should not happen): jump to the nearest free grid point of it.
    const target = snapPoint(current, current, drag.kind === 'on-line' ? drag : { kind: 'free', bounds: drag.bounds }, window, occupied)
    return sameGridPoint(target, current) ? { kind: 'edge' } : { kind: 'moved', point: target }
  }

  const direction = increase ? 1 : -1
  if (toEnd || freeToEnd) {
    // Search from the far end back towards the point for the first free grid point.
    for (let i = increase ? points.length - 1 : 0; increase ? i > index : i < index; i -= direction) {
      const p = points[i]
      if (p && !isOccupied(p, occupied)) return { kind: 'moved', point: p }
    }
    const next = points[index + direction]
    const by = next ? isOccupied(next, occupied) : undefined
    return by ? { kind: 'occupied', by } : { kind: 'edge' }
  }

  let blocker: GridPoint | undefined
  for (let i = index + direction; i >= 0 && i < points.length; i += direction) {
    const p = points[i]
    if (!p) break
    const by = isOccupied(p, occupied)
    if (!by) return { kind: 'moved', point: p }
    blocker ??= by
  }
  return blocker ? { kind: 'occupied', by: blocker } : { kind: 'edge' }
}

/** Value range of the coordinate a slider-like point changes: x, or y for vertical points. */
export function pointValueRange(p: GridPoint, drag: PointDrag, window: PlaneWindow): { now: number; min: number; max: number } {
  if (drag.kind === 'vertical') {
    const area = dragWindow(drag, window)
    return { now: p.y, min: area.y[0], max: area.y[1] }
  }
  if (drag.kind === 'on-line') {
    const points = lineTrack(drag, window)
    if (drag.line.kind === 'vertical') {
      return { now: p.y, min: points[0]?.y ?? p.y, max: points.at(-1)?.y ?? p.y }
    }
    return { now: p.x, min: points[0]?.x ?? p.x, max: points.at(-1)?.x ?? p.x }
  }
  const area = dragWindow(drag, window)
  return { now: p.x, min: area.x[0], max: area.x[1] }
}

// ---------------------------------------------------------------------------
// Texts (German, with a real minus)

/** `-3` → `−3`. */
export function formatNumber(value: number): string {
  return String(value + 0).replace('-', '−')
}

/** `-` → `−` in printed terms. */
export function displayText(text: string): string {
  return text.replace(/-/g, '−')
}

/** Visible label with coordinates, e.g. `P(2|−3)`. */
export function pointLabelText(label: string, p: GridPoint): string {
  return `${label}(${formatNumber(p.x)}|${formatNumber(p.y)})`
}

/** Coordinates for screen readers, e.g. `x = 2, y = −3`. */
export function pointValueText(p: GridPoint): string {
  return `x = ${formatNumber(p.x)}, y = ${formatNumber(p.y)}`
}

/** Announcement after a move, e.g. `P: x = 2, y = −3`. */
export function pointAnnouncement(label: string, p: GridPoint): string {
  return `${label}: ${pointValueText(p)}`
}

/** Stopped at the edge of the window, or with `bound` at the edge of the point's bounds. */
export function edgeAnnouncement(label: string, bound = false): string {
  return bound ? `${label}: Grenze erreicht` : `${label}: Rand erreicht`
}

export function occupiedAnnouncement(other: string): string {
  return `Dort liegt schon ${other}`
}

/** The line as an equation: `f(x) = 2x − 3` with a name, `y = 2x − 3` without, `x = 4` if vertical. */
export function lineText(line: PlaneLine, name?: string): string {
  if (line.kind === 'vertical') return `x = ${displayText(toRational(line.x).toString())}`
  const text = functionToText(linearFunction(name ?? 'f', line.m, line.n))
  // Without a name: replace "f(x)" by "y".
  return displayText(name ? text : `y${text.slice(text.indexOf(' ='))}`)
}

/**
 * Accessible name of the plane, e.g. `Koordinatensystem, x von −8 bis 8, y von −8 bis 8`.
 * Without axes (geometry grid, one square = 1 cm): `Gitter, 12 mal 10 Kästchen, ein Kästchen 1 cm, …`.
 */
export function describeWindow(window: PlaneWindow, { axes = true }: { axes?: boolean } = {}): string {
  if (!axes) return describeGrid(window)
  const range = ([min, max]: Range) => `von ${formatNumber(min)} bis ${formatNumber(max)}`
  return `Koordinatensystem, x ${range(window.x)}, y ${range(window.y)}`
}

function describeGrid(window: PlaneWindow): string {
  const columns = window.x[1] - window.x[0]
  const rows = window.y[1] - window.y[0]
  const origin =
    window.x[0] === 0 && window.y[0] === 0 ? '' : ` (dort x = ${formatNumber(window.x[0])}, y = ${formatNumber(window.y[0])})`
  return (
    `Gitter, ${columns} mal ${rows} Kästchen, ein Kästchen 1 cm; ` +
    `x zählt die Kästchen nach rechts, y nach oben, ab der Ecke unten links${origin}`
  )
}

/** Keyboard hint for a movable point, linked with aria-describedby. */
export function dragHint(kind: PointDrag['kind']): string {
  switch (kind) {
    case 'free':
      return (
        'Pfeiltasten verschieben den Punkt um ein Kästchen. ' +
        'Pos1 und Ende: linker und rechter Rand, Bild auf und Bild ab: oberer und unterer Rand.'
      )
    case 'vertical':
      return 'Pfeiltasten verschieben den Punkt nach oben oder unten. Pos1 und Ende: unterer und oberer Rand.'
    case 'horizontal':
      return 'Pfeiltasten verschieben den Punkt nach links oder rechts. Pos1 und Ende: linker und rechter Rand.'
    case 'on-line':
      return 'Pfeiltasten verschieben den Punkt zum nächsten Gitterpunkt auf der Geraden. Pos1 und Ende: erster und letzter Gitterpunkt.'
  }
}

/** Font size of point names in SVG units (matches `.plane-point-label` in index.css). */
export const POINT_LABEL_FONT = 17

/** Distance in SVG units from a point to the box of its name: outside the focus ring (radius 12) with a small gap. */
const POINT_LABEL_CLEARANCE = 16

/**
 * Centre of a point name relative to its point, in SVG units (y down), for a
 * direction in plane units (y up): the estimated text box touches the circle
 * of POINT_LABEL_CLEARANCE around the point. Used for vertices of a figure,
 * whose names stand outside along the bisector of the angle.
 */
export function pointLabelOffset(direction: PlanePosition, text: string): { x: number; y: number } {
  const length = Math.hypot(direction.x, direction.y)
  const dx = length > 0 ? direction.x / length : 1
  const dy = length > 0 ? direction.y / length : 0
  const width = text.length * 0.6 * POINT_LABEL_FONT
  const reach = (Math.abs(dx) * width) / 2 + (Math.abs(dy) * POINT_LABEL_FONT) / 2
  const distance = POINT_LABEL_CLEARANCE + reach
  return { x: dx * distance, y: -dy * distance }
}
