import {
  areaFormula,
  buildAreaTask,
  buildFigure,
  calculationChain,
  calculationToLatex,
  calculationToText,
  DECIMAL,
  toLatex,
  toLength,
  toText,
  unitToLatex,
  type FigureLabel,
  type Letter,
  type Measures,
  type ShapeKind,
  type TaskFigure,
  type Vec,
} from '../math'
import { layoutShape, type ShapeBounds } from '../shapes'
import { lengthText, OFFSET_LIMIT, SHAPE_LENGTH_LIMIT, shapeLetters } from './shapeSliders'
import type { DecomposeWidget } from './types'

/**
 * Logic of the `decompose` widget: a figure taken apart or doubled in
 * steps. Every frame lists the pieces at their place in that frame and how
 * they got there from the frame before (`enter`), so the view only has to
 * animate from the old place to the drawn one:
 *
 * | shape         | 1                                 | 2                                 | 3                          |
 * |---------------|-----------------------------------|-----------------------------------|----------------------------|
 * | parallelogram | cut off the triangle at the height | move it by g to the other side    | rectangle g × h, A = g·h   |
 * | triangle      | copy turned by 180° about M       | together a parallelogram g × h    | half of it, A = g·h/2      |
 * | trapezoid     | copy turned by 180° about M       | parallelogram (a + c) × h         | half of it                 |
 * | rhombus       | rectangle e × f around it          | copies of its 4 triangles turn in | half of it, A = e·f/2      |
 *
 * M is the midpoint of BC (a leg of the trapezoid). Coordinates in cm, y up,
 * as in src/shapes. The view is src/components/cards/DecomposeView.tsx.
 */

const SHAPES: readonly ShapeKind[] = ['parallelogram', 'triangle', 'rhombus', 'trapezoid']

/** Widest figure over all frames in cm, so it stays readable on a 360 px screen. */
export const DECOMPOSE_MAX_WIDTH = 16

/** How a piece got to its place in this frame. Rotations are always by 180°. */
export type PieceMotion = { kind: 'appear' } | { kind: 'translate'; by: Vec } | { kind: 'rotate'; about: Vec }

export interface DecomposePiece {
  /** Stable across frames, so the view keeps the element and can animate it. */
  id: string
  points: readonly Vec[]
  /** `figure`: the given figure (or what is left of it); `copy`: a cut-off piece or a copy. */
  tone: 'figure' | 'copy'
  /** Drawn lighter: the copy that is not part of the figure any more. */
  faded?: boolean
  enter?: PieceMotion
  /** Position in a group of pieces that move at the same time, for a slight stagger. */
  order?: number
}

export interface DecomposeOutline {
  id: string
  points: readonly Vec[]
  /** `guide`: dashed help rectangle; `result`: outline of the new figure. */
  kind: 'guide' | 'result'
  /** True in the frame where it appears. */
  appears?: boolean
}

export interface DecomposeLine {
  /** E.g. `Parallelogramm: g·h = 6·4 = 24 cm²`; also the text of the live region. */
  text: string
  latex: string
}

export interface DecomposeFrame {
  caption: string
  pieces: readonly DecomposePiece[]
  outlines: readonly DecomposeOutline[]
  /** Cut along the height, drawn solid. */
  cut: readonly [Vec, Vec] | null
  /** Centre M of the rotation, marked with its name. */
  center: Vec | null
  /** Figure whose height, diagonals and length labels are drawn. */
  figure: TaskFigure
  /** Calculation lines that appear in this frame. */
  lines: readonly DecomposeLine[]
}

export interface DecomposeModel {
  shape: ShapeKind
  /** Frame 0 is the given figure, then one frame per step. */
  frames: readonly DecomposeFrame[]
  /** Frame in cm that holds every frame, so nothing jumps. */
  bounds: ShapeBounds
}

const isHalfStep = (value: number) => Number.isFinite(value) && Number.isInteger(value * 2)

