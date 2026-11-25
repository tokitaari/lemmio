import { useEffect, useId, useRef, useState } from 'react'
import { generateEquationSeries, type EquationSubtopicId, type Rng } from '../math'
import {
  createEquationSession,
  currentEquationTask,
  nextEquationTask,
  revealEquationSolution,
  submitLine,
  submitSolutionSet,
  type EquationSession,
} from '../practice/equationSession'
import { finishedBetween, isSeriesOver, isTaskFinished } from '../practice/session'
import { useSubtopicProgress } from '../practice/useSubtopicProgress'
import EquationEntry, { type EquationFields } from './EquationEntry'
import EquationFeedbackMessage from './EquationFeedbackMessage'
import EquationSolutionSteps from './EquationSolutionSteps'
import EquationWork from './EquationWork'
import { fieldToFocus } from './equationFocus'
import PracticeProgress from './PracticeProgress'
import SeriesSummary from './SeriesSummary'
import SkillPath from './SkillPath'

interface EquationPracticeProps {
  topic: EquationSubtopicId
  /** Source of randomness for the series; tests pass a seeded one. */
  rng?: Rng
}

const EMPTY_FIELDS: EquationFields = { operation: '', equation: '', set: '' }

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
