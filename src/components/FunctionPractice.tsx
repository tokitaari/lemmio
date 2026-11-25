import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import {
  functionToLatex,
  generateFunctionSeries,
  numberToLatex,
  numberToText,
  pointToLatex,
  type FunctionTask,
  type Rng,
} from '../math'
import { pointLabelText, sameGridPoint, type GridPoint, type PlaneLine } from '../plane'
import { drawnLine, NO_POINTS, startPoint, type Drawing } from '../practice/functionDrawing'
import {
  answerKind,
  createFunctionSession,
  currentFunctionTask,
  isFinalFeedback,
  nextFunctionTask,
  revealFunctionSolution,
  submitFunctionAnswer,
  type FunctionAnswer,
  type FunctionAnswerKind,
  type FunctionFeedback,
  type FunctionPracticeSubtopicId,
  type FunctionSession,
} from '../practice/functionSession'
import { finishedBetween, isSeriesOver, isTaskFinished } from '../practice/session'
import { useSubtopicProgress } from '../practice/useSubtopicProgress'
import Chip from './Chip'
import FunctionExamplePlane from './FunctionExamplePlane'
import FunctionSolutionSteps from './FunctionSolutionSteps'
import InputEcho from './InputEcho'
import { FUNCTION_KEYS, valueKeys, ZERO_KEYS } from './functionKeys'
import MathInput from './MathInput'
import CoordinatePlane, { type PlaneLineItem, type PlanePointItem } from './plane/CoordinatePlane'
import PracticeProgress from './PracticeProgress'
import SeriesSummary from './SeriesSummary'
import SkillPath from './SkillPath'
import Tex from './Tex'

interface FunctionPracticeProps {
  topic: FunctionPracticeSubtopicId
  /** Source of randomness for the series; tests pass a seeded one. */
  rng?: Rng
}

/** `−2` with a real minus sign. */
function shown(value: Parameters<typeof numberToText>[0]): string {
  return numberToText(value).replace('-', '−')
}

/**
 * Practice area of a subtopic about linear functions: a series of generated
 * tasks, one at a time. Depending on the task the learner types a function
 * equation, draws the graph with two points, does a Punktprobe (calculation
 * and decision) or gives the zero. Feedback, model solution and progress work
 * as in the practice of terms.
 */