/** Problems of the widget (empty if it is fine); `validateDeck` reports them with the card. */
export function decomposeProblems(widget: DecomposeWidget): string[] {
  const at = 'decompose'
  if (!SHAPES.includes(widget.shape)) return [`${at}: unknown shape "${String(widget.shape)}"`]
  const letters = shapeLetters(widget.shape, 'area')
  const problems: string[] = []
  for (const letter of letters) {
    if (widget.measures[letter] === undefined) problems.push(`${at}: missing length ${letter}`)
  }
  for (const name of Object.keys(widget.measures)) {
    if (!(letters as string[]).includes(name)) problems.push(`${at}: the area formula of a ${widget.shape} has no length ${name}`)
  }
  if (problems.length > 0) return problems

  const [low, high] = SHAPE_LENGTH_LIMIT
  for (const letter of letters) {
    const value = widget.measures[letter] ?? 0
    if (!isHalfStep(value)) problems.push(`${at}: ${letter} must be whole or end in ,5`)
    else if (value < low || value > high) problems.push(`${at}: ${letter} must lie within ${low}…${high} cm`)
  }
  if (problems.length > 0) return problems

  const m = (letter: Letter) => widget.measures[letter] ?? 0
  if (widget.shape === 'trapezoid' && !(m('c') < m('a'))) return [`${at}: c must be shorter than a`]
  if (widget.offset !== undefined) {
    const offset = widget.offset
    if (widget.shape === 'rhombus') return [`${at}: a rhombus has no offset`]
    if (!isHalfStep(offset) || offset < OFFSET_LIMIT[0] || offset > OFFSET_LIMIT[1]) {
      return [`${at}: offset must be a multiple of 0,5 in ${OFFSET_LIMIT[0]}…${OFFSET_LIMIT[1]}`]
    }
    if (widget.shape === 'parallelogram' && !(offset > 0 && offset <= m('g'))) {
      return [`${at}: a parallelogram needs 0 < offset ≤ g, so that the height lies inside and a triangle can be cut off`]
    }
  }

  const { bounds } = buildDecompose(widget)
  const width = bounds.maxX - bounds.minX
  if (width > DECOMPOSE_MAX_WIDTH) {
    return [`${at}: the figure grows to ${Math.round(width * 10) / 10} cm, at most ${DECOMPOSE_MAX_WIDTH} cm fit`]
  }
  return []
}

// ---------------------------------------------------------------------------
// Geometry helpers

const add = (p: Vec, q: Vec): Vec => [p[0] + q[0], p[1] + q[1]]
const sub = (p: Vec, q: Vec): Vec => [p[0] - q[0], p[1] - q[1]]
const mid = (p: Vec, q: Vec): Vec => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
const same = (p: Vec, q: Vec) => Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9

/** Point reflection at the midpoint of p and q: what a turn by 180° about it does. */
const turnAbout = (p: Vec, q: Vec) => (r: Vec): Vec => sub(add(p, q), r)

/** Drops vertices that equal the one before (e.g. the foot of the height on B). */
function polygon(points: readonly Vec[]): Vec[] {
  return points.filter((p, i) => !same(p, points[(i + points.length - 1) % points.length] ?? p))
}

function vertexOf(vertices: readonly Vec[], i: number): Vec {
  const v = vertices[i]
  if (!v) throw new RangeError(`No vertex ${i}`)
  return v
}

// ---------------------------------------------------------------------------
// Texts and calculation

/** `A = g·h/2 = 6·4/2 = 12 cm²` */
function resultLine(shape: ShapeKind, measures: Measures): DecomposeLine {
  const chain = calculationChain(areaFormula(shape), measures)
  return {
    text: `${calculationToText('area', chain)} cm²`,
    latex: `${calculationToLatex('area', chain)}\\,${unitToLatex('cm²')}`,
  }
}

