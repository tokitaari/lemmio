import { useState, type ReactNode } from 'react'
import CoordinatePlane, { type PlanePointItem, type PlanePolygonItem } from '../../components/plane/CoordinatePlane'
import ShapeDrawing from '../../components/shapes/ShapeDrawing'
import ShapeFigure from '../../components/shapes/ShapeFigure'
import {
  buildAreaTask,
  buildFigure,
  buildPerimeterTask,
  buildReverseTask,
  GEOMETRY_WINDOW,
  toLength,
  type GeometryTask,
  type TaskFigure,
  type Vec,
} from '../../math'
import type { GridPoint } from '../../plane'
import { layoutShape } from '../../shapes'

/**
 * Demo of the figures at /dev/figuren, for checking labels, heights and
 * extensions in both themes and at 360 px. Like /dev/karten it exists only in
 * the dev server.
 */
export default function ShapesDemo() {
  return (
    <>
      <h1>Figuren-Demo</h1>
      <p className="lead">Nur im Dev-Server sichtbar. Alle Figuren sind maßstäblich: 1 cm ist überall gleich groß.</p>
      {GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={group.id} className="panel">
          <h2 id={group.id}>{group.title}</h2>
          {group.items.map((item) => (
            <Figure key={item.title} title={item.title}>
              <ShapeFigure figure={item.figure} />
            </Figure>
          ))}
        </section>
      ))}
      <GridHeight />
      <GridAttempt />
    </>
  )
}

function Figure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="widget">
      {children}
      <figcaption className="area-caption">{title}</figcaption>
    </figure>
  )
}

function figureOf(task: GeometryTask): TaskFigure {
  if (task.kind === 'area' || task.kind === 'perimeter' || task.kind === 'reverse') return task.figure
  throw new RangeError(`No figure for ${task.kind}`)
}

interface DemoGroup {
  id: string
  title: string
  items: { title: string; figure: TaskFigure }[]
}

const item = (title: string, task: GeometryTask) => ({ title, figure: figureOf(task) })

const GROUPS: DemoGroup[] = [
  {
    id: 'parallelogramm',
    title: 'Parallelogramm',
    items: [
      item('Fläche: g = 6 cm, h = 4 cm', buildAreaTask('parallelogram', { g: 6, h: 4 })),
      item('Fläche mit Ablenker b = 5 cm', buildAreaTask('parallelogram', { g: 6, h: 4, b: 5 })),
      item('Höhe außerhalb: g = 3 cm, h = 2 cm, b = 6 cm', buildAreaTask('parallelogram', { g: 3, h: 2, b: 6 })),
      item('Halbe Zahlen: g = 6,5 cm, h = 3,5 cm', buildAreaTask('parallelogram', { g: 6.5, h: 3.5 })),
      item('Umfang: a = 6 cm, b = 4 cm', buildPerimeterTask('parallelogram', { a: 6, b: 4 })),
      item('Rückwärts: h gesucht', buildReverseTask('parallelogram', { g: 7, h: 3 }, 'h')),
    ],
  },
  {
    id: 'dreieck',
    title: 'Dreieck',
    items: [
      item('Spitze über der Grundseite', buildAreaTask('triangle', { g: 6, h: 4 })),
      item('Rechtwinklig (Höhe = Seite)', buildAreaTask('triangle', { g: 6, h: 4 }, { offset: 0 })),
      item('Stumpf, Spitze links', buildAreaTask('triangle', { g: 5, h: 3 }, { offset: -2 })),
      item('Stumpf, Spitze rechts', buildAreaTask('triangle', { g: 4, h: 3.5 }, { offset: 6.5 })),
      item('Kleinstes Dreieck: g = 3 cm, h = 2 cm', buildAreaTask('triangle', { g: 3, h: 2 })),
      item('Umfang: a = 5 cm, b = 4 cm, c = 3 cm', buildPerimeterTask('triangle', { a: 5, b: 4, c: 3 })),
      item('Rückwärts: g gesucht', buildReverseTask('triangle', { g: 6, h: 4 }, 'g')),
    ],
  },
  {
    id: 'raute',
    title: 'Raute',
    items: [
      item('Fläche: e = 8 cm, f = 6 cm', buildAreaTask('rhombus', { e: 8, f: 6 })),
      item('Schmal: e = 12 cm, f = 3 cm', buildAreaTask('rhombus', { e: 12, f: 3 })),
      item('Umfang: a = 5 cm', buildPerimeterTask('rhombus', { a: 5 })),
      item('Rückwärts: f gesucht', buildReverseTask('rhombus', { e: 9, f: 4 }, 'f')),
    ],
  },
  {
    id: 'trapez',
    title: 'Trapez',
    items: [
      item('Gleichschenklig: a = 8 cm, c = 4 cm, h = 3 cm', buildAreaTask('trapezoid', { a: 8, c: 4, h: 3 })),
      item('Allgemein: D weit links', buildAreaTask('trapezoid', { a: 8, c: 3, h: 4 }, { offset: 0.5 })),
      item('Umfang: a = 8, b = 3, c = 4, d = 3 cm', buildPerimeterTask('trapezoid', { a: 8, b: 3, c: 4, d: 3 })),
      item('Rückwärts: c gesucht', buildReverseTask('trapezoid', { a: 6, c: 4, h: 3 }, 'c')),
    ],
  },
]

