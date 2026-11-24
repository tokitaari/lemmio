import { useMemo, useState } from 'react'
import {
  buildLinePoints,
  lineAnnouncement,
  lineLatex,
  lineThrough,
  matchesTarget,
  POINT_LABELS,
  tableCells,
  TARGET_HINT,
  TARGET_REACHED,
  targetLine,
  verticalNote,
  type LinePointsWidget,
} from '../../cards'
import { formatNumber, type GridPoint } from '../../plane'
import CoordinatePlane, { type PlaneLineItem, type PlanePointItem } from '../plane/CoordinatePlane'
import Tex from '../Tex'

type Pair = readonly [GridPoint, GridPoint]

const POINT_IDS = ['p', 'q'] as const

function movePair(pair: Pair, id: string, at: GridPoint): Pair {
  return id === 'p' ? [at, pair[1]] : [pair[0], at]
}

/**
 * Two movable points P and Q and the line through them; the equation and
 * the table of values below follow every move. The plane announces each
 * move together with the new equation. A vertical line is shown as no
 * function. Nothing is animated.
 */
export default function LinePointsView({ widget }: { widget: LinePointsWidget }) {
  const model = useMemo(() => buildLinePoints(widget), [widget])
  const [pair, setPair] = useState<Pair>(model.start)

  // The plane keeps P and Q apart, so there always is a line.
  const line = lineThrough(pair[0], pair[1])
  const target = model.target
  const reached = target ? matchesTarget(line, target) : false
  const cells = line ? tableCells(line, model.table, pair) : []

  const lines: PlaneLineItem[] = [
    ...(target ? [{ id: 'target', line: targetLine(target), tone: 'muted' as const, dashed: true }] : []),
    ...(line ? [{ id: 'f', line, label: line.kind === 'function' ? model.name : undefined }] : []),
  ]
  const points = pair.map(
    (p, i): PlanePointItem => ({
      id: POINT_IDS[i] ?? 'p',
      label: POINT_LABELS[i] ?? 'P',
      x: p.x,
      y: p.y,
      drag: { kind: 'free' },
      showCoordinates: true,
    }),
  )

  return (
    <div className="widget line-widget">
      <CoordinatePlane
        window={model.window}
        label={widget.label ?? 'Gerade durch P und Q'}
        lines={lines}
        points={points}
        onPointChange={(id, at) => setPair((from) => movePair(from, id, at))}
        describe={(id, at) => {
          const moved = movePair(pair, id, at)
          return lineAnnouncement(lineThrough(moved[0], moved[1]), model.name)
        }}
      />
      {line && (
        <p className="line-equation">
          <Tex latex={lineLatex(line, model.name)} />
        </p>
      )}
      {line?.kind === 'vertical' && <p className="line-note">{verticalNote(line)}</p>}
      {cells.length > 0 && (
        <div className="value-table-wrap">
          <table className="value-table">
            <caption>Wertetabelle</caption>
            <tbody>
              <tr>
                <th scope="row">
                  <Tex latex="x" />
                </th>
                {cells.map((cell) => (
                  <td key={cell.x} className={cell.points.length > 0 ? 'is-marked' : undefined}>
                    {formatNumber(cell.x)}
                    {cell.points.length > 0 && <span className="visually-hidden"> (Punkt {cell.points.join(' und ')})</span>}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  <Tex latex={`${model.name}(x)`} />
                </th>
                {cells.map((cell) => (
                  <td key={cell.x} className={cell.points.length > 0 ? 'is-marked' : undefined}>
                    {cell.latex ? <Tex latex={cell.latex} /> : '–'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {target && <p className={reached ? 'line-status is-done' : 'line-status'}>{reached ? TARGET_REACHED : TARGET_HINT}</p>}
      {target && (
        <p className="visually-hidden" aria-live="polite">
          {reached ? TARGET_REACHED : ''}
        </p>
      )}
    </div>
  )
}