/** The figure taken twice: `Parallelogramm: g·h = 6·4 = 24 cm²`, `Rechteck: e·f = …`. */
function doubledLine(shape: ShapeKind, measures: Measures): DecomposeLine {
  const formula = areaFormula(shape)
  if (formula.type !== 'div') throw new RangeError(`The area of a ${shape} is not half of something`)
  const chain = calculationChain(formula.num, measures)
  const name = shape === 'rhombus' ? 'Rechteck' : 'Parallelogramm'
  return {
    text: `${name}: ${chain.map((e) => toText(e, DECIMAL)).join(' = ')} cm²`,
    latex: `\\text{${name}: } ${chain.map((e) => toLatex(e, DECIMAL)).join(' = ')}\\,${unitToLatex('cm²')}`,
  }
}

function startCaption(shape: ShapeKind, m: (letter: Letter) => number): string {
  switch (shape) {
    case 'parallelogram':
      return `Ein Parallelogramm mit der Grundseite g = ${lengthText(m('g'))} und der Höhe h = ${lengthText(m('h'))}.`
    case 'triangle':
      return `Ein Dreieck mit der Grundseite g = ${lengthText(m('g'))} und der Höhe h = ${lengthText(m('h'))}.`
    case 'rhombus':
      return `Eine Raute mit den Diagonalen e = ${lengthText(m('e'))} und f = ${lengthText(m('f'))}.`
    case 'trapezoid':
      return `Ein Trapez mit den parallelen Seiten a = ${lengthText(m('a'))} und c = ${lengthText(m('c'))} und der Höhe h = ${lengthText(m('h'))}.`
  }
}

// ---------------------------------------------------------------------------
// Frames

interface Context {
  shape: ShapeKind
  measures: Measures
  figure: TaskFigure
  m: (letter: Letter) => number
}

/** Assumes a widget without problems (`decomposeProblems` builds it to measure the width). */
export function buildDecompose(widget: DecomposeWidget): DecomposeModel {
  const letters = shapeLetters(widget.shape, 'area')
  const m = (letter: Letter) => widget.measures[letter] ?? 0
  const measures: Measures = Object.fromEntries(letters.map((letter) => [letter, toLength(m(letter))]))
  const task = buildAreaTask(widget.shape, widget.measures, widget.offset === undefined ? {} : { offset: widget.offset })
  if (task.kind !== 'area') throw new RangeError(`Unexpected task ${task.kind}`)
  const context: Context = { shape: widget.shape, measures, figure: task.figure, m }
  const frames = framesOf(context)
  return { shape: widget.shape, frames, bounds: framesBounds(frames) }
}

function framesOf(context: Context): DecomposeFrame[] {
  switch (context.shape) {
    case 'parallelogram':
      return parallelogramFrames(context)
    case 'triangle':
    case 'trapezoid':
      return doubledFrames(context)
    case 'rhombus':
      return rhombusFrames(context)
  }
}

function frame(caption: string, figure: TaskFigure, pieces: DecomposePiece[], extra: Partial<DecomposeFrame> = {}): DecomposeFrame {
  return { caption, figure, pieces, outlines: [], cut: null, center: null, lines: [], ...extra }
}

/** Cut along the height from D, move the triangle by g to the right: a rectangle. */
function parallelogramFrames({ figure, measures, m }: Context): DecomposeFrame[] {
  const v = figure.vertices
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => vertexOf(v, i)) as [Vec, Vec, Vec, Vec]
  const foot: Vec = [d[0], a[1]]
  const by: Vec = sub(b, a)
  const left = polygon([a, foot, d])
  const rest = polygon([foot, b, c, d])
  const moved = left.map((p) => add(p, by))
  const rectangle = [foot, add(foot, by), c, d]
  const rectangleFigure = buildFigure('parallelogram', rectangle, ['g', 'h'], measures)
  const whole: DecomposePiece = { id: 'whole', points: v, tone: 'figure' }
  const restPiece: DecomposePiece = { id: 'rest', points: rest, tone: 'figure' }
  const result: DecomposeOutline = { id: 'result', points: rectangle, kind: 'result' }
  return [
    frame(startCaption('parallelogram', m), figure, [whole]),
    frame('Schneide entlang der Höhe ein Dreieck ab.', figure, [restPiece, { id: 'part', points: left, tone: 'copy', enter: { kind: 'appear' } }], {
      cut: [d, foot],
    }),
    frame(
      `Schiebe das Dreieck um g = ${lengthText(m('g'))} nach rechts an die andere Seite.`,
      rectangleFigure,
      [restPiece, { id: 'part', points: moved, tone: 'copy', enter: { kind: 'translate', by } }],
    ),
    frame(
      'Es entsteht ein Rechteck mit den Seiten g und h. Der Flächeninhalt hat sich nicht verändert.',
      rectangleFigure,
      [restPiece, { id: 'part', points: moved, tone: 'copy' }],
      { outlines: [{ ...result, appears: true }], lines: [resultLine('parallelogram', measures)] },
    ),
  ]
}