export default function FunctionPractice({ topic, rng = Math.random }: FunctionPracticeProps) {
  const [session, setSession] = useState(() => createFunctionSession(generateFunctionSeries(topic, rng)))
  const [input, setInput] = useState('')
  const [onGraph, setOnGraph] = useState<boolean | null>(null)
  const [drawing, setDrawing] = useState<Drawing>(NO_POINTS)
  const { progress, saveFailed, record, reset } = useSubtopicProgress(topic)

  const ids = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const decisionRef = useRef<HTMLInputElement>(null)
  const placeRef = useRef<HTMLButtonElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const solutionRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLHeadingElement>(null)
  // Set by handlers; the effects below move the focus once the new state is rendered.
  const focusStart = useRef(false)
  const focusPoint = useRef<'P' | 'Q' | null>(null)

  const task = currentFunctionTask(session)
  const finished = isTaskFinished(session)
  const over = isSeriesOver(session)
  const kind = task ? answerKind(task) : null

  useEffect(() => {
    const start = focusStart.current
    focusStart.current = false
    const feedback = session.feedback
    if (!start && (feedback === null || isFinalFeedback(feedback))) return
    const current = session.tasks[session.index]
    const expected = current ? answerKind(current) : null
    if (expected === 'graph') {
      const first = planeRef.current?.querySelector<SVGGElement>('[role="slider"]')
      if (!start && feedback?.kind !== 'missing-points' && first) first.focus()
      else placeRef.current?.focus()
    } else if (feedback?.kind === 'missing-decision') {
      decisionRef.current?.focus()
    } else {
      inputRef.current?.focus()
    }
  }, [session])

  // After "Punkt setzen" the new point gets the focus, so the arrow keys move it right away.
  useEffect(() => {
    const label = focusPoint.current
    focusPoint.current = null
    if (!label) return
    planeRef.current?.querySelector<SVGGElement>(`[role="slider"][aria-label="Punkt ${label}"]`)?.focus()
  }, [drawing])

  // Screen readers and small screens land on the model solution right after the check.
  useEffect(() => {
    if (finished) solutionRef.current?.focus()
  }, [finished])

  useEffect(() => {
    if (over) summaryRef.current?.focus()
  }, [over])

  const clearEntry = () => {
    setInput('')
    setOnGraph(null)
    setDrawing(NO_POINTS)
  }

  const apply = (next: FunctionSession) => {
    const done = finishedBetween(session, next)
    setSession(next)
    if (done) record(done.correct, done.series)
  }

  const submit = (answer: FunctionAnswer) => apply(submitFunctionAnswer(session, answer))

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (kind === 'equation') submit({ kind: 'equation', input })
    else if (kind === 'point-test') submit({ kind: 'point-test', input, onGraph })
    else if (kind === 'zero') submit({ kind: 'zero', answer: { kind: 'input', input } })
    else if (kind === 'graph') submit({ kind: 'graph', ...drawing })
  }

  const startSeries = () => {
    focusStart.current = true
    setSession(createFunctionSession(generateFunctionSeries(topic, rng)))
    clearEntry()
  }

  const onNext = () => {
    focusStart.current = true
    setSession(nextFunctionTask(session))
    clearEntry()
  }

  const onReset = () => {
    reset()
    startSeries()
  }

  /** Sets the first missing point (P, then Q); taps on the point that is already set are ignored. */
  const setMissing = (at: GridPoint, focus: boolean) => {
    if (!drawing.p) {
      if (drawing.q && sameGridPoint(at, drawing.q)) return
      if (focus) focusPoint.current = 'P'
      setDrawing({ ...drawing, p: at })
    } else if (!drawing.q) {
      if (sameGridPoint(at, drawing.p)) return
      if (focus) focusPoint.current = 'Q'
      setDrawing({ ...drawing, q: at })
    }
  }

  return (
    <section aria-labelledby="uebung" className="panel practice">
      <h2 id="uebung">Übung</h2>

      <PracticeProgress progress={progress} saveFailed={saveFailed} onReset={onReset} />

      {over || !task || !kind ? (
        <SeriesSummary series={session} summaryRef={summaryRef} onRestart={startSeries} />
      ) : (
        <div className="practice-task">
          <SkillPath
            total={session.tasks.length}
            outcomes={session.outcomes}
            current={session.index}
            label="Fortschritt in dieser Serie"
          />
          <p className="practice-counter">
            Aufgabe {session.index + 1} von {session.tasks.length}
          </p>
          <p className="example-instruction">{task.instruction}</p>
          <TaskData task={task} />

          {!finished && (
            <form onSubmit={onSubmit} noValidate className="function-entry">
              {kind === 'graph' ? (
                <GraphEntry
                  drawing={drawing}
                  onChange={setDrawing}
                  onPlace={(at) => setMissing(at, false)}
                  onSetPoint={() => setMissing(drawing.p ? startPoint('Q', drawing.p) : startPoint('P', drawing.q), true)}
                  onClear={() => setDrawing(NO_POINTS)}
                  placeRef={placeRef}
                  planeRef={planeRef}
                />
              ) : (
                <TextEntry
                  id={`${ids}-input`}
                  task={task}
                  kind={kind}
                  value={input}
                  onChange={setInput}
                  inputRef={inputRef}
                />
              )}
              {kind === 'point-test' && (
                <fieldset className="choice function-decision">
                  <legend className="practice-label">Liegt P auf dem Graphen von f?</legend>
                  <div className="choice-options">
                    <label className="choice-option">
                      <input
                        ref={decisionRef}
                        type="radio"
                        name={`${ids}-decision`}
                        checked={onGraph === true}
                        onChange={() => setOnGraph(true)}
                      />
                      <span className="choice-text">Ja, P liegt auf dem Graphen.</span>
                    </label>
                    <label className="choice-option">
                      <input
                        type="radio"
                        name={`${ids}-decision`}
                        checked={onGraph === false}
                        onChange={() => setOnGraph(false)}
                      />
                      <span className="choice-text">Nein, P liegt nicht auf dem Graphen.</span>
                    </label>
                  </div>
                </fieldset>
              )}
              <div className="practice-actions">
                <button type="submit" className="btn btn-primary">
                  Prüfen
                </button>
                {kind === 'zero' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => submit({ kind: 'zero', answer: { kind: 'none' } })}
                  >
                    keine Nullstelle
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => apply(revealFunctionSolution(session))}>
                  Lösung anzeigen
                </button>
              </div>
            </form>
          )}

          <div role="status" className="practice-feedback-region">
            {session.feedback && <FeedbackMessage feedback={session.feedback} kind={kind} />}
          </div>

          {finished && (
            <section aria-labelledby={`${ids}-musterloesung`} className="practice-solution">
              <h3 id={`${ids}-musterloesung`} ref={solutionRef} tabIndex={-1}>
                Musterlösung
              </h3>
              <FunctionExamplePlane task={task} label="Graph zur Musterlösung" drawn={wrongLine(session.feedback)} />
              <FunctionSolutionSteps task={task} />
              <button type="button" className="btn btn-primary" onClick={onNext}>
                {session.index + 1 < session.tasks.length ? 'Nächste Aufgabe' : 'Ergebnis ansehen'}
              </button>
            </section>
          )}
        </div>
      )}
    </section>
  )
}

