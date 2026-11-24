import { useEffect, useId, useRef, useState } from 'react'
import {
  equationToLatex,
  generateEquationSeries,
  operationToLatex,
  solutionSetToLatex,
  type EquationTask,
  type EquationSubtopicId,
  type Rng,
} from '../math'
import {
  createEquationSession,
  currentEquationTask,
  nextEquationTask,
  revealEquationSolution,
  submitLine,
  submitSolutionSet,
  type EquationFeedback,
  type EquationLine,
  type EquationSession,
} from '../practice/equationSession'
import { finishedBetween, isSeriesOver, isTaskFinished } from '../practice/session'
import { useSubtopicProgress } from '../practice/useSubtopicProgress'
import Chip from './Chip'
import EquationEntry, { type EquationField, type EquationFields } from './EquationEntry'
import EquationSolutionSteps from './EquationSolutionSteps'
import InputEcho from './InputEcho'
import PracticeProgress from './PracticeProgress'
import SeriesSummary from './SeriesSummary'
import SkillPath from './SkillPath'
import Tex from './Tex'

interface EquationPracticeProps {
  topic: EquationSubtopicId
  /** Source of randomness for the series; tests pass a seeded one. */
  rng?: Rng
}

const EMPTY_FIELDS: EquationFields = { operation: '', equation: '', set: '' }

/** Where the focus goes after a check: the field the learner has to correct or continue in. */
function fieldToFocus(feedback: EquationFeedback | null): EquationField | null {
  switch (feedback?.kind) {
    case 'line-correct':
    case 'not-solved':
    case 'operation-invalid':
    case 'operation-not-allowed':
      return 'operation'
    case 'line-wrong':
    case 'equation-invalid':
      return 'equation'
    case 'set-invalid':
      return 'set'
    default:
      return null
  }
}

/**
 * Practice area of an equation subtopic: a series of generated equations,
 * solved line by line. Every line is written with the operation that leads to
 * it and checked on its own; the task ends with the solution set.
 */