/** A copy turned by 180° about the midpoint M of BC; together a parallelogram. */
function doubledFrames({ shape, figure, measures, m }: Context): DecomposeFrame[] {
  const v = figure.vertices
  const b = vertexOf(v, 1)
  const c = vertexOf(v, 2)
  const center = mid(b, c)
  const turn = turnAbout(b, c)
  const copy = v.map(turn)
  const original: DecomposePiece = { id: 'figure', points: v, tone: 'figure' }
  const copyPiece: DecomposePiece = { id: 'copy', points: copy, tone: 'copy' }
  const a = vertexOf(v, 0)
  // Parallelogram A, B, A', C (triangle) or A, D', A', D (trapezoid).
  const parallelogram = shape === 'triangle' ? [a, b, turn(a), c] : [a, turn(vertexOf(v, 3)), turn(a), vertexOf(v, 3)]
  const doubledFigure = shape === 'triangle' ? buildFigure('parallelogram', parallelogram, ['g', 'h'], measures) : doubledTrapezoid(parallelogram, v, measures)
  const result: DecomposeOutline = { id: 'result', points: parallelogram, kind: 'result' }
  const turned =
    shape === 'triangle'
      ? 'Drehe eine Kopie des Dreiecks um 180° um den Punkt M in der Mitte einer Seite.'
      : 'Drehe eine Kopie des Trapezes um 180° um den Punkt M in der Mitte eines Schenkels.'
  const together =
    shape === 'triangle'
      ? 'Dreieck und Kopie bilden zusammen ein Parallelogramm mit der Grundseite g und der Höhe h.'
      : 'Trapez und Kopie bilden zusammen ein Parallelogramm. Seine Grundseite ist a + c, die Höhe h.'
  return [
    frame(startCaption(shape, m), figure, [original]),
    frame(turned, figure, [original, { ...copyPiece, enter: { kind: 'rotate', about: center } }], { center }),
    frame(together, doubledFigure, [original, copyPiece], {
      outlines: [{ ...result, appears: true }],
      lines: [doubledLine(shape, measures)],
    }),
    frame(`${shape === 'triangle' ? 'Das Dreieck' : 'Das Trapez'} ist die Hälfte des Parallelogramms.`, figure, [original, { ...copyPiece, faded: true }], {
      outlines: [result],
      lines: [resultLine(shape, measures)],
    }),
  ]
}

/** The doubled trapezoid with a and c side by side below its base, and the height h. */
function doubledTrapezoid(parallelogram: readonly Vec[], trapezoid: readonly Vec[], measures: Measures): TaskFigure {
  const withHeight = buildFigure('parallelogram', parallelogram, ['h'], measures)
  const a = vertexOf(trapezoid, 0)
  const b = vertexOf(trapezoid, 1)
  const end = vertexOf(parallelogram, 1)
  const side = (letter: Letter, from: Vec, to: Vec): FigureLabel => {
    const value = measures[letter]
    if (!value) throw new RangeError(`No length for ${letter}`)
    return { letter, value, given: true, kind: 'side', from, to }
  }
  return { ...withHeight, labels: [side('a', a, b), side('c', b, end), ...withHeight.labels] }
}