/** The learner's wrong line, shown dashed in the model solution. */
function wrongLine(feedback: FunctionFeedback | null): PlaneLine | undefined {
  if (feedback?.kind !== 'wrong-line') return undefined
  return drawnLine(feedback) ?? undefined
}

/** The given data of a task: the graph to read from, or the equation, slope and points typeset. */
function TaskData({ task }: { task: FunctionTask }) {
  switch (task.kind) {
    case 'read-equation': {
      const { fn } = task
      const at = (x: number) => ({ x, y: fn.m.toNumber() * x + fn.n.toNumber() })
      const line: PlaneLineItem = {
        id: 'f',
        label: 'f',
        line: { kind: 'function', m: fn.m, n: fn.n },
        // Not the equation: that is what the learner has to find. Two grid points give the same information.
        description: `Gerade f durch die Gitterpunkte ${pointLabelText('', at(0))} und ${pointLabelText('', at(1))}`,
      }
      return (
        <div className="example-plane">
          <CoordinatePlane label="Graph von f" lines={[line]} />
        </div>
      )
    }
    case 'draw-graph':
    case 'zero':
      return <Tex latex={functionToLatex(task.fn)} display />
    case 'from-point-slope':
      return <Tex latex={`m = ${numberToLatex(task.fn.m)},\\quad ${pointToLatex(task.point, 'P')}`} display />
    case 'from-two-points':
      return <Tex latex={`${pointToLatex(task.points[0], 'P')},\\quad ${pointToLatex(task.points[1], 'Q')}`} display />
    case 'point-test':
      return <Tex latex={`${functionToLatex(task.fn)},\\quad ${pointToLatex(task.point, 'P')}`} display />
    case 'intersection':
      return null
  }
}

interface TextEntryProps {
  id: string
  task: FunctionTask
  kind: Exclude<FunctionAnswerKind, 'graph'>
  value: string
  onChange: (value: string) => void
  inputRef: RefObject<HTMLInputElement | null>
}

const LABELS: Record<TextEntryProps['kind'], string> = {
  equation: 'Deine Funktionsgleichung',
  'point-test': 'Deine Rechnung',
  zero: 'Deine Nullstelle',
}

