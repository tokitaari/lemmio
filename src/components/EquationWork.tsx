import { DECIMAL, equationToLatex, operationToLatex, solutionSetToLatex, type EquationTask } from '../math'
import type { EquationFeedback, EquationLine } from '../practice/equationSession'
import Chip from './Chip'
import Tex from './Tex'

interface EquationWorkProps {
  task: EquationTask
  lines: readonly EquationLine[]
  /** The final feedback once the task is finished; adds the learner's solution set as the last line. */
  end?: EquationFeedback | null
}

/**
 * The learner's own solution in school notation: the given equation, then one
 * line per accepted step with the operation written next to the line it
 * applies to. Each accepted line carries its check as chips. Tasks marked
 * with `numbers: 'decimal'` are printed with a decimal comma.
 */
export default function EquationWork({ task, lines, end = null }: EquationWorkProps) {
  const options = task.numbers === 'decimal' ? DECIMAL : undefined
  const equations = [task.equation, ...lines.map((line) => line.equation)]
  return (
    <ol className="solution equation-work" aria-label="Deine Rechnung">
      {equations.map((equation, i) => {
        const next = lines[i]
        return (
          <li key={i} className="solution-step">
            <span className="solution-rel" aria-hidden="true" />
            <span className="solution-expr">
              <Tex latex={equationToLatex(equation, options)} />
            </span>
            {next && (
              <span className="solution-note equation-op">
                <Tex latex={operationToLatex(next.operation, options)} />
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
            <Tex latex={solutionSetToLatex(task.solutionSet, options)} />
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
            <Tex latex={solutionSetToLatex(end.given, options)} />
          </span>
          <div className="chips solution-chips">
            <Chip ok={false}>Lösungsmenge nicht ok</Chip>
          </div>
        </li>
      )}
    </ol>
  )
}
