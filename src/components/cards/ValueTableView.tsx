import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import {
  buildValueTable,
  cellFeedback,
  cellLabel,
  completeText,
  editCell,
  initialValueTable,
  isCellDone,
  isTableComplete,
  lineLatex,
  nextOpenCell,
  submitCell,
  tableHint,
  tablePoints,
  type ValueTableModel,
  type ValueTableState,
  type ValueTableWidget,
} from '../../cards'
import { formatNumber } from '../../plane'
import InputEcho from '../InputEcho'
import CoordinatePlane, { type PlaneLineItem, type PlanePointItem } from '../plane/CoordinatePlane'
import Tex from '../Tex'

interface ViewState {
  cells: ValueTableState
  /** Column of the last check, or null. */
  last: number | null
  /** Counts the checks, so the focus effect runs after each one. */
  seq: number
  /** Where the focus goes after the check: a column, the reset button, or nowhere. */
  focus: number | 'reset' | null
}

function initialView(model: ValueTableModel): ViewState {
  return { cells: initialValueTable(model), last: null, seq: 0, focus: null }
}

/** Checks a cell; Enter also moves the focus on to the next open cell (or "Von vorn" at the end). */
function submit(model: ValueTableModel, view: ViewState, index: number, viaEnter: boolean): ViewState {
  const cells = submitCell(model, view.cells, index)
  if (cells === view.cells) return view
  const correct = cells[index]?.result?.kind === 'correct'
  const focus = !viaEnter || !correct ? null : isTableComplete(model, cells) ? 'reset' : nextOpenCell(model, cells, index)
  return { cells, last: index, seq: view.seq + 1, focus }
}

/**
 * Table of values: the learner enters f(x) for each x; Enter or leaving the
 * field checks the value, and each correct value puts its point into the
 * plane. With the equation given, the line appears once every value is
 * right; with the graph given, the equation appears then. Every check is
 * announced. Nothing is animated.
 */
export default function ValueTableView({ widget }: { widget: ValueTableWidget }) {
  const model = useMemo(() => buildValueTable(widget), [widget])
  const [view, setView] = useState<ViewState>(() => initialView(model))
  const tableRef = useRef<HTMLDivElement>(null)
  const resetRef = useRef<HTMLButtonElement>(null)

  const { cells, last } = view
  const complete = isTableComplete(model, cells)
  const showLine = model.show === 'graph' || complete
  const showEquation = model.show === 'equation' || complete

  useEffect(() => {
    if (view.focus === null) return
    if (view.focus === 'reset') resetRef.current?.focus()
    else tableRef.current?.querySelector<HTMLInputElement>(`[data-cell="${view.focus}"]`)?.focus()
  }, [view.seq, view.focus])

  const lastCell = last === null ? undefined : cells[last]
  const feedback = last !== null && lastCell ? cellFeedback(model, last, lastCell) : ''
  const lastResult = lastCell?.result
  const announcement = complete && lastResult?.kind === 'correct' ? `${feedback} ${completeText(model)}` : feedback

  const lines: PlaneLineItem[] = showLine ? [{ id: 'f', line: model.line, label: model.name }] : []
  const points = tablePoints(model, cells).map(
    (p): PlanePointItem => ({ id: `p${p.label}`, label: p.label, x: p.x, y: p.y, tone: 'pink' }),
  )

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    setView((from) => submit(model, from, index, true))
  }

  return (
    <div className="widget line-widget">
      <CoordinatePlane
        window={model.window}
        label={widget.label ?? (model.show === 'graph' ? 'Graph zur Wertetabelle' : 'Punkte aus der Wertetabelle')}
        lines={lines}
        points={points}
      />
      {showEquation && (
        <p className="line-equation">
          <Tex latex={lineLatex(model.line, model.name)} />
        </p>
      )}
      <div className="value-table-wrap" ref={tableRef}>
        <table className="value-table value-table-input">
          <caption>Wertetabelle</caption>
          <tbody>
            <tr>
              <th scope="row">
                <Tex latex="x" />
              </th>
              {model.columns.map((column) => (
                <td key={column.x}>
                  {formatNumber(column.x)}
                  <span className="visually-hidden"> (Punkt {column.label})</span>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">
                <Tex latex={`${model.name}(x)`} />
              </th>
              {model.columns.map((column, i) => {
                const cell = cells[i]
                if (column.given) {
                  return (
                    <td key={column.x} className="is-given">
                      {formatNumber(column.y)}
                    </td>
                  )
                }
                if (isCellDone(model, cells, i)) {
                  return (
                    <td key={column.x} className="is-done">
                      {formatNumber(column.y)}
                      <span className="visually-hidden"> (richtig)</span>
                    </td>
                  )
                }
                const wrong = cell?.result !== null && cell?.result !== undefined
                return (
                  <td key={column.x} className={wrong ? 'is-wrong' : undefined}>
                    <input
                      className="value-input"
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      data-cell={i}
                      aria-label={cellLabel(model.name, column.x)}
                      aria-invalid={wrong || undefined}
                      value={cell?.input ?? ''}
                      onChange={(e) => {
                        const input = e.currentTarget.value
                        setView((from) => ({ ...from, cells: editCell(from.cells, i, input) }))
                      }}
                      onBlur={() => setView((from) => submit(model, from, i, false))}
                      onKeyDown={(e) => onKeyDown(e, i)}
                    />
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      {feedback !== '' && !complete && (
        <p className={lastResult?.kind === 'correct' ? 'value-table-feedback is-correct' : 'value-table-feedback is-wrong'}>
          {feedback}
        </p>
      )}
      {lastResult?.kind === 'invalid' && !complete && lastCell?.checked && (
        <InputEcho input={lastCell.checked} position={lastResult.error.position} length={lastResult.error.length} />
      )}
      <p className={complete ? 'line-status is-done' : 'line-status'}>{complete ? completeText(model) : tableHint(model)}</p>
      {complete && (
        <div className="practice-actions">
          <button ref={resetRef} type="button" className="btn btn-secondary" onClick={() => setView(initialView(model))}>
            Von vorn
          </button>
        </div>
      )}
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
