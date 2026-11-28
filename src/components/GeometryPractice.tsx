import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react'
import {
  DECIMAL,
  equationToLatex,
  withUnit,
  type GeometrySubtopicId,
  type Rng,
  type TaskFigure,
  type Unit,
} from '../math'
import {
  createGeometrySession,
  currentGeometryTask,
  generateCalculationSeries,
  geometryPhase,
  nextGeometryTask,
  revealGeometrySolution,
  submitCalculation,
  submitGeometryLine,
  submitGeometryUnit,
  submitSubstitution,
  type CalculationTask,
  type GeometryFeedback,
  type GeometryPhase,
  type GeometrySession,
} from '../practice/geometrySession'
import { finishedBetween, isSeriesOver, isTaskFinished } from '../practice/session'
import { useSubtopicProgress } from '../practice/useSubtopicProgress'
import Chip from './Chip'
import EquationEntry, { type EquationField, type EquationFields } from './EquationEntry'
import EquationFeedbackMessage from './EquationFeedbackMessage'
import { fieldToFocus } from './equationFocus'
import EquationWork from './EquationWork'
import GeometrySolutionSteps from './GeometrySolutionSteps'
import { calculationKeys, substitutionKeys } from './geometryKeys'
import InputEcho from './InputEcho'
import MathInput from './MathInput'
import PracticeProgress from './PracticeProgress'
import SeriesSummary from './SeriesSummary'
import ShapeFigure from './shapes/ShapeFigure'
import SkillPath from './SkillPath'
import Tex from './Tex'
import Unreadable from './Unreadable'

interface GeometryPracticeProps {
  topic: GeometrySubtopicId
  /** Source of randomness for the series; tests pass a seeded one. */
  rng?: Rng
}

const EMPTY_FIELDS: EquationFields = { operation: '', equation: '', set: '' }

const UNITS: readonly Unit[] = ['cm', 'cm²']

/**
 * Practice area of a geometry subtopic (without drawing tasks). Area and
 * perimeter are written as one chain (`A = g · h : 2 = 6 · 4 : 2 = 12`) with
 * the unit chosen below. A Rückwärts task is filled in first
 * (`12 = 6 · h : 2`), then solved line by line as in the practice of
 * equations until the length stands alone, then the unit is chosen.
 */