export default function EquationPractice({ topic, rng = Math.random }: EquationPracticeProps) {
  const [session, setSession] = useState(() => createEquationSession(generateEquationSeries(topic, rng)))
  const [fields, setFields] = useState(EMPTY_FIELDS)
  const { progress, saveFailed, record, reset } = useSubtopicProgress(topic)

  const solutionId = useId()
  const operationRef = useRef<HTMLInputElement>(null)
  const equationRef = useRef<HTMLInputElement>(null)
  const setRef = useRef<HTMLInputElement>(null)
  const solutionRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLHeadingElement>(null)
  // Set by handlers that start a new task; the effect below moves the focus once it is rendered.
  const focusStart = useRef(false)

  const task = currentEquationTask(session)
  const finished = isTaskFinished(session)
  const over = isSeriesOver(session)

  useEffect(() => {
    const field = focusStart.current ? 'operation' : fieldToFocus(session.feedback)
    focusStart.current = false
    if (field === 'operation') operationRef.current?.focus()
    else if (field === 'equation') equationRef.current?.focus()
    else if (field === 'set') setRef.current?.focus()
  }, [session])

  // Screen readers and small screens land on the model solution right after the task is finished.
  useEffect(() => {
    if (finished) solutionRef.current?.focus()
  }, [finished])

  useEffect(() => {
    if (over) summaryRef.current?.focus()
  }, [over])

  const apply = (next: EquationSession) => {
    const done = finishedBetween(session, next)
    setSession(next)
    if (done) record(done.correct, done.series)
  }

  const onSubmitLine = () => {
    const next = submitLine(session, fields.operation, fields.equation)
    // An accepted line makes room for the next one; everything else stays in the fields for a correction.
    if (next.lines.length > session.lines.length) setFields((f) => ({ ...f, operation: '', equation: '' }))
    apply(next)
  }

  const startSeries = () => {
    focusStart.current = true
    setSession(createEquationSession(generateEquationSeries(topic, rng)))
    setFields(EMPTY_FIELDS)
  }

  const onNext = () => {
    focusStart.current = true
    setSession(nextEquationTask(session))
    setFields(EMPTY_FIELDS)
  }

  const onReset = () => {
    reset()
    startSeries()
  }

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

          <EquationWork task={task} lines={session.lines} end={finished ? session.feedback : null} />

          <div role="status" className="practice-feedback-region">
            {session.feedback && <EquationFeedbackMessage feedback={session.feedback} variable={task.variable} />}
          </div>

          {!finished && (
            <EquationEntry
              variable={task.variable}
              values={fields}
              onChange={(field, value) => setFields((f) => ({ ...f, [field]: value }))}
              onSubmitLine={onSubmitLine}
              onSubmitSolutionSet={() => apply(submitSolutionSet(session, fields.set))}
              onReveal={() => apply(revealEquationSolution(session))}
              operationRef={operationRef}
              equationRef={equationRef}
              setRef={setRef}
            />
          )}

          {finished && (
            <section aria-labelledby={solutionId} className="practice-solution">
              <h3 id={solutionId} ref={solutionRef} tabIndex={-1}>
                Musterlösung
              </h3>
              <EquationSolutionSteps task={task} />
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

interface EquationWorkProps {
  task: EquationTask
  lines: readonly EquationLine[]
  /** The final feedback once the task is finished; adds the learner's solution set as the last line. */
  end: EquationFeedback | null
}

/**
 * The learner's own solution in school notation: the given equation, then one
 * line per accepted step with the operation written next to the line it
 * applies to. Each accepted line carries its check as chips.
 */
function EquationWork({ task, lines, end }: EquationWorkProps) {
  const equations = [task.equation, ...lines.map((line) => line.equation)]
  return (
    <ol className="solution equation-work" aria-label="Deine Rechnung">
      {equations.map((equation, i) => {
        const next = lines[i]
        return (
          <li key={i} className="solution-step">
            <span className="solution-rel" aria-hidden="true" />
            <span className="solution-expr">
              <Tex latex={equationToLatex(equation)} />
            </span>
            {next && (
              <span className="solution-note equation-op">
                <Tex latex={operationToLatex(next.operation)} />
              </span>
            )}
            {i > 0 && (
              <div className="chips solution-chips">
                <Chip ok>Umformung ok</Chip>
                <Chip ok>beide Seiten ok</Chip>
              </div>
            )}
          </li>
        )
      })}
      {end?.kind === 'correct' && (
        <li className="solution-step solution-result">
          <span className="solution-rel" aria-hidden="true" />
          <span className="solution-expr">
            <Tex latex={solutionSetToLatex(task.solutionSet)} />
          </span>
          <div className="chips solution-chips">
            <Chip ok>Lösungsmenge ok</Chip>
          </div>
        </li>
      )}
      {end?.kind === 'set-wrong' && (
        <li className="solution-step solution-result">
          <span className="solution-rel" aria-hidden="true" />
          <span className="solution-expr">
            <Tex latex={solutionSetToLatex(end.given)} />
          </span>
          <div className="chips solution-chips">
            <Chip ok={false}>Lösungsmenge nicht ok</Chip>
          </div>
        </li>
      )}
    </ol>
  )
}

function EquationFeedbackMessage({ feedback, variable }: { feedback: EquationFeedback; variable: string }) {
  switch (feedback.kind) {
    case 'line-correct':
      return <p className="feedback feedback-correct">✓ Die Zeile stimmt.</p>
    case 'line-wrong':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Diese Zeile passt nicht zur Umformung.</p>
          <div className="chips">
            <Chip ok>Umformung ok</Chip>
            <Chip ok={feedback.left}>{feedback.left ? 'linke Seite ok' : 'linke Seite nicht ok'}</Chip>
            <Chip ok={feedback.right}>{feedback.right ? 'rechte Seite ok' : 'rechte Seite nicht ok'}</Chip>
          </div>
          <p className="feedback-answer">
            Deine Umformung: <Tex latex={operationToLatex(feedback.operation)} />
          </p>
          <p className="feedback-answer">
            Deine Zeile: <Tex latex={equationToLatex(feedback.equation)} />
          </p>
          <p>
            {feedback.keepsSolutions
              ? 'Die Zeile hat dieselben Lösungen wie die davor, folgt aber nicht aus genau dieser Umformung. Wende pro Zeile nur eine Umformung an.'
              : feedback.left || feedback.right
                ? 'Rechne die Seite, bei der ✗ steht, noch einmal nach.'
                : 'Rechne beide Seiten noch einmal nach.'}
          </p>
        </div>
      )
    case 'operation-invalid':
      return <Unreadable what="Die Umformung" error={feedback.error} input={feedback.input} />
    case 'equation-invalid':
      return <Unreadable what="Die Zeile" error={feedback.error} input={feedback.input} />
    case 'set-invalid':
      return <Unreadable what="Die Lösungsmenge" error={feedback.error} input={feedback.input} />
    case 'operation-not-allowed':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Diese Umformung ist nicht erlaubt. {feedback.error.message}</p>
          <div className="chips">
            <Chip ok={false}>Umformung nicht ok</Chip>
          </div>
          <InputEcho input={feedback.input} position={feedback.error.position} length={feedback.error.length} />
        </div>
      )
    case 'not-solved':
      return (
        <p className="feedback feedback-form">
          Noch nicht fertig: Forme weiter um, bis {variable} allein steht ({variable} = …) oder auf beiden Seiten nur
          Zahlen stehen, z. B. 2 = 3. Danach gibst du die Lösungsmenge an.
        </p>
      )
    case 'set-wrong':
      return <p className="feedback feedback-wrong">✗ Leider falsch. Diese Lösungsmenge passt nicht zur Gleichung.</p>
    case 'correct':
      return <p className="feedback feedback-correct">✓ Richtig! Die Lösungsmenge stimmt.</p>
    case 'revealed':
      return <p className="feedback feedback-wrong">Hier ist die Musterlösung. Die Aufgabe zählt als nicht gelöst.</p>
  }
}

function Unreadable({
  what,
  error,
  input,
}: {
  what: string
  error: { message: string; position: number; length: number }
  input: string
}) {
  return (
    <div className="feedback feedback-invalid">
      <p>
        {what} kann ich nicht lesen. {error.message}
      </p>
      {input.trim() !== '' && <InputEcho input={input} position={error.position} length={error.length} />}
    </div>
  )
}
