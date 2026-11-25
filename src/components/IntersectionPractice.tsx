import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react'
import {
  functionEquationToLatex,
  functionToLatex,
  numberToText,
  type FunctionTask,
  type LinearFunction,
  type Rng,
} from '../math'
import { pointLabelText } from '../plane'
import { fieldToFocus } from './equationFocus'
import {
  answerOptions,
  createIntersectionSession,
  currentIntersectionMode,
  currentIntersectionTask,
  generateIntersectionSeries,
  intersectionPhase,
  nextIntersectionTask,
  revealIntersectionSolution,
  submitIntersectionKey,
  submitIntersectionLine,
  submitIntersectionPoint,
  submitIntersectionValue,
  type IntersectionFeedback,
  type IntersectionMode,
  type IntersectionPhase,
  type IntersectionSession,
  type IntersectionTask,
} from '../practice/intersectionSession'
import type { IntersectionSubtopicId } from '../practice/functionSession'
import { finishedBetween, isSeriesOver, isTaskFinished } from '../practice/session'
import { useSubtopicProgress } from '../practice/useSubtopicProgress'
import Chip from './Chip'
import EquationEntry, { type EquationField, type EquationFields } from './EquationEntry'
import EquationFeedbackMessage from './EquationFeedbackMessage'
import EquationWork from './EquationWork'
import FunctionExamplePlane from './FunctionExamplePlane'
import FunctionSolutionSteps from './FunctionSolutionSteps'
import { POINT_KEYS, valueKeys } from './functionKeys'
import MathInput from './MathInput'
import CoordinatePlane, { type PlaneLineItem } from './plane/CoordinatePlane'
import PracticeProgress from './PracticeProgress'
import SeriesSummary from './SeriesSummary'
import SkillPath from './SkillPath'
import Tex from './Tex'
import Unreadable from './Unreadable'

interface IntersectionPracticeProps {
  topic: IntersectionSubtopicId
  /** Source of randomness for the series; tests pass a seeded one. */
  rng?: Rng
}

const EMPTY_FIELDS: EquationFields = { operation: '', equation: '', set: '' }

/** `−2` with a real minus sign. */
function shown(value: Parameters<typeof numberToText>[0]): string {
  return numberToText(value).replace('-', '−')
}

/**
 * Practice area of the intersection of two lines. Tasks alternate between
 * reading the intersection from the graphs and calculating it: f(x) = g(x) is
 * solved line by line (as in the practice of equations), then y is worked
 * out and S(x|y) is given. Parallel and identical lines are answered with
 * their own keys.
 */
