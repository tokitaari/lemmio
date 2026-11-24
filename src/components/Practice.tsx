import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { generateSeries, toLatex, toText, type Rng, type SubtopicId } from '../math'
import {
  createSession,
  currentTask,
  finishedBetween,
  isSeriesOver,
  isTaskFinished,
  nextTask,
  revealSolution,
  submitAnswer,
  taskVariables,
  type Feedback,
  type Session,
} from '../practice/session'
import { useSubtopicProgress } from '../practice/useSubtopicProgress'
import Chip from './Chip'
import InputEcho from './InputEcho'
import MathInput from './MathInput'
import PracticeProgress from './PracticeProgress'
import SeriesSummary from './SeriesSummary'
import SkillPath from './SkillPath'
import SolutionSteps from './SolutionSteps'
import Tex from './Tex'

interface PracticeProps {
  topic: SubtopicId
  /** Source of randomness for the series; tests pass a seeded one. */
  rng?: Rng
}

/**
 * Practice area of a subtopic: a series of generated tasks, one at a time,
 * with feedback, model solution and progress that is kept in the browser.
 */
export default function Practice({ topic, rng = Math.random }: PracticeProps) {
  const [session, setSession] = useState(() => createSession(generateSeries(topic, rng)))
  const [input, setInput] = useState('')
  const { progress, saveFailed, record, reset } = useSubtopicProgress(topic)

  const inputId = useId()
  const hintId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const solutionRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLHeadingElement>(null)
  // Set by handlers that start a new task; the effect below moves the focus once it is rendered.
  const focusInput = useRef(false)

  const task = currentTask(session)
  const finished = isTaskFinished(session)
  const over = isSeriesOver(session)

  useEffect(() => {
    if (focusInput.current) {
      focusInput.current = false
      inputRef.current?.focus()
    }
  }, [session])

  // Screen readers and small screens land on the model solution right after the check.
  useEffect(() => {
    if (finished) solutionRef.current?.focus()
  }, [finished])

  useEffect(() => {
    if (over) summaryRef.current?.focus()
  }, [over])

  const apply = (next: Session) => {
    const done = finishedBetween(session, next)
    setSession(next)
    if (done) record(done.correct, done.series)
    else inputRef.current?.focus()
  }

  const startSeries = () => {
    focusInput.current = true
    setSession(createSession(generateSeries(topic, rng)))
    setInput('')
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    apply(submitAnswer(session, input))
  }

  const onNext = () => {
    focusInput.current = true
    setSession(nextTask(session))
    setInput('')
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
          <Tex latex={toLatex(task.prompt)} display />

          <form onSubmit={onSubmit} noValidate>
            <label htmlFor={inputId} className="practice-label">
              Deine Antwort
            </label>
            <MathInput
              id={inputId}
              value={input}
              onChange={setInput}
              variables={taskVariables(toText(task.prompt))}
              readOnly={finished}
              inputRef={inputRef}
              describedBy={hintId}
            />
            <p id={hintId} className="practice-hint">
              Tipp: x² geht auch als x^2, und 2x oder 3(x+1) darfst du ohne Malzeichen tippen.
            </p>
            <div className="practice-actions">
              <button type="submit" className="btn btn-primary" disabled={finished}>
                Prüfen
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={finished}
                onClick={() => apply(revealSolution(session))}
              >
                Lösung anzeigen
              </button>
            </div>
          </form>

          <div role="status" className="practice-feedback-region">
            {session.feedback && <FeedbackMessage feedback={session.feedback} />}
          </div>

          {finished && (
            <section aria-labelledby={`${inputId}-musterloesung`} className="practice-solution">
              <h3 id={`${inputId}-musterloesung`} ref={solutionRef} tabIndex={-1}>
                Musterlösung
              </h3>
              <SolutionSteps task={task} />
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

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  switch (feedback.kind) {
    case 'correct':
      return (
        <div className="feedback feedback-correct">
          <p>✓ Richtig!</p>
          <div className="chips">
            <Chip ok>äquivalent</Chip>
            <Chip ok>Form ok</Chip>
          </div>
        </div>
      )
    case 'wrong':
      return (
        <div className="feedback feedback-wrong">
          <p>✗ Leider falsch. Dein Term ist nicht gleichwertig zur Aufgabe.</p>
          <div className="chips">
            <Chip ok={false}>nicht äquivalent</Chip>
          </div>
          {feedback.answer && (
            <p className="feedback-answer">
              Deine Antwort: <Tex latex={toLatex(feedback.answer)} />
            </p>
          )}
        </div>
      )
    case 'revealed':
      return <p className="feedback feedback-wrong">Hier ist die Musterlösung. Die Aufgabe zählt als nicht gelöst.</p>
    case 'wrong-form':
      return (
        <div className="feedback feedback-form">
          <p>Fast: Dein Term ist gleichwertig, aber noch nicht in der gewünschten Form.</p>
          <div className="chips">
            <Chip ok>äquivalent</Chip>
            <Chip ok={false}>Form nicht ok</Chip>
          </div>
          <p>{feedback.hint.message}</p>
        </div>
      )
    case 'invalid':
      return (
        <div className="feedback feedback-invalid">
          <p>Das kann ich nicht lesen. {feedback.error.message}</p>
          {feedback.input.trim() !== '' && <InputEcho input={feedback.input} position={feedback.error.position} length={feedback.error.length} />}
        </div>
      )
  }
}
