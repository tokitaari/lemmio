import { geometryNumberToText, type FigureLabel, type Letter, type ShapeKind, type TaskFigure, type Vec } from '../math'
import { UNIT } from '../plane'

// ---------------------------------------------------------------------------
// Scale and text metrics (all lengths in cm unless they say SVG units)

/** SVG units per cm; the same as one grid unit of the coordinate plane, so a figure fits onto the grid. */
export const SHAPE_UNIT = UNIT

/** CSS pixels per SVG unit at full size: 1 cm = 25 px. Narrow screens shrink the figure. */
export const PX_PER_UNIT = 1.25

/** Font size of all labels in SVG units (matches `.shape-text` in index.css). */
export const SHAPE_FONT = 14

/** Estimated size of a label box in cm: average character width and line height. */
const CHAR_WIDTH = (SHAPE_FONT * 0.56) / SHAPE_UNIT
const LINE_HEIGHT = (SHAPE_FONT * 1.15) / SHAPE_UNIT

/** Gaps in cm: label to its segment or vertex, padding of the frame. */
const GAP = { side: 0.2, vertex: 0.15, height: 0.2, diagonal: 0.15, frame: 0.25 } as const

/** Side of a right-angle mark in cm. */
export const RIGHT_ANGLE_SIZE = 0.4

/** How far the extension of the base reaches beyond the foot of the height, in cm. */
export const EXTENSION_OVERSHOOT = 0.5

const EPS = 1e-9

// ---------------------------------------------------------------------------
// Types

export type ShapeLabelKind = 'vertex' | FigureLabel['kind']

/**
 * A horizontal text in the figure. `letter` (italic) and `text` together are
 * the label, e.g. "g" + " = 6,5 cm", "h" + " = ?" or, for a vertex, just "A".
 * `at` is the centre of the estimated text box.
 */
export interface ShapeLabelLayout {
  id: string
  kind: ShapeLabelKind
  letter?: Letter
  text: string
  /** False for the length asked for ("h = ?"). Vertex names are always given. */
  given: boolean
  at: Vec
  width: number
  height: number
}

export interface HeightLayout {
  top: Vec
  foot: Vec
  /** The foot lies on the extension of AB, outside the side AB. */
  outside: boolean
  /** The foot is a vertex (right triangle): the height is a side, only the right angle is drawn. */
  onVertex: boolean
  /** Dashed extension of AB from its nearer end to beyond the foot; null if the foot lies on AB. */
  extension: readonly [Vec, Vec] | null
  /** Right-angle mark at the foot as a polyline of three points. */
  rightAngle: readonly [Vec, Vec, Vec]
}

export interface DiagonalsLayout {
  /** e = AC and f = BD. */
  lines: readonly (readonly [Vec, Vec])[]
  center: Vec
  rightAngle: readonly [Vec, Vec, Vec]
}

export interface ShapeBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Everything needed to draw a figure; coordinates in cm, y up. */
export interface ShapeLayout {
  shape: ShapeKind
  vertices: readonly Vec[]
  height: HeightLayout | null
  diagonals: DiagonalsLayout | null
  labels: readonly ShapeLabelLayout[]
  bounds: ShapeBounds
  /** German description for assistive technology. */
  description: string
}

// ---------------------------------------------------------------------------
// Names

export const SHAPE_NAMES: Readonly<Record<ShapeKind, string>> = {
  parallelogram: 'Parallelogramm',
  triangle: 'Dreieck',
  rhombus: 'Raute',
  trapezoid: 'Trapez',
}

const LENGTH_NAMES: Readonly<Record<Letter, string>> = {
  a: 'Seite',
  b: 'Seite',
  c: 'Seite',
  d: 'Seite',
  e: 'Diagonale',
  f: 'Diagonale',
  g: 'Grundseite',
  h: 'Höhe',
}

export const VERTEX_NAMES = ['A', 'B', 'C', 'D'] as const

// ---------------------------------------------------------------------------
// Vector helpers

const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]]
const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]]
const scale = (p: Vec, k: number): Vec => [p[0] * k, p[1] * k]
const dot = (p: Vec, q: Vec): number => p[0] * q[0] + p[1] * q[1]
const len = (p: Vec): number => Math.hypot(p[0], p[1])
const mid = (p: Vec, q: Vec): Vec => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]