export default function IntersectionPractice({ topic, rng = Math.random }: IntersectionPracticeProps) {
  const [session, setSession] = useState(() => createIntersectionSession(generateIntersectionSeries(rng)))
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [text, setText] = useState('')
  const { progress, saveFailed, record, reset } = useSubtopicProgress(topic)

  const ids = useId()
  const operationRef = useRef<HTMLInputElement>(null)
  const equationRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const solutionRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLHeadingElement>(null)
  // Set by handlers that start a new task; the effect below moves the focus once it is rendered.
  const focusStart = useRef(false)

  const task = currentIntersectionTask(session)
  const mode = currentIntersectionMode(session)
  const phase = intersectionPhase(session)
  const finished = isTaskFinished(session)
  const over = isSeriesOver(session)

  useEffect(() => {
    const start = focusStart.current
    focusStart.current = false
    const feedback = session.feedback
    if (isTaskFinished(session) || (!start && feedback === null)) return
    const current = intersectionPhase(session)
    const field = feedback?.kind === 'equation' ? fieldToFocus(feedback.feedback) : null
    if (current !== 'lines') inputRef.current?.focus()
    else if (start || field === 'operation') operationRef.current?.focus()
    else if (field === 'equation') equationRef.current?.focus()
  }, [session])

  // Screen readers and small screens land on the model solution right after the task is finished.
  useEffect(() => {
    if (finished) solutionRef.current?.focus()
  }, [finished])

  useEffect(() => {
    if (over) summaryRef.current?.focus()
  }, [over])

  const apply = (next: IntersectionSession) => {
    const done = finishedBetween(session, next)
    setSession(next)
    if (done) record(done.correct, done.series)
  }

  const clearEntry = () => {
    setFields(EMPTY_FIELDS)
    setText('')
  }

  const onSubmitLine = () => {
    const next = submitIntersectionLine(session, fields.operation, fields.equation)
    // An accepted line makes room for the next one; everything else stays in the fields for a correction.
    if (next.equation.lines.length > session.equation.lines.length) setFields(EMPTY_FIELDS)
    apply(next)
  }

  const onSubmitText = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'value') {
      const next = submitIntersectionValue(session, text)
      // The value is accepted: the point is typed in a fresh field.
      if (next.valueDone && !session.valueDone) setText('')
      apply(next)
    } else {
      apply(submitIntersectionPoint(session, text))
    }
  }

  const startSeries = () => {
    focusStart.current = true
    setSession(createIntersectionSession(generateIntersectionSeries(rng)))
    clearEntry()
  }

  const onNext = () => {
    focusStart.current = true
    setSession(nextIntersectionTask(session))
    clearEntry()
  }

  const onReset = () => {
    reset()
    startSeries()
  }

  const options = answerOptions(session)

  return (
    <section aria-labelledby="uebung" className="panel practice">
      <h2 id="uebung">Übung</h2>

      <PracticeProgress progress={progress} saveFailed={saveFailed} onReset={onReset} />

      {over || !task || !mode ? (
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
          <TaskData task={task} mode={mode} />

          {mode === 'calculate' && (
            <EquationWork task={task.equation} lines={session.equation.lines} />
          )}

          <div role="status" className="practice-feedback-region">
            {session.feedback && <FeedbackMessage feedback={session.feedback} task={task} />}
          </div>

          {!finished && phase === 'lines' && (
            <>
              <p className="practice-hint">
                Die Gleichung f(x) = g(x) steht schon da. Löse sie Zeile für Zeile, bis x allein steht oder auf beiden
                Seiten nur Zahlen stehen.
              </p>
              <EquationEntry
                variable={task.equation.variable}
                values={fields}
                onChange={(field: EquationField, value: string) => setFields((f) => ({ ...f, [field]: value }))}
                onSubmitLine={onSubmitLine}
                onReveal={() => apply(revealIntersectionSolution(session))}
                operationRef={operationRef}
                equationRef={equationRef}
              />
            </>
          )}

          {!finished && phase !== 'lines' && (
            <AnswerEntry
              id={`${ids}-answer`}
              task={task}
              mode={mode}
              phase={phase}
              point={options.point}
              keys={options.keys}
              value={text}
              onChange={setText}
              onSubmit={onSubmitText}
              onKey={(said) => apply(submitIntersectionKey(session, said))}
              onReveal={() => apply(revealIntersectionSolution(session))}
              inputRef={inputRef}
            />
          )}

          {finished && (
            <section aria-labelledby={`${ids}-musterloesung`} className="practice-solution">
              <h3 id={`${ids}-musterloesung`} ref={solutionRef} tabIndex={-1}>
                Musterlösung
              </h3>
              <FunctionExamplePlane task={task} label="Graph zur Musterlösung" />
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

/** Two grid points of the line inside the window, e.g. for the description of a graph that is read. */
function gridPointsOf(fn: LinearFunction) {
  const points = []
  for (let x = -8; x <= 8 && points.length < 2; x++) {
    const y = fn.m.toNumber() * x + fn.n.toNumber()
    if (Math.abs(y) <= 8) points.push({ x, y })
  }
  return points
}

function graphLine(fn: LinearFunction, tone: 'accent' | 'pink'): PlaneLineItem {
  const [first, second] = gridPointsOf(fn)
  return {
    id: fn.name,
    label: fn.name,
    line: { kind: 'function', m: fn.m, n: fn.n },
    tone,
    // Not the equation: reading the intersection is the task. Two grid points give the same information.
    description:
      first && second
        ? `Gerade ${fn.name} durch die Gitterpunkte ${pointLabelText('', first)} und ${pointLabelText('', second)}`
        : `Gerade ${fn.name}`,
  }
}

/** What is given: the graphs of f and g (reading) or both equations typeset (calculating). */
function TaskData({ task, mode }: { task: IntersectionTask; mode: IntersectionMode }) {
  if (mode === 'read') {
    return (
      <>
        <p className="example-instruction">
          Lies den Schnittpunkt der Graphen von f und g ab. Schneiden sich die Geraden nicht in einem Punkt, nimm die
          passende Taste.
        </p>
        <div className="example-plane">
          <CoordinatePlane label="Graphen von f und g" lines={[graphLine(task.fn, 'accent'), graphLine(task.other, 'pink')]} />
        </div>
      </>
    )
  }
  return (
    <>
      <p className="example-instruction">Berechne den Schnittpunkt der Graphen von f und g.</p>
      <Tex latex={`${functionToLatex(task.fn)},\\quad ${functionEquationToLatex(task.other.name, task.otherExpr)}`} display />
    </>
  )
}

interface AnswerEntryProps {
  id: string
  task: IntersectionTask
  mode: IntersectionMode
  phase: Exclude<IntersectionPhase, 'lines'>
  /** The field for S(x|y) is offered. */
  point: boolean
  /** The keys "kein Schnittpunkt" and "unendlich viele" are offered. */
  keys: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onKey: (said: 'parallel' | 'identical') => void
  onReveal: () => void
  inputRef: RefObject<HTMLInputElement | null>
}

/** The value of y (calculating) or the intersection: a field with keys, and the keys for the special cases. */
function AnswerEntry({
  id,
  task,
  mode,
  phase,
  point,
  keys,
  value,
  onChange,
  onSubmit,
  onKey,
  onReveal,
  inputRef,
}: AnswerEntryProps) {
  const x = task.intersection.kind === 'point' ? shown(task.intersection.point.x) : ''
  const calculatingValue = phase === 'value'
  const hint = calculatingValue
    ? `Setze x = ${x} in f oder g ein und rechne aus, z. B. f(2) = 3·2 − 1 = 5.`
    : mode === 'read'
      ? 'Lies die Koordinaten von S am Gitter ab und schreibe S(x|y), z. B. S(2|5). Schneiden sich die Geraden nicht, nimm „kein Schnittpunkt“, fallen sie zusammen, „unendlich viele“.'
      : point
        ? 'Schreibe den Schnittpunkt als S(x|y), z. B. S(2|5).'
        : 'Auf beiden Seiten stehen nur noch Zahlen. Entscheide, was das für die Geraden bedeutet.'
  return (
    <form onSubmit={onSubmit} noValidate className="function-entry">
      {(calculatingValue || point) && (
        <>
          <label htmlFor={id} className="practice-label">
            {calculatingValue ? 'Deine Rechnung für y' : 'Dein Schnittpunkt'}
          </label>
          <MathInput
            id={id}
            value={value}
            onChange={onChange}
            keys={calculatingValue ? valueKeys(x) : POINT_KEYS}
            inputRef={inputRef}
            describedBy={`${id}-hint`}
          />
        </>
      )}
      <p id={`${id}-hint`} className="practice-hint">
        {hint}
      </p>
      <div className="practice-actions">
        {(calculatingValue || point) && (
          <button type="submit" className="btn btn-primary">
            Prüfen
          </button>
        )}
        {keys && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onKey('parallel')}>
              kein Schnittpunkt
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onKey('identical')}>
              unendlich viele
            </button>
          </>
        )}
        <button type="button" className="btn btn-secondary" onClick={onReveal}>
          Lösung anzeigen
        </button>
      </div>
    </form>
  )
}

function okChip(ok: boolean, text: string) {
  return <Chip ok={ok}>{ok ? `${text} ok` : `${text} nicht ok`}</Chip>
}

/** What the lines really do, for a wrong answer. */
function resultNote(task: FunctionTask): string {
  if (task.kind !== 'intersection') return ''
  switch (task.intersection.kind) {
    case 'point':
      return 'Die Geraden schneiden sich in genau einem Punkt.'
    case 'parallel':
      return 'Die Geraden sind parallel: Sie haben keinen Schnittpunkt.'
    case 'identical':
      return 'Die Geraden sind identisch: Jeder Punkt der Geraden ist ein Schnittpunkt.'
  }
}

function FormMessage({ hint }: { hint: string }) {
  return (
    <div className="feedback feedback-form">
      <p>Fast: Das stimmt, ist aber noch nicht in der gewünschten Form.</p>
      <div className="chips">
        <Chip ok={false}>Form nicht ok</Chip>
      </div>
      <p>{hint}</p>
    </div>
  )
}

function FeedbackMessage({ feedback, task }: { feedback: IntersectionFeedback; task: IntersectionTask }) {
  switch (feedback.kind) {
    case 'equation':
      return <EquationFeedbackMessage feedback={feedback.feedback} variable={task.equation.variable} />
    case 'value-correct':
      return <p className="feedback feedback-correct">✓ y stimmt. Gib jetzt den Schnittpunkt an.</p>
    case 'value-form':
    case 'point-form':
      return <FormMessage hint={feedback.hint.message} />
    case 'value-invalid':
      return <Unreadable what="Die Rechnung" error={feedback.error} input={feedback.input} />
    case 'point-invalid':
      return <Unreadable what="Der Schnittpunkt" error={feedback.error} input={feedback.input} />
    case 'correct':
      return (
        <div className="feedback feedback-correct">
          <p>✓ Richtig!</p>
          <div className="chips">
            <Chip ok>{task.intersection.kind === 'point' ? 'Schnittpunkt ok' : 'Ergebnis ok'}</Chip>
          </div>
        </div>
      )
    case 'revealed':
      return <p className="feedback feedback-wrong">Hier ist die Musterlösung. Die Aufgabe zählt als nicht gelöst.</p>
    case 'wrong-value':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch.</p>
          <div className="chips">
            <Chip ok={false}>Rechnung nicht ok</Chip>
          </div>
          {!feedback.argument && task.intersection.kind === 'point' && (
            <p>Setze genau x = {shown(task.intersection.point.x)} in die Funktion ein.</p>
          )}
        </div>
      )
    case 'wrong-point':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch.</p>
          <div className="chips">
            {task.intersection.kind === 'point' ? (
              <>
                {okChip(feedback.x, 'x')}
                {okChip(feedback.y, 'y')}
              </>
            ) : (
              <Chip ok={false}>Schnittpunkt nicht ok</Chip>
            )}
          </div>
          {task.intersection.kind !== 'point' && <p>{resultNote(task)}</p>}
        </div>
      )
    case 'wrong-key':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch. {resultNote(task)}</p>
          <div className="chips">
            <Chip ok={false}>Ergebnis nicht ok</Chip>
          </div>
        </div>
      )
  }
}
