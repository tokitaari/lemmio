import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { catalog } from '../catalog'
import { allEntries, formulaGroupsOf, isEquationTask, isFunctionTask, subtopicContent } from '../content'
import { ALL_SUBTOPIC_IDS, EQUATION_SUBTOPIC_IDS, FUNCTION_SUBTOPIC_IDS, SUBTOPIC_IDS } from '../math'
import { routes } from '../routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const { container } = render(<RouterProvider router={router} />)
  return { router, container }
}

beforeEach(() => {
  localStorage.clear()
})

describe('topic page', () => {
  it.each(ALL_SUBTOPIC_IDS)('%s shows explanation, worked examples and formulas', (topic) => {
    const content = subtopicContent[topic]
    const { container } = renderAt(`/${topic}`)

    const firstCard = content.cards[0]!
    expect(screen.getByRole('heading', { level: 3, name: firstCard.title })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Achtung, typische Fehler' })).not.toBeInTheDocument()

    const examples = within(screen.getByRole('region', { name: 'Beispiele' }))
    content.examples.forEach((example, i) => {
      const card = within(examples.getByRole('article', { name: `Beispiel ${i + 1}: ${example.title}` }))
      const steps = within(card.getByRole('list', { name: 'Lösungsweg' })).getAllByRole('listitem')
      // Terms: the prompt plus one line per step. Equations: also the solution set. Functions: one line per step.
      const extra = isFunctionTask(example.task) ? 0 : isEquationTask(example.task) ? 2 : 1
      expect(steps).toHaveLength(example.task.steps.length + extra)
      for (const step of example.task.steps) if (step.note) expect(card.getByText(step.note)).toBeInTheDocument()
    })

    const formulas = within(screen.getByRole('region', { name: 'Formeln' }))
    expect(formulas.getAllByRole('term')).toHaveLength(content.formulaIds.length)

    // Formulas are typeset by KaTeX (HTML plus MathML) and none failed to render.
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(10)
    expect(container.querySelectorAll('math').length).toBeGreaterThan(10)
    expect(container.querySelector('.katex-error')).toBeNull()
  })

  it.each(SUBTOPIC_IDS)('%s has a practice area with a task and an input', (topic) => {
    renderAt(`/${topic}`)
    const practice = within(screen.getByRole('region', { name: 'Übung' }))
    expect(practice.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(practice.getByLabelText('Deine Antwort')).toBeInTheDocument()
    expect(practice.getByRole('button', { name: 'Prüfen' })).toBeInTheDocument()
  })

  it.each(EQUATION_SUBTOPIC_IDS)('%s has a practice area with an equation and the line input', (topic) => {
    renderAt(`/${topic}`)
    const practice = within(screen.getByRole('region', { name: 'Übung' }))
    expect(practice.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(practice.getByRole('list', { name: 'Deine Rechnung' })).toBeInTheDocument()
    expect(practice.getByLabelText('Umformung')).toBeInTheDocument()
    expect(practice.getByLabelText('Neue Zeile')).toBeInTheDocument()
    expect(practice.getByLabelText('Lösungsmenge')).toBeInTheDocument()
    expect(practice.getByRole('button', { name: 'Zeile prüfen' })).toBeInTheDocument()
    expect(practice.getByRole('button', { name: 'Lösungsmenge prüfen' })).toBeInTheDocument()
    expect(practice.queryByText(/folgen bald/)).not.toBeInTheDocument()
  })

  it.each(FUNCTION_SUBTOPIC_IDS)('%s says that its practice follows later', (topic) => {
    renderAt(`/${topic}`)
    const practice = within(screen.getByRole('region', { name: 'Übung' }))
    expect(practice.getByText('Übungsaufgaben zu diesem Teilthema folgen bald.')).toBeInTheDocument()
    expect(document.getElementById('uebung')).not.toBeNull()
  })

  it('shows the graph of a worked example about functions', () => {
    renderAt('/funktionen/lineare-funktionen/schnittpunkt')
    const card = within(screen.getByRole('article', { name: 'Beispiel 1: Genau ein Schnittpunkt' }))
    expect(card.getByRole('group', { name: /^Graph zum Beispiel/ })).toBeInTheDocument()
    expect(card.getByRole('img', { name: /^Gerade f\(x\) = 2x \+ 1/ })).toBeInTheDocument()
    expect(card.getByRole('img', { name: /^Punkt S/ })).toBeInTheDocument()
    const lines = within(card.getByRole('list', { name: 'Lösungsweg' })).getAllByRole('listitem')
    expect(lines.at(-1)).toHaveClass('solution-result')
    expect(lines.at(-1)).toHaveTextContent('Der Schnittpunkt der beiden Geraden.')
  })

  it('shows a worked equation in school notation with the solution set at the end', () => {
    renderAt('/algebra/lineare-gleichungen/umformen')
    const card = within(screen.getByRole('article', { name: 'Beispiel 1: x auf beiden Seiten' }))
    const lines = within(card.getByRole('list', { name: 'Lösungsweg' })).getAllByRole('listitem')
    expect(lines.at(-1)).toHaveClass('solution-result')
    expect(lines.at(-1)).toHaveTextContent('Die Gleichung hat genau eine Lösung: x = 4.')
    expect(card.getByText('Alle Terme mit x auf die linke Seite bringen.')).toHaveClass('equation-op-note')
  })

  it('starts a fresh series when another subtopic is opened', async () => {
    const { router } = renderAt('/algebra/terme/ausmultiplizieren')
    await userEvent.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
    await act(() => router.navigate('/algebra/terme/faktorisieren'))
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
  })

  it('links to the formula sheet', async () => {
    const { router } = renderAt('/algebra/terme/binomische-formeln')
    await userEvent.click(screen.getByRole('link', { name: /Formelsatz/ }))
    expect(router.state.location.pathname).toBe('/formelsatz')
  })
})

describe('formula sheet', () => {
  it('shows every formula, grouped by topic of the catalog', () => {
    const { container } = renderAt('/formelsatz')
    expect(screen.getByRole('heading', { level: 1, name: 'Formelsatz' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Pfad' })).toHaveTextContent('start/formelsatz')
    for (const area of catalog) {
      for (const topic of area.topics) {
        const groups = formulaGroupsOf(area.slug, topic.slug)
        const region = within(screen.getByRole('region', { name: topic.title }))
        for (const group of groups) {
          expect(region.getByRole('heading', { level: 3, name: group.title })).toBeInTheDocument()
        }
        expect(region.getAllByRole('term')).toHaveLength(groups.reduce((n, g) => n + g.formulas.length, 0))
      }
    }
    expect(container.querySelectorAll('.katex-display')).toHaveLength(allEntries.length)
    expect(container.querySelector('.katex-error')).toBeNull()
  })

  it('is linked from the home page', async () => {
    const { router } = renderAt('/')
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: 'Formelsatz' }))
    expect(router.state.location.pathname).toBe('/formelsatz')
  })
})