export default function GeometryPractice({ topic, rng = Math.random }: GeometryPracticeProps) {
  const [session, setSession] = useState(() => createGeometrySession(generateCalculationSeries(topic, rng)))
  const [text, setText] = useState('')
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const [unit, setUnit] = useState<Unit | null>(null)
  const { progress, saveFailed, record, reset } = useSubtopicProgress(topic)

  const ids = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const unitRef = useRef<HTMLInputElement>(null)
  const operationRef = useRef<HTMLInputElement>(null)
  const equationRef = useRef<HTMLInputElement>(null)
  const solutionRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLHeadingElement>(null)
  // Set by handlers that start a new task; the effect below moves the focus once it is rendered.
  const focusStart = useRef(false)

  const task = currentGeometryTask(session)
  const phase = geometryPhase(session)
  const finished = isTaskFinished(session)
  const over = isSeriesOver(session)

  useEffect(() => {
    const start = focusStart.current
    focusStart.current = false
    const feedback = session.feedback
    if (isTaskFinished(session) || (!start && feedback === null)) return
    const current = geometryPhase(session)
    if (feedback?.kind === 'missing-unit' || current === 'unit') unitRef.current?.focus()
    else if (current === 'lines') {
      const field = feedback?.kind === 'equation' ? fieldToFocus(feedback.feedback) : 'operation'
      if (field === 'equation') equationRef.current?.focus()
      else operationRef.current?.focus()
    } else inputRef.current?.focus()
  }, [session])

  // Screen readers and small screens land on the model solution right after the task is finished.
  useEffect(() => {
    if (finished) solutionRef.current?.focus()
  }, [finished])

  useEffect(() => {
    if (over) summaryRef.current?.focus()
  }, [over])

  const apply = (next: GeometrySession) => {
    const done = finishedBetween(session, next)
    setSession(next)
    if (done) record(done.correct, done.series)
  }

  const clearEntry = () => {
    setText('')
    setFields(EMPTY_FIELDS)
    setUnit(null)
  }

  const onSubmitText = (e: FormEvent) => {
    e.preventDefault()
    if (phase === 'calculation') apply(submitCalculation(session, text, unit))
    else apply(submitSubstitution(session, text))
  }

  const onSubmitLine = () => {
    const next = submitGeometryLine(session, fields.operation, fields.equation)
    // An accepted line makes room for the next one; everything else stays in the fields for a correction.
    if ((next.equation?.lines.length ?? 0) > (session.equation?.lines.length ?? 0)) setFields(EMPTY_FIELDS)
    apply(next)
  }

  const onSubmitUnit = (e: FormEvent) => {
    e.preventDefault()
    apply(submitGeometryUnit(session, unit))
  }

  const onReveal = () => apply(revealGeometrySolution(session))

  const startSeries = () => {
    focusStart.current = true
    setSession(createGeometrySession(generateCalculationSeries(topic, rng)))
    clearEntry()
  }

  const onNext = () => {
    focusStart.current = true
    setSession(nextGeometryTask(session))
    clearEntry()
  }

  const onReset = () => {
    reset()
    startSeries()
  }

  const work = session.equation?.tasks[0]

  return (
    <section aria-labelledby="uebung" className="panel practice">
      <h2 id="uebung">Übung</h2>

      <PracticeProgress progress={progress} saveFailed={saveFailed} onReset={onReset} />

      {over || !task ? (
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
          <div className="example-figure">
            <ShapeFigure figure={task.figure} label="Figur zur Aufgabe" />
          </div>

          {work && session.equation && <EquationWork task={work} lines={session.equation.lines} />}

          <div role="status" className="practice-feedback-region">
            {session.feedback && <FeedbackMessage feedback={session.feedback} task={task} />}
          </div>

          {!finished && (phase === 'calculation' || phase === 'substitution') && (
            <TextEntry
              id={`${ids}-text`}
              task={task}
              phase={phase}
              value={text}
              onChange={setText}
              unit={unit}
              onUnit={setUnit}
              onSubmit={onSubmitText}
              onReveal={onReveal}
              inputRef={inputRef}
              unitRef={unitRef}
            />
          )}

          {!finished && phase === 'lines' && task.kind === 'reverse' && (
            <>
              <p className="practice-hint">
                Löse die Gleichung Zeile für Zeile, bis {task.unknown} allein steht, z. B. {task.unknown} = 4.
              </p>
              <EquationEntry
                variable={task.unknown}
                values={fields}
                onChange={(field: EquationField, value: string) => setFields((f) => ({ ...f, [field]: value }))}
                onSubmitLine={onSubmitLine}
                onReveal={onReveal}
                operationRef={operationRef}
                equationRef={equationRef}
                decimalKey
              />
            </>
          )}

          {!finished && phase === 'unit' && task.kind === 'reverse' && (
            <form onSubmit={onSubmitUnit} noValidate className="geometry-entry">
              <UnitChoice
                name={`${ids}-unit`}
                legend={`Einheit von ${task.unknown}`}
                unit={unit}
                onUnit={setUnit}
                unitRef={unitRef}
              />
              <div className="practice-actions">
                <button type="submit" className="btn btn-primary">
                  Prüfen
                </button>
                <button type="button" className="btn btn-secondary" onClick={onReveal}>
                  Lösung anzeigen
                </button>
              </div>
            </form>
          )}

          {finished && (
            <section aria-labelledby={`${ids}-musterloesung`} className="practice-solution">
              <h3 id={`${ids}-musterloesung`} ref={solutionRef} tabIndex={-1}>
                Musterlösung
              </h3>
              <SolutionFigure task={task} />
              <GeometrySolutionSteps task={task} />
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

/** The figure with every length given, so a Rückwärts task shows the length found ("h = 4 cm" instead of "h = ?"). */
function solvedFigure(figure: TaskFigure): TaskFigure {
  return { ...figure, labels: figure.labels.map((label) => ({ ...label, given: true })) }
}

function SolutionFigure({ task }: { task: CalculationTask }) {
  const figure = useMemo(() => solvedFigure(task.figure), [task.figure])
  return (
    <div className="example-figure">
      <ShapeFigure figure={figure} label="Figur zur Musterlösung" />
    </div>
  )
}

interface UnitChoiceProps {
  name: string
  legend: string
  unit: Unit | null
  onUnit: (unit: Unit) => void
  unitRef: RefObject<HTMLInputElement | null>
}

/**
 * Radio group cm / cm²; units are chosen, never typed. The first view of a
 * task avoids the word "Einheit" (the route tests keep it out of the start
 * of every page, as it is the internal name of an iteration).
 */
function UnitChoice({ name, legend, unit, onUnit, unitRef }: UnitChoiceProps) {
  return (
    <fieldset className="choice geometry-unit">
      <legend className="practice-label">{legend}</legend>
      <div className="choice-options">
        {UNITS.map((u, i) => (
          <label key={u} className="choice-option">
            <input
              ref={i === 0 ? unitRef : undefined}
              type="radio"
              name={name}
              checked={unit === u}
              onChange={() => onUnit(u)}
            />
            <span className="choice-text">{u}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

interface TextEntryProps {
  id: string
  task: CalculationTask
  phase: Extract<GeometryPhase, 'calculation' | 'substitution'>
  value: string
  onChange: (value: string) => void
  unit: Unit | null
  onUnit: (unit: Unit) => void
  onSubmit: (e: FormEvent) => void
  onReveal: () => void
  inputRef: RefObject<HTMLInputElement | null>
  unitRef: RefObject<HTMLInputElement | null>
}

/** The calculation with its unit (area, perimeter) or the first line of a Rückwärts task. */
function TextEntry({
  id,
  task,
  phase,
  value,
  onChange,
  unit,
  onUnit,
  onSubmit,
  onReveal,
  inputRef,
  unitRef,
}: TextEntryProps) {
  const calculating = phase === 'calculation' && task.kind !== 'reverse'
  const keys =
    task.kind === 'reverse' ? substitutionKeys(task.unknown) : calculationKeys(task.calculation)
  const hint =
    task.kind === 'reverse'
      ? `Formel: ${task.steps[0]?.text ?? ''}. Setze den Flächeninhalt und die bekannten Längen ein; ${task.unknown} bleibt stehen.`
      : task.kind === 'area'
        ? 'Schreibe die Rechnung als Kette: Formel, eingesetzt, Ergebnis, z. B. A = g · h = 6 · 4 = 24. Halbe Zahlen mit Komma, z. B. 6,5. Ob cm oder cm², wählst du darunter.'
        : 'Schreibe die Rechnung als Kette: Formel, eingesetzt, Ergebnis, z. B. u = 2 · (a + b) = 2 · (5 + 3) = 16. Halbe Zahlen mit Komma, z. B. 6,5. Ob cm oder cm², wählst du darunter.'
  return (
    <form onSubmit={onSubmit} noValidate className="geometry-entry">
      <label htmlFor={id} className="practice-label">
        {calculating ? 'Deine Rechnung' : 'Formel eingesetzt'}
      </label>
      <MathInput id={id} value={value} onChange={onChange} keys={keys} inputRef={inputRef} describedBy={`${id}-hint`} />
      <p id={`${id}-hint`} className="practice-hint">
        {hint}
      </p>
      {calculating && <UnitChoice name={`${id}-unit`} legend="Ergebnis in" unit={unit} onUnit={onUnit} unitRef={unitRef} />}
      <div className="practice-actions">
        <button type="submit" className="btn btn-primary">
          Prüfen
        </button>
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

function FormMessage({ hint, echo }: { hint: string; echo?: { input: string; start: number; end: number } }) {
  return (
    <div className="feedback feedback-form">
      <p>Fast: Das stimmt, ist aber noch nicht in der gewünschten Form.</p>
      <div className="chips">
        <Chip ok={false}>Form nicht ok</Chip>
      </div>
      <p>{hint}</p>
      {echo && <InputEcho input={echo.input} position={echo.start} length={echo.end - echo.start} />}
    </div>
  )
}

function FeedbackMessage({ feedback, task }: { feedback: GeometryFeedback; task: CalculationTask }) {
  const unknown = task.kind === 'reverse' ? task.unknown : 'x'
  switch (feedback.kind) {
    case 'calculation-invalid':
      return <Unreadable what="Die Rechnung" error={feedback.error} input={feedback.input} />
    case 'substitution-invalid':
      return <Unreadable what="Die Zeile" error={feedback.error} input={feedback.input} />
    case 'missing-unit':
      return <p className="feedback feedback-form">Wähle noch die Einheit: cm oder cm².</p>
    case 'calculation-form':
      return (
        <FormMessage
          hint={feedback.hint.message}
          {...(feedback.span ? { echo: { input: feedback.input, ...feedback.span } } : {})}
        />
      )
    case 'substitution-form':
      return <FormMessage hint={feedback.hint.message} />
    case 'calculation-wrong':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch.</p>
          <div className="chips">
            {okChip(feedback.result, 'Ergebnis')}
            {okChip(feedback.unit, 'Einheit')}
          </div>
          {feedback.value ? (
            <p>Die Rechnung stimmt, aber nicht die Einheit: Flächen haben cm², Längen cm.</p>
          ) : feedback.consistent ? (
            <p>Du hast richtig gerechnet, aber Formel oder Zahlen passen nicht.</p>
          ) : (
            <>
              <p>Ab der markierten Stelle stimmt die Rechnung nicht.</p>
              {feedback.at && (
                <InputEcho
                  input={feedback.input}
                  position={feedback.at.span.start}
                  length={feedback.at.span.end - feedback.at.span.start}
                />
              )}
            </>
          )}
          {feedback.value || feedback.unit ? null : (
            <p>Achte auch auf die Einheit: Flächen haben cm², Längen cm.</p>
          )}
        </div>
      )
    case 'substitution-correct':
      return (
        <p className="feedback feedback-correct">
          ✓ Richtig eingesetzt. Löse die Gleichung jetzt nach {unknown} auf.
        </p>
      )
    case 'substitution-wrong':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch. Diese Gleichung hat eine andere Lösung: Formel oder Zahlen passen nicht.</p>
          <div className="chips">
            {okChip(feedback.left, 'linke Seite')}
            {okChip(feedback.right, 'rechte Seite')}
          </div>
          <p className="feedback-answer">
            Deine Zeile: <Tex latex={equationToLatex(feedback.equation, DECIMAL)} />
          </p>
        </div>
      )
    case 'equation':
      return <EquationFeedbackMessage feedback={feedback.feedback} variable={unknown} options={DECIMAL} />
    case 'result-fraction':
      return (
        <p className="feedback feedback-form">
          ✓ Die Zeile stimmt. Schreibe das Ergebnis noch als Dezimalzahl, z. B. mit „Term umformen“.
        </p>
      )
    case 'solved':
      return (
        <p className="feedback feedback-correct">
          ✓ {unknown} steht allein. Wähle jetzt die Einheit.
        </p>
      )
    case 'unit-wrong':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Die Einheit stimmt nicht: Längen haben cm, Flächen cm².</p>
          <div className="chips">
            <Chip ok>Rechnung ok</Chip>
            <Chip ok={false}>Einheit nicht ok</Chip>
          </div>
        </div>
      )
    case 'correct':
      return (
        <div className="feedback feedback-correct">
          <p>✓ Richtig!</p>
          <div className="chips">
            <Chip ok>Rechnung ok</Chip>
            <Chip ok>Einheit ok</Chip>
          </div>
          {task.kind === 'reverse' && (
            <p>
              {task.unknown} = {withUnit(task.result, task.unit)}
            </p>
          )}
        </div>
      )
    case 'revealed':
      return <p className="feedback feedback-wrong">Hier ist die Musterlösung. Die Aufgabe zählt als nicht gelöst.</p>
  }
}