/** The text field of a task with the keys that fit its answer. */
function TextEntry({ id, task, kind, value, onChange, inputRef }: TextEntryProps) {
  const x = task.kind === 'point-test' ? shown(task.point.x) : ''
  const keys = kind === 'equation' ? FUNCTION_KEYS : kind === 'point-test' ? valueKeys(x) : ZERO_KEYS
  const hint =
    kind === 'equation'
      ? 'Tipp: Schreibe f(x) = mx + n mit ausgerechneten Zahlen, z. B. f(x) = −2x + 3. Auch y = … geht.'
      : kind === 'point-test'
        ? `Setze x = ${x} in f ein und rechne aus, z. B. f(2) = 3·2 − 1 = 5. Entscheide dann, ob P auf dem Graphen liegt.`
        : 'Gib die Nullstelle als Punkt N(−2|0) oder als x = −2 an. Hat f keine Nullstelle, nimm die Taste „keine Nullstelle“.'
  return (
    <>
      <label htmlFor={id} className="practice-label">
        {LABELS[kind]}
      </label>
      <MathInput id={id} value={value} onChange={onChange} keys={keys} inputRef={inputRef} describedBy={`${id}-hint`} />
      <p id={`${id}-hint`} className="practice-hint">
        {hint}
      </p>
    </>
  )
}

interface GraphEntryProps {
  drawing: Drawing
  onChange: (drawing: Drawing) => void
  onPlace: (at: GridPoint) => void
  onSetPoint: () => void
  onClear: () => void
  placeRef: RefObject<HTMLButtonElement | null>
  planeRef: RefObject<HTMLDivElement | null>
}

/**
 * Drawing a graph: tapping the grid sets P, then Q; both can be dragged or
 * moved with the arrow keys. "Punkt setzen" sets the next point for keyboard
 * users. The line through the points is shown, its equation is not.
 */
function GraphEntry({ drawing, onChange, onPlace, onSetPoint, onClear, placeRef, planeRef }: GraphEntryProps) {
  const points: PlanePointItem[] = []
  if (drawing.p) points.push({ id: 'P', label: 'P', ...drawing.p, drag: { kind: 'free' } })
  if (drawing.q) points.push({ id: 'Q', label: 'Q', ...drawing.q, drag: { kind: 'free' } })
  const line = drawnLine(drawing)
  const lines: PlaneLineItem[] = line ? [{ id: 'drawn', line, description: 'Gerade durch P und Q' }] : []
  const complete = drawing.p !== null && drawing.q !== null
  return (
    <>
      <div ref={planeRef} className="example-plane">
        <CoordinatePlane
          label="Zeichne den Graphen"
          lines={lines}
          points={points}
          onPointChange={(id, p) => onChange(id === 'P' ? { ...drawing, p } : { ...drawing, q: p })}
          onPlace={onPlace}
        />
      </div>
      <p className="practice-hint">
        {complete
          ? 'Beide Punkte sind gesetzt. Ziehe P oder Q, um die Gerade zu ändern.'
          : 'Tippe ins Koordinatensystem, um P und dann Q zu setzen, und ziehe die Punkte an die richtige Stelle. ' +
            'Mit der Tastatur: „Punkt setzen“, dann die Pfeiltasten.'}
      </p>
      <div className="practice-actions">
        <button ref={placeRef} type="button" className="btn btn-secondary" disabled={complete} onClick={onSetPoint}>
          Punkt setzen
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!drawing.p && !drawing.q}
          onClick={onClear}
        >
          Punkte entfernen
        </button>
      </div>
    </>
  )
}

function okChip(ok: boolean, text: string) {
  return <Chip ok={ok}>{ok ? `${text} ok` : `${text} nicht ok`}</Chip>
}

