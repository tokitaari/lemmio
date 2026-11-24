import type { FunctionTask } from '../math'
import Tex from './Tex'

/**
 * Worked solution of a task about linear functions: one line per step with
 * its explanation; the last line is the result. Used for the worked examples
 * and later for the model solution in the practice area.
 */
export default function FunctionSolutionSteps({ task }: { task: FunctionTask }) {
  const last = task.steps.length - 1
  return (
    <ol className="solution" aria-label="Lösungsweg">
      {task.steps.map((step, i) => (
        <li key={i} className={i === last ? 'solution-step solution-result' : 'solution-step'}>
          <span className="solution-rel" aria-hidden="true" />
          <span className="solution-expr">
            <Tex latex={step.latex} />
          </span>
          {step.note && <span className="solution-note">{step.note}</span>}
        </li>
      ))}
    </ol>
  )
}
