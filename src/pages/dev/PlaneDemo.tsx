import { useState, type ReactNode } from 'react'
import CoordinatePlane, { type PlaneLineItem, type PlanePointItem } from '../../components/plane/CoordinatePlane'
import { lineThroughPoints, point, Rational } from '../../math'
import { lineText, type GridPoint, type PlaneLine, type PlaneWindow } from '../../plane'

/**
 * Demo of the coordinate plane at /dev/koordinaten, for checking it in both
 * themes and at 360 px. Like /dev/karten it exists only in the dev server.
 */
export default function PlaneDemo() {
  return (
    <>
      <h1>Koordinatensystem-Demo</h1>
      <p className="lead">Nur im Dev-Server sichtbar. Punkte lassen sich ziehen oder nach Antippen mit den Pfeiltasten verschieben.</p>
      <TwoLines />
      <TwoPoints />
      <InterceptAndPoint />
      <PlacePoints />
    </>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="panel">
      <h2 id={id}>{title}</h2>
      <figure className="widget">{children}</figure>
    </section>
  )
}

const move = (points: PlanePointItem[], id: string, p: GridPoint) => points.map((q) => (q.id === id ? { ...q, ...p } : q))

/** Two fixed lines with their intersection. */
function TwoLines() {
  const lines: PlaneLineItem[] = [
    { id: 'f', label: 'f', line: { kind: 'function', m: 2, n: -3 } },
    { id: 'g', label: 'g', tone: 'pink', line: { kind: 'function', m: Rational.of(-1, 2), n: 2 } },
  ]
  return (
    <Section id="geraden" title="Zwei Geraden">
      <CoordinatePlane label="Geraden f und g" lines={lines} points={[{ id: 's', label: 'S', x: 2, y: 1, showCoordinates: true }]} />
      <figcaption className="area-caption">f(x) = 2x − 3 und g(x) = −½x + 2 schneiden sich in S(2|1).</figcaption>
    </Section>
  )
}

/** The line through two free points; the equation follows. */
function TwoPoints() {
  const [points, setPoints] = useState<PlanePointItem[]>([
    { id: 'p', label: 'P', x: 0, y: -3, drag: { kind: 'free' }, showCoordinates: true },
    { id: 'q', label: 'Q', x: 2, y: 1, drag: { kind: 'free' }, showCoordinates: true },
  ])
  const lineFor = (ps: readonly PlanePointItem[]): PlaneLine | null => {
    const [a, b] = ps
    if (!a || !b) return null
    const through = lineThroughPoints(point(a.x, a.y), point(b.x, b.y))
    return through.kind === 'same-point' ? null : through
  }
  const line = lineFor(points)
  const text = line ? lineText(line, line.kind === 'function' ? 'f' : undefined) : 'keine Gerade'
  return (
    <Section id="zwei-punkte" title="Gerade durch zwei Punkte">
      <CoordinatePlane
        label="Gerade durch P und Q"
        lines={line ? [{ id: 'f', label: line.kind === 'function' ? 'f' : undefined, line }] : []}
        points={points}
        onPointChange={(id, p) => setPoints((current) => move(current, id, p))}
        describe={(id, p) => {
          const next = lineFor(move(points, id, p))
          return next ? `Gerade ${lineText(next, next.kind === 'function' ? 'f' : undefined)}` : ''
        }}
      />
      <figcaption className="area-caption">{text}</figcaption>
    </Section>
  )
}

/** n on the y-axis (vertical) and a point that stays on the line (on-line). */
function InterceptAndPoint() {
  const [n, setN] = useState(1)
  const [px, setPx] = useState(2)
  const line: PlaneLine = { kind: 'function', m: 1, n }
  // P keeps its x when n changes, as long as it stays in the window; otherwise it moves next to the y-axis.
  const x = Math.abs(px + n) <= 8 ? px : n > 0 ? -1 : 1
  const points: PlanePointItem[] = [
    { id: 'n', label: 'N', x: 0, y: n, drag: { kind: 'vertical' }, tone: 'pink' },
    { id: 'p', label: 'P', x, y: x + n, drag: { kind: 'on-line', line }, showCoordinates: true },
  ]
  return (
    <Section id="achsenabschnitt" title="Achsenabschnitt und Punkt auf der Geraden">
      <CoordinatePlane
        label="Gerade mit Steigung 1"
        lines={[{ id: 'f', label: 'f', line }]}
        points={points}
        onPointChange={(id, p) => {
          if (id === 'n') setN(p.y)
          else setPx(p.x)
        }}
        describe={(id, p) => (id === 'n' ? lineText({ kind: 'function', m: 1, n: p.y }, 'f') : '')}
      />
      <figcaption className="area-caption">N bewegt sich nur auf der y-Achse, P nur auf der Geraden {lineText(line, 'f')}.</figcaption>
    </Section>
  )
}

const SMALL: PlaneWindow = { x: [0, 10], y: [-2, 8] }

/** Tapping places points (at most three) in a window that starts at an axis; Z moves on the x-axis only. */
function PlacePoints() {
  const [placed, setPlaced] = useState<GridPoint[]>([{ x: 3, y: 4 }])
  const [z, setZ] = useState(6)
  const points: PlanePointItem[] = [
    ...placed.map((p, i) => ({ id: `a${i}`, label: `A${i + 1}`, x: p.x, y: p.y, drag: { kind: 'free' } as const })),
    { id: 'z', label: 'Z', x: z, y: 0, drag: { kind: 'horizontal' }, tone: 'pink' },
  ]
  return (
    <Section id="setzen" title="Punkte setzen (kleines Fenster)">
      <CoordinatePlane
        label="Punkte setzen"
        window={SMALL}
        points={points}
        onPlace={(p) =>
          setPlaced((current) =>
            points.some((q) => q.x === p.x && q.y === p.y) ? current : [...current, p].slice(-3),
          )
        }
        onPointChange={(id, p) => {
          if (id === 'z') setZ(p.x)
          else setPlaced((current) => current.map((q, i) => (`a${i}` === id ? p : q)))
        }}
      />
      <figcaption className="area-caption">
        Tippe ins Gitter, um einen Punkt zu setzen (höchstens drei). Z bewegt sich nur auf der x-Achse.
      </figcaption>
    </Section>
  )
}
