import { isEquationTask, isFunctionTask, isGeometryTask, type WorkedExample } from '../content'
import EquationSolutionSteps from './EquationSolutionSteps'
import FunctionExamplePlane from './FunctionExamplePlane'
import FunctionSolutionSteps from './FunctionSolutionSteps'
import GeometrySolutionSteps from './GeometrySolutionSteps'
import ShapeFigure from './shapes/ShapeFigure'
import RichText from './RichText'
import SolutionSteps from './SolutionSteps'

interface WorkedExampleCardProps {
  example: WorkedExample
  number: number
}

export default function WorkedExampleCard({ example, number }: WorkedExampleCardProps) {
  const headingId = `beispiel-${number}`
  return (
    <article className="example" aria-labelledby={headingId}>
      <h3 id={headingId}>
        Beispiel {number}: {example.title}
      </h3>
      <p className="example-instruction">{example.task.instruction}</p>
      {isGeometryTask(example.task) ? (
        <>
          <div className="example-figure">
            <ShapeFigure figure={example.task.figure} label="Figur zum Beispiel" />
          </div>
          <GeometrySolutionSteps task={example.task} />
        </>
      ) : isFunctionTask(example.task) ? (
        <>
          <FunctionExamplePlane task={example.task} />
          <FunctionSolutionSteps task={example.task} />
        </>
      ) : isEquationTask(example.task) ? (
        <EquationSolutionSteps task={example.task} />
      ) : (
        <SolutionSteps task={example.task} />
      )}
      {example.comment && (
        <p className="example-comment">
          <RichText text={example.comment} />
        </p>
      )}
    </article>
  )
}
