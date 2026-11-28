import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildDecompose,
  decomposeFrame,
  decomposeLines,
  decomposeStepTotal,
  describeDecomposeFrame,
  type DecomposePiece,
  type DecomposeWidget,
  type PieceMotion,
} from '../../cards'
import { animate, DURATION, EASING, ENTER, useSequencePlayer } from '../../motion'
import { layoutShape, PX_PER_UNIT, SHAPE_UNIT, shapeToView, shapeViewBox, svgPoints } from '../../shapes'
import ShapeDrawing from '../shapes/ShapeDrawing'
import Tex from '../Tex'

/** Pause between two steps while playing; longer than a move, so each one settles. */
const STEP_PAUSE = 1400

/** Delay between pieces that move together (the four corners of the rhombus). */
const STAGGER = 120

/** Where the name M sits next to the centre of a rotation, in cm. */
const CENTER_NAME = { dx: 0.3, dy: 0.35 } as const

/**
 * Keyframes from the place of the piece in the frame before to its place now
 * (convention of src/motion: the last keyframe is the resting style). A turn
 * about M is written as translate · rotate · translate, so it turns about M
 * on the way and not about the origin.
 */
function pieceKeyframes(motion: PieceMotion): Keyframe[] {
  switch (motion.kind) {
    case 'appear':
      return [...ENTER.fade]
    case 'translate': {
      const x = motion.by[0] * SHAPE_UNIT
      const y = -motion.by[1] * SHAPE_UNIT
      return [{ transform: `translate(${-x}px, ${-y}px)` }, { transform: 'none' }]
    }
    case 'rotate': {
      const m = shapeToView(motion.about)
      const around = (deg: number) => `translate(${m.x}px, ${m.y}px) rotate(${deg}deg) translate(${-m.x}px, ${-m.y}px)`
      return [{ transform: around(-180) }, { transform: around(0) }]
    }
  }
}

function pieceClass(piece: DecomposePiece): string {
  return ['decompose-piece', `is-${piece.tone}`, piece.faded ? 'is-faded' : ''].filter(Boolean).join(' ')
}

/**
 * A figure taken apart or doubled step by step (see src/cards/decompose.ts).
 * "Nächster Schritt" shows the next step: pieces glide or turn from their
 * old place to the new one, new outlines and calculation lines fade in.
 * "Abspielen" runs through all steps. With reduced motion there is no
 * playback: the second button shows the last step at once, and nothing
 * moves. Each step is announced in a live region.
 */
