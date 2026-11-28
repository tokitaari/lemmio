import { DECIMAL, equationToLatex, operationToLatex, type GeometryTask } from '../math'
import Tex from './Tex'

type CalculationTask = Extract<GeometryTask, { kind: 'area' | 'perimeter' | 'reverse' }>

/**
 * Worked solution of a geometry task: one line per step with its
 * explanation; the last line is the result with its unit. For a Rückwärts
 * task the substituted formula is solved line by line in school notation
 * (the operation next to the line it applies to, numbers with a decimal
 * comma), ending with the length and its unit instead of a solution set. Used
 * for the worked examples and for the model solution in the practice area.
 */
export default function GeometrySolutionSteps({ task }: { task: CalculationTask }) {
  if (task.kind !== 'reverse') {
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

  const [formula, substitution, result] = task.steps
  const lines = task.equation.steps
  // The substitution, then the equation lines up to the result; the last line `h = 4` is the result itself.
  const rows = [
    { latex: substitution?.latex ?? equationToLatex(task.substitution, DECIMAL), note: substitution?.note },
    ...lines.slice(0, -1).map((line) => ({ latex: equationToLatex(line.equation, DECIMAL), note: undefined })),
  ]
  return (
    <ol className="solution" aria-label="Lösungsweg">
      {formula && (
        <li className="solution-step">
          <span className="solution-rel" aria-hidden="true" />
          <span className="solution-expr">
            <Tex latex={formula.latex} />
          </span>
          {formula.note && <span className="solution-note">{formula.note}</span>}
        </li>
      )}
      {rows.map((row, i) => {
        const next = lines[i]
        return (
          <li key={i} className="solution-step">
            <span className="solution-rel" aria-hidden="true" />
            <span className="solution-expr">
              <Tex latex={row.latex} />
            </span>
            {row.note && <span className="solution-note">{row.note}</span>}
            {next && (
              <span className="solution-note equation-op">
                <Tex latex={operationToLatex(next.operation, DECIMAL)} />
                {next.note && <span className="equation-op-note">{next.note}</span>}
              </span>
            )}
          </li>
        )
      })}
      {result && (
        <li className="solution-step solution-result">
          <span className="solution-rel" aria-hidden="true" />
          <span className="solution-expr">
            <Tex latex={result.latex} />
          </span>
          {result.note && <span className="solution-note">{result.note}</span>}
        </li>
      )}
    </ol>
  )
}
