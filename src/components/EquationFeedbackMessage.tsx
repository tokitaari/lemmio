import { equationToLatex, operationToLatex } from '../math'
import type { EquationFeedback } from '../practice/equationSession'
import Chip from './Chip'
import InputEcho from './InputEcho'
import Tex from './Tex'
import Unreadable from './Unreadable'

/** The message after a check of the equation practice: right, wrong with chips, unreadable, not allowed, … */
export default function EquationFeedbackMessage({ feedback, variable }: { feedback: EquationFeedback; variable: string }) {
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