function FeedbackMessage({ feedback, kind }: { feedback: FunctionFeedback; kind: FunctionAnswerKind }) {
  switch (feedback.kind) {
    case 'correct':
      return (
        <div className="feedback feedback-correct">
          <p>✓ Richtig!</p>
          <div className="chips">
            {kind === 'equation' && (
              <>
                <Chip ok>m ok</Chip>
                <Chip ok>n ok</Chip>
                <Chip ok>Form ok</Chip>
              </>
            )}
            {kind === 'graph' && (
              <>
                <Chip ok>Steigung ok</Chip>
                <Chip ok>y-Achsenabschnitt ok</Chip>
              </>
            )}
            {kind === 'point-test' && (
              <>
                <Chip ok>Rechnung ok</Chip>
                <Chip ok>Entscheidung ok</Chip>
              </>
            )}
            {kind === 'zero' && <Chip ok>Nullstelle ok</Chip>}
          </div>
        </div>
      )
    case 'revealed':
      return <p className="feedback feedback-wrong">Hier ist die Musterlösung. Die Aufgabe zählt als nicht gelöst.</p>
    case 'wrong-function':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch. Das ist nicht die gesuchte Funktion.</p>
          <div className="chips">
            {okChip(feedback.slope, 'm')}
            {okChip(feedback.intercept, 'n')}
          </div>
          <p className="feedback-answer">
            Deine Antwort: <Tex latex={feedback.answer} />
          </p>
        </div>
      )
    case 'wrong-line':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch. Deine Gerade ist nicht der Graph von f.</p>
          <div className="chips">
            {okChip(feedback.slope, 'Steigung')}
            {okChip(feedback.intercept, 'y-Achsenabschnitt')}
          </div>
          <p className="feedback-answer">
            Deine Punkte: {pointLabelText('P', feedback.p)} und {pointLabelText('Q', feedback.q)}
          </p>
        </div>
      )
    case 'wrong-point-test':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch.</p>
          <div className="chips">
            {okChip(feedback.calculation, 'Rechnung')}
            {okChip(feedback.decision, 'Entscheidung')}
          </div>
          {!feedback.argument && <p>Setze genau die x-Koordinate von P in f ein.</p>}
          {feedback.calculation && !feedback.decision && (
            <p>Vergleiche den Funktionswert mit der y-Koordinate von P.</p>
          )}
        </div>
      )
    case 'wrong-zero':
      return (
        <div className="feedback feedback-wrong">
          <p>
            ✗ Leider falsch.{' '}
            {feedback.notOnAxis
              ? 'Eine Nullstelle liegt auf der x-Achse: y muss 0 sein.'
              : feedback.saidNone
                ? 'f hat eine Nullstelle: Der Graph schneidet die x-Achse.'
                : feedback.expectedNone
                  ? 'f hat keine Nullstelle: Der Graph verläuft parallel zur x-Achse.'
                  : 'Für diese Stelle ist f(x) nicht 0.'}
          </p>
          <div className="chips">
            <Chip ok={false}>Nullstelle nicht ok</Chip>
          </div>
        </div>
      )
    case 'wrong-form':
      return (
        <div className="feedback feedback-form">
          <p>Fast: Das stimmt, ist aber noch nicht in der gewünschten Form.</p>
          <div className="chips">
            <Chip ok={false}>Form nicht ok</Chip>
          </div>
          <p>{feedback.hint.message}</p>
        </div>
      )
    case 'invalid':
      return (
        <div className="feedback feedback-invalid">
          <p>Das kann ich nicht lesen. {feedback.error.message}</p>
          {feedback.input.trim() !== '' && (
            <InputEcho input={feedback.input} position={feedback.error.position} length={feedback.error.length} />
          )}
        </div>
      )
    case 'missing-points':
      return <p className="feedback feedback-form">Setze zuerst zwei Punkte P und Q.</p>
    case 'not-a-line':
      return (
        <p className="feedback feedback-form">
          {feedback.reason === 'vertical'
            ? 'P und Q liegen senkrecht übereinander. Diese Gerade ist kein Graph einer Funktion. Verschiebe einen Punkt nach links oder rechts.'
            : 'P und Q liegen auf demselben Gitterpunkt. Verschiebe einen der beiden Punkte.'}
        </p>
      )
    case 'missing-decision':
      return <p className="feedback feedback-form">Entscheide noch, ob P auf dem Graphen von f liegt.</p>
  }
}