// ---- Grid without axes

const TRIANGLE: readonly Vec[] = [
  [4, 2],
  [9, 2],
  [2, 6],
]
const FOOT: GridPoint = { x: 2, y: 2 }
const TRIANGLE_LAYOUT = layoutShape(buildFigure('triangle', TRIANGLE, ['g', 'h'], { g: toLength(5), h: toLength(4) }))

const polygonFrom = (id: string, vertices: readonly Vec[], description: string, extra: Partial<PlanePolygonItem> = {}): PlanePolygonItem => ({
  id,
  points: vertices.map(([x, y]) => ({ x, y })),
  description,
  ...extra,
})

/** Draw-height preview: F moves on the line AB; at the foot the height appears with its extension. */
function GridHeight() {
  const [foot, setFoot] = useState<GridPoint>({ x: 6, y: 2 })
  const done = foot.x === FOOT.x && foot.y === FOOT.y
  const points: PlanePointItem[] = [
    { id: 'a', label: 'A', x: 4, y: 2 },
    { id: 'b', label: 'B', x: 9, y: 2 },
    { id: 'c', label: 'C', x: 2, y: 6 },
    { id: 'f', label: 'F', ...foot, tone: 'pink', drag: { kind: 'on-line', line: { kind: 'function', m: 0, n: 2 } } },
  ]
  return (
    <section aria-labelledby="gitter-hoehe" className="panel">
      <h2 id="gitter-hoehe">Gitter ohne Achsen: Höhe einzeichnen</h2>
      <figure className="widget">
        <CoordinatePlane
          axes={false}
          window={GEOMETRY_WINDOW}
          label="Höhe von C auf die Gerade AB"
          polygons={[polygonFrom('abc', TRIANGLE, 'Dreieck ABC mit A(4|2), B(9|2), C(2|6)')]}
          points={points}
          onPointChange={(_, p) => setFoot(p)}
          describe={(_, p) => (p.x === FOOT.x && p.y === FOOT.y ? 'F ist der Fußpunkt der Höhe.' : '')}
          overlay={() => (done ? <ShapeDrawing layout={TRIANGLE_LAYOUT} outline={false} decorative /> : null)}
        />
        <figcaption className="area-caption">
          {done ? 'F ist der Fußpunkt: Die Höhe liegt außerhalb, auf der Verlängerung von AB.' : 'Ziehe F auf der Geraden AB, bis CF senkrecht auf AB steht.'}
        </figcaption>
      </figure>
    </section>
  )
}

/** Own figure dashed in danger next to the solution, as later in the worked solution of drawing tasks. */
function GridAttempt() {
  const solution: Vec[] = [
    [2, 2],
    [7, 2],
    [9, 6],
    [4, 6],
  ]
  const attempt: Vec[] = [
    [2, 2],
    [7, 2],
    [9, 6],
    [3, 7],
  ]
  return (
    <section aria-labelledby="gitter-versuch" className="panel">
      <h2 id="gitter-versuch">Gitter ohne Achsen: eigene Figur und Lösung</h2>
      <figure className="widget">
        <CoordinatePlane
          axes={false}
          window={GEOMETRY_WINDOW}
          label="Parallelogramm ergänzen"
          polygons={[
            polygonFrom('solution', solution, 'Lösung: Parallelogramm ABCD mit D(4|6)'),
            polygonFrom('attempt', attempt, 'Deine Figur mit D(3|7), kein Parallelogramm', {
              tone: 'danger',
              dashed: true,
              filled: false,
            }),
          ]}
        />
        <figcaption className="area-caption">Lösung gefüllt in Akzentfarbe, eigene Figur gestrichelt in Rot.</figcaption>
      </figure>
    </section>
  )
}
