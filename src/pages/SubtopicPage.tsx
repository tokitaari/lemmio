import { Link, useParams } from 'react-router-dom'
import Breadcrumb from '../components/Breadcrumb'
import CardDeck from '../components/cards/CardDeck'
import EquationPractice from '../components/EquationPractice'
import FormulaList from '../components/FormulaList'
import Practice from '../components/Practice'
import WorkedExampleCard from '../components/WorkedExampleCard'
import { findSubtopic } from '../catalog'
import { findContent, findFormula } from '../content'
import { isEquationSubtopic, isTermSubtopic } from '../math'
import NotFound from './NotFound'

/**
 * A subtopic at `/area/topic/subtopic`: explanation as a card deck, worked
 * examples, formulas and the practice area (terms are answered in one field,
 * equations are solved line by line).
 */
export default function SubtopicPage() {
  const params = useParams()
  const ref = findSubtopic(params.area, params.topic, params.subtopic)
  const content = ref && findContent(ref.id)

  if (!ref || !content) return <NotFound />
  const { id, area, topic, subtopic } = ref

  return (
    <>
      <Breadcrumb trail={[area.slug, topic.slug, subtopic.slug]} />
      <h1>{subtopic.title}</h1>
      <p className="lead">{subtopic.summary}</p>

      <section aria-labelledby="erklaerung" className="panel">
        <h2 id="erklaerung">Erklärung</h2>
        <CardDeck
          key={id}
          deck={{ id, cards: content.cards }}
          finish={
            <p>
              <a href="#uebung" className="btn btn-primary">
                Weiter zur Übung
              </a>
            </p>
          }
        />
      </section>

      <section aria-labelledby="beispiele" className="panel">
        <h2 id="beispiele">Beispiele</h2>
        {content.examples.map((example, i) => (
          <WorkedExampleCard key={example.task.key} example={example} number={i + 1} />
        ))}
      </section>

      <section aria-labelledby="formeln" className="panel">
        <h2 id="formeln">Formeln</h2>
        <FormulaList formulas={content.formulaIds.map(findFormula)} />
        <p>
          <Link to="/formelsatz">Alle Formeln im Formelsatz</Link>
        </p>
      </section>

      {/* Keyed by id: switching subtopics starts a fresh series instead of reusing the old state. */}
      {isTermSubtopic(id) && <Practice key={id} topic={id} />}
      {isEquationSubtopic(id) && <EquationPractice key={id} topic={id} />}
    </>
  )
}