function unit(p: Vec): Vec {
  const l = len(p)
  return l < EPS ? [0, 0] : [p[0] / l, p[1] / l]
}

/** Left normal of a direction. */
const normal = (p: Vec): Vec => [-p[1], p[0]]

function vertexAt(vertices: readonly Vec[], i: number): Vec {
  const n = vertices.length
  const v = vertices[((i % n) + n) % n]
  if (!v) throw new RangeError(`No vertex ${i}`)
  return v
}

export function centroid(vertices: readonly Vec[]): Vec {
  const sum = vertices.reduce<Vec>((acc, v) => add(acc, v), [0, 0])
  return scale(sum, 1 / Math.max(1, vertices.length))
}

/** Parameter of the foot of `p` on the line a→b: 0 at a, 1 at b. */
export function lineParam(p: Vec, a: Vec, b: Vec): number {
  const d = sub(b, a)
  return dot(sub(p, a), d) / dot(d, d)
}

/** Right-angle mark at `corner` between the unit directions u and v. */
export function rightAngleMark(corner: Vec, u: Vec, v: Vec, size = RIGHT_ANGLE_SIZE): [Vec, Vec, Vec] {
  const a = add(corner, scale(u, size))
  const b = add(a, scale(v, size))
  const c = add(corner, scale(v, size))
  return [a, b, c]
}

/** Distance from `from` along the unit direction `dir` to the boundary of the polygon (Infinity if none). */
export function distanceToBoundary(vertices: readonly Vec[], from: Vec, dir: Vec): number {
  let best = Infinity
  for (let i = 0; i < vertices.length; i++) {
    const a = vertexAt(vertices, i)
    const e = sub(vertexAt(vertices, i + 1), a)
    const denom = dir[0] * e[1] - dir[1] * e[0]
    if (Math.abs(denom) < EPS) continue
    const w = sub(a, from)
    const t = (w[0] * e[1] - w[1] * e[0]) / denom
    const s = (w[0] * dir[1] - w[1] * dir[0]) / denom
    if (t > EPS && s >= -EPS && s <= 1 + EPS) best = Math.min(best, t)
  }
  return best
}

// ---------------------------------------------------------------------------
// Labels

function textBox(chars: number): { width: number; height: number } {
  return { width: chars * CHAR_WIDTH, height: LINE_HEIGHT }
}

/**
 * Centre of a text box of size w × h whose nearest edge lies `gap` away from
 * `anchor` in the unit direction `dir`.
 */
export function placeBox(anchor: Vec, dir: Vec, gap: number, width: number, height: number): Vec {
  const reach = Math.abs(dir[0]) * (width / 2) + Math.abs(dir[1]) * (height / 2)
  return add(anchor, scale(dir, gap + reach))
}

/** Reach of a box of size w × h in the unit direction `dir`, from its centre. */
const boxReach = (dir: Vec, width: number, height: number) => Math.abs(dir[0]) * (width / 2) + Math.abs(dir[1]) * (height / 2)

/** Text after the letter: " = 6,5 cm" or " = ?". */
export function lengthLabelText(label: Pick<FigureLabel, 'value' | 'given'>): string {
  return label.given ? ` = ${geometryNumberToText(label.value)} cm` : ' = ?'
}

/** The whole text of a label, e.g. "g = 6,5 cm", "h = ?" or "A". */
export function labelText(label: Pick<ShapeLabelLayout, 'letter' | 'text'>): string {
  return `${label.letter ?? ''}${label.text}`
}

function lengthLabel(label: FigureLabel, at: Vec): ShapeLabelLayout {
  const text = lengthLabelText(label)
  const box = textBox(label.letter.length + text.length)
  return { id: label.letter, kind: label.kind, letter: label.letter, text, given: label.given, at, ...box }
}

/** Unit direction away from the figure: the normal of the segment that points away from the centroid. */
function outwardNormal(from: Vec, to: Vec, center: Vec): Vec {
  const n = unit(normal(sub(to, from)))
  const away = dot(sub(mid(from, to), center), n)
  return away < 0 ? scale(n, -1) : n
}

/** Outward bisector at vertex i (the figures are convex). */
function vertexDirection(vertices: readonly Vec[], i: number, center: Vec): Vec {
  const v = vertexAt(vertices, i)
  const bisector = add(unit(sub(v, vertexAt(vertices, i - 1))), unit(sub(v, vertexAt(vertices, i + 1))))
  const dir = unit(bisector)
  return len(dir) < 0.5 ? unit(sub(v, center)) : dir
}