export default function DecomposeView({ widget }: { widget: DecomposeWidget }) {
  const model = useMemo(() => buildDecompose(widget), [widget])
  const total = decomposeStepTotal(model)
  const [index, setIndex] = useState(0)
  const { play, stop, playing, reducedMotion } = useSequencePlayer()
  const pieceRefs = useRef(new Map<string, SVGGElement>())
  const outlineRefs = useRef(new Map<string, SVGPolygonElement>())
  const lineRefs = useRef(new Map<number, HTMLLIElement>())
  const previous = useRef(0)

  // Animate only a single step forward, never the first render, a jump or "Von vorn".
  useEffect(() => {
    const before = previous.current
    previous.current = index
    if (index !== before + 1) return
    const current = decomposeFrame(model, index)
    for (const piece of current.pieces) {
      if (!piece.enter) continue
      const appear = piece.enter.kind === 'appear'
      void animate(pieceRefs.current.get(piece.id), pieceKeyframes(piece.enter), {
        duration: appear ? DURATION.medium : DURATION.move,
        easing: appear ? EASING.out : EASING.inOut,
        delay: (piece.order ?? 0) * STAGGER,
        reducedMotion,
      })
    }
    for (const outline of current.outlines) {
      if (outline.appears) void animate(outlineRefs.current.get(outline.id), ENTER.fade, { duration: DURATION.medium, reducedMotion })
    }
    const from = decomposeLines(model, before).length
    const to = decomposeLines(model, index).length
    for (let i = from; i < to; i++) {
      void animate(lineRefs.current.get(i), ENTER.fromBelow, { duration: DURATION.medium, delay: DURATION.medium, reducedMotion })
    }
  }, [model, index, reducedMotion])

  const frame = decomposeFrame(model, index)
  const layout = useMemo(() => layoutShape(frame.figure), [frame.figure])
  const lines = decomposeLines(model, index)
  const box = shapeViewBox(model.bounds)
  const all = index === total
  const name = widget.label ?? 'Zerlegen'

  const onStep = () => {
    stop()
    setIndex(all ? 0 : index + 1)
  }

  const onPlay = () => {
    if (playing) {
      stop()
      return
    }
    // Reduced motion: no playback over time, just the final state.
    if (reducedMotion) {
      setIndex(total)
      return
    }
    const start = all ? 0 : index
    if (all) setIndex(0)
    void play(
      Array.from({ length: total - start }, (_, i) => ({
        run: () => setIndex(start + i + 1),
        pause: STEP_PAUSE,
      })),
    )
  }

  const playLabel = playing ? 'Anhalten' : reducedMotion ? 'Alle zeigen' : 'Abspielen'
  const nothingToPlay = reducedMotion && all
  const center = frame.center ? shapeToView(frame.center) : null
  const centerName = frame.center ? shapeToView([frame.center[0] + CENTER_NAME.dx, frame.center[1] + CENTER_NAME.dy]) : null

  return (
    <div className="widget shape-widget decompose">
      <svg
        className="shape-svg decompose-svg"
        viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
        style={{ maxWidth: `${Math.round(box.width * PX_PER_UNIT)}px` }}
        role="img"
        aria-label={`${name}. ${frame.caption}`}
      >
        {frame.pieces.map((piece) => (
          <g
            key={piece.id}
            ref={(el) => {
              if (el) pieceRefs.current.set(piece.id, el)
              else pieceRefs.current.delete(piece.id)
            }}
            className={pieceClass(piece)}
            data-piece={piece.id}
          >
            <polygon points={svgPoints(piece.points)} />
          </g>
        ))}
        {frame.outlines.map((outline) => (
          <polygon
            key={outline.id}
            ref={(el) => {
              if (el) outlineRefs.current.set(outline.id, el)
              else outlineRefs.current.delete(outline.id)
            }}
            className={`decompose-outline is-${outline.kind}`}
            points={svgPoints(outline.points)}
          />
        ))}
        {frame.cut && (
          <line
            className="decompose-cut"
            x1={shapeToView(frame.cut[0]).x}
            y1={shapeToView(frame.cut[0]).y}
            x2={shapeToView(frame.cut[1]).x}
            y2={shapeToView(frame.cut[1]).y}
          />
        )}
        <ShapeDrawing layout={layout} outline={false} decorative />
        {center && centerName && (
          <g className="decompose-center">
            <circle cx={center.x} cy={center.y} r={3.5} />
            <text className="shape-text shape-text-vertex" x={centerName.x} y={centerName.y} textAnchor="middle" dominantBaseline="central">
              M
            </text>
          </g>
        )}
      </svg>
      <p className="decompose-caption">{frame.caption}</p>
      {lines.length > 0 && (
        <ol className="decompose-lines" aria-label="Rechnung">
          {lines.map((line, i) => (
            <li
              key={i}
              ref={(el) => {
                if (el) lineRefs.current.set(i, el)
                else lineRefs.current.delete(i)
              }}
            >
              <Tex latex={line.latex} />
            </li>
          ))}
        </ol>
      )}
      <p className="visually-hidden" aria-live="polite">
        {index === 0 ? '' : describeDecomposeFrame(model, index)}
      </p>
      <div className="practice-actions">
        <button type="button" className="btn btn-secondary" onClick={onStep}>
          {all ? 'Von vorn' : 'Nächster Schritt'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          aria-disabled={nothingToPlay || undefined}
          onClick={nothingToPlay ? undefined : onPlay}
        >
          {playLabel}
        </button>
        <span className="term-steps-count">
          {index} von {total} Schritten
        </span>
      </div>
    </div>
  )
}