/** The rectangle e × f around the rhombus; copies of its four triangles fill the corners. */
function rhombusFrames({ figure, measures, m }: Context): DecomposeFrame[] {
  const v = figure.vertices
  const [a, b, c, d] = [0, 1, 2, 3].map((i) => vertexOf(v, i)) as [Vec, Vec, Vec, Vec]
  const center = mid(a, c)
  const rectangle: Vec[] = [
    [a[0], b[1]],
    [c[0], b[1]],
    [c[0], d[1]],
    [a[0], d[1]],
  ]
  const sides: [Vec, Vec][] = [
    [a, b],
    [b, c],
    [c, d],
    [d, a],
  ]
  const copies = sides.map(([p, q], i): DecomposePiece => {
    const turn = turnAbout(p, q)
    return { id: `corner-${i}`, points: [p, q, center].map(turn), tone: 'copy', order: i }
  })
  const turning = sides.map(([p, q], i): DecomposePiece => ({
    ...(copies[i] as DecomposePiece),
    enter: { kind: 'rotate', about: mid(p, q) },
  }))
  const original: DecomposePiece = { id: 'figure', points: v, tone: 'figure' }
  const guide: DecomposeOutline = { id: 'guide', points: rectangle, kind: 'guide' }
  return [
    frame(startCaption('rhombus', m), figure, [original]),
    frame('Zeichne um die Raute ein Rechteck mit den Seiten e und f.', figure, [original], { outlines: [{ ...guide, appears: true }] }),
    frame('Die Diagonalen teilen die Raute in vier Dreiecke. Je eine Kopie füllt eine Ecke des Rechtecks.', figure, [original, ...turning], {
      outlines: [guide],
    }),
    frame('Das Rechteck ist doppelt so groß wie die Raute.', figure, [original, ...copies], {
      outlines: [{ id: 'result', points: rectangle, kind: 'result', appears: true }],
      lines: [doubledLine('rhombus', measures), resultLine('rhombus', measures)],
    }),
  ]
}

// ---------------------------------------------------------------------------
// Frame bounds, texts

/** Room around the marked centre M for its name, in cm. */
const CENTER_LABEL = 0.7

function framesBounds(frames: readonly DecomposeFrame[]): ShapeBounds {
  const pad = 0.3
  const all: ShapeBounds[] = []
  for (const f of frames) {
    all.push(layoutShape(f.figure).bounds)
    const points = [...f.pieces.flatMap((p) => p.points), ...f.outlines.flatMap((o) => o.points)]
    if (f.center) points.push(add(f.center, [CENTER_LABEL, CENTER_LABEL]), sub(f.center, [CENTER_LABEL, CENTER_LABEL]))
    all.push({
      minX: Math.min(...points.map((p) => p[0])) - pad,
      minY: Math.min(...points.map((p) => p[1])) - pad,
      maxX: Math.max(...points.map((p) => p[0])) + pad,
      maxY: Math.max(...points.map((p) => p[1])) + pad,
    })
  }
  return {
    minX: Math.min(...all.map((b) => b.minX)),
    minY: Math.min(...all.map((b) => b.minY)),
    maxX: Math.max(...all.map((b) => b.maxX)),
    maxY: Math.max(...all.map((b) => b.maxY)),
  }
}

/** Number of steps (frames after the start). */
export function decomposeStepTotal(model: DecomposeModel): number {
  return model.frames.length - 1
}

export function decomposeFrame(model: DecomposeModel, index: number): DecomposeFrame {
  const f = model.frames[Math.max(0, Math.min(index, model.frames.length - 1))]
  if (!f) throw new RangeError('A decomposition without frames')
  return f
}

/** All calculation lines shown up to frame `index`. */
export function decomposeLines(model: DecomposeModel, index: number): DecomposeLine[] {
  return model.frames.slice(0, index + 1).flatMap((f) => f.lines)
}

/** Text of the live region for a frame: its caption and the lines that appear in it. */
export function describeDecomposeFrame(model: DecomposeModel, index: number): string {
  const f = decomposeFrame(model, index)
  return [f.caption, ...f.lines.map((l) => `${l.text}.`)].join(' ')
}

/** LaTeX of every calculation line, for `deckLatex`. */
export function decomposeLatex(model: DecomposeModel): string[] {
  return model.frames.flatMap((f) => f.lines.map((l) => l.latex))
}