// ---------------------------------------------------------------------------
// Height and diagonals

function heightLayout(vertices: readonly Vec[], label: FigureLabel): HeightLayout {
  const a = vertexAt(vertices, 0)
  const b = vertexAt(vertices, 1)
  const top = label.from
  const foot = label.to
  const t = lineParam(foot, a, b)
  const tol = 1e-6
  const outside = t < -tol || t > 1 + tol
  const onVertex = Math.abs(t) <= tol || Math.abs(t - 1) <= tol
  const along = unit(sub(b, a))
  // The right angle opens towards the farther end of AB, i.e. where the base continues.
  const towardBase: Vec = t > 0.5 ? scale(along, -1) : along
  const up = unit(sub(top, foot))
  let extension: readonly [Vec, Vec] | null = null
  if (outside) {
    const near = t < 0 ? a : b
    const beyond = add(foot, scale(t < 0 ? scale(along, -1) : along, EXTENSION_OVERSHOOT))
    extension = [near, beyond]
  }
  return { top, foot, outside, onVertex, extension, rightAngle: rightAngleMark(foot, up, towardBase) }
}

function diagonalsLayout(vertices: readonly Vec[]): DiagonalsLayout {
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => vertexAt(vertices, i)) as [Vec, Vec, Vec, Vec]
  // Intersection of AC and BD (the midpoint of both in a rhombus, computed generally).
  const r = sub(c, a)
  const s = sub(d, b)
  const denom = r[0] * s[1] - r[1] * s[0]
  const t = Math.abs(denom) < EPS ? 0.5 : ((b[0] - a[0]) * s[1] - (b[1] - a[1]) * s[0]) / denom
  const center = add(a, scale(r, t))
  return {
    lines: [
      [a, c],
      [b, d],
    ],
    center,
    rightAngle: rightAngleMark(center, unit(sub(c, center)), unit(sub(d, center))),
  }
}

// ---------------------------------------------------------------------------
// Layout

/**
 * Layout of a figure from the math core: vertices, the dashed height with its
 * right angle (and the extension of AB if the foot lies outside), diagonals
 * of a rhombus and all labels as horizontal texts outside the figure. The
 * height label goes inside the figure, towards its centre, if it fits there.
 */
export function layoutShape(figure: TaskFigure): ShapeLayout {
  const { vertices } = figure
  const center = centroid(vertices)
  const labels: ShapeLabelLayout[] = []

  vertices.forEach((v, i) => {
    const name = VERTEX_NAMES[i] ?? '?'
    const box = textBox(name.length)
    const dir = vertexDirection(vertices, i, center)
    labels.push({ id: name, kind: 'vertex', text: name, given: true, at: placeBox(v, dir, GAP.vertex, box.width, box.height), ...box })
  })

  const heightLabel = figure.labels.find((l) => l.kind === 'height')
  const height = heightLabel ? heightLayout(vertices, heightLabel) : null
  const diagonals = figure.diagonals ? diagonalsLayout(vertices) : null

  for (const label of figure.labels) {
    const draft = lengthLabel(label, [0, 0])
    if (label.kind === 'side') {
      const dir = outwardNormal(label.from, label.to, center)
      labels.push({ ...draft, at: placeBox(mid(label.from, label.to), dir, GAP.side, draft.width, draft.height) })
    } else if (label.kind === 'height' && height) {
      labels.push({ ...draft, at: heightLabelAt(vertices, height, center, draft) })
    } else if (label.kind === 'diagonal' && diagonals) {
      labels.push({ ...draft, at: diagonalLabelAt(label, diagonals.center, vertices, draft) })
    }
  }

  const points: Vec[] = [...vertices]
  if (height) points.push(height.foot, ...height.rightAngle, ...(height.extension ?? []))
  const bounds = boundsOf(points, labels)
  return { shape: figure.shape, vertices, height, diagonals, labels, bounds, description: describeShape(figure, height) }
}

function heightLabelAt(vertices: readonly Vec[], height: HeightLayout, center: Vec, box: { width: number; height: number }): Vec {
  const anchor = mid(height.top, height.foot)
  const n = unit(normal(sub(height.foot, height.top)))
  const toCenter = dot(sub(center, anchor), n) >= 0 ? n : scale(n, -1)
  const away = scale(toCenter, -1)
  // A height outside the figure or along a side: the label goes away from the figure.
  if (height.outside || height.onVertex) return placeBox(anchor, away, GAP.height, box.width, box.height)
  // Inside: towards the centre if it fits, else the other side if that fits, else the side with more room.
  const need = GAP.height * 2 + 2 * boxReach(toCenter, box.width, box.height)
  const roomCenter = distanceToBoundary(vertices, anchor, toCenter)
  const roomOther = distanceToBoundary(vertices, anchor, away)
  let dir = toCenter
  if (roomCenter < need) dir = roomOther >= need || roomOther > roomCenter ? away : toCenter
  return placeBox(anchor, dir, GAP.height, box.width, box.height)
}

/** e at the middle of AM, on the side towards D; f at the middle of MD, on the side towards C. */
function diagonalLabelAt(label: FigureLabel, center: Vec, vertices: readonly Vec[], box: { width: number; height: number }): Vec {
  const isE = label.letter === 'e'
  const end = isE ? label.from : label.to
  const anchor = mid(end, center)
  const n = unit(normal(sub(end, center)))
  const toward = vertexAt(vertices, isE ? 3 : 2)
  const dir = dot(sub(toward, anchor), n) >= 0 ? n : scale(n, -1)
  return placeBox(anchor, dir, GAP.diagonal, box.width, box.height)
}

export function boundsOf(points: readonly Vec[], labels: readonly ShapeLabelLayout[]): ShapeBounds {
  const xs: number[] = []
  const ys: number[] = []
  for (const p of points) {
    xs.push(p[0])
    ys.push(p[1])
  }
  for (const l of labels) {
    xs.push(l.at[0] - l.width / 2, l.at[0] + l.width / 2)
    ys.push(l.at[1] - l.height / 2, l.at[1] + l.height / 2)
  }
  return {
    minX: Math.min(...xs) - GAP.frame,
    minY: Math.min(...ys) - GAP.frame,
    maxX: Math.max(...xs) + GAP.frame,
    maxY: Math.max(...ys) + GAP.frame,
  }
}

/** viewBox of a figure in SVG units (y down), rounded to two decimals. */
export function shapeViewBox(bounds: ShapeBounds): { x: number; y: number; width: number; height: number } {
  const r = (v: number) => Math.round(v * 100) / 100 + 0
  return {
    x: r(bounds.minX * SHAPE_UNIT),
    y: r(-bounds.maxY * SHAPE_UNIT),
    width: r((bounds.maxX - bounds.minX) * SHAPE_UNIT),
    height: r((bounds.maxY - bounds.minY) * SHAPE_UNIT),
  }
}

/** cm → SVG units (y down); the same mapping as `toView` of the coordinate plane. */
export function shapeToView(p: Vec): { x: number; y: number } {
  return { x: p[0] * SHAPE_UNIT + 0, y: -p[1] * SHAPE_UNIT + 0 }
}

/** SVG points attribute of a polyline or polygon. */
export function svgPoints(points: readonly Vec[]): string {
  return points
    .map((p) => {
      const v = shapeToView(p)
      return `${round(v.x)},${round(v.y)}`
    })
    .join(' ')
}

const round = (v: number) => Math.round(v * 100) / 100 + 0

// ---------------------------------------------------------------------------
// Description

/**
 * German description, e.g. "Dreieck ABC: Grundseite g = 6 cm, Höhe h = 4 cm.
 * Die Höhe liegt außerhalb, auf der Verlängerung von AB."
 */
export function describeShape(figure: TaskFigure, height: HeightLayout | null = null): string {
  const names = VERTEX_NAMES.slice(0, figure.vertices.length).join('')
  const parts = figure.labels.map((l) =>
    l.given ? `${LENGTH_NAMES[l.letter]} ${l.letter}${lengthLabelText(l)}` : `${LENGTH_NAMES[l.letter]} ${l.letter} gesucht`,
  )
  let text = `${SHAPE_NAMES[figure.shape]} ${names}`
  if (parts.length > 0) text += `: ${parts.join(', ')}`
  text += '.'
  if (height?.outside) text += ' Die Höhe liegt außerhalb, auf der Verlängerung von AB.'
  else if (height?.onVertex) text += ' Die Höhe ist zugleich eine Seite.'
  return text
}
