import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRng, equationToText, operationToText, pointToText } from '../math'
import { generateIntersectionSeries, type IntersectionTask } from '../practice/intersectionSession'
import { STORAGE_KEY } from '../practice/progress'
import IntersectionPractice from './IntersectionPractice'

/** Identical lines are always calculated, so the tests of reading need a series that starts with another task. */
const SEED = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(
  (seed) => generateIntersectionSeries(createRng(seed))[0]?.intersection.kind !== 'identical',
)!
const TOPIC = 'funktionen/lineare-funktionen/schnittpunkt'

beforeEach(() => {
  localStorage.clear()
})

function setup() {
  const tasks = generateIntersectionSeries(createRng(SEED))
  const user = userEvent.setup()
  render(<IntersectionPractice topic={TOPIC} rng={createRng(SEED)} />)
  const write = (label: string, text: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } })
  const status = () => within(screen.getByRole('status'))

  const solveLines = async (task: IntersectionTask) => {
    for (const step of task.equation.steps) {
      write('Umformung', operationToText(step.operation))
      write('Neue Zeile', equationToText(step.equation))
      await user.click(screen.getByRole('button', { name: 'Zeile prüfen' }))
    }
  }

  const answerRight = async (task: IntersectionTask, index: number) => {
    const point = task.intersection.kind === 'point' ? task.intersection.point : null
    if (index % 2 === 1 || task.intersection.kind === 'identical') await solveLines(task)
    if (point && index % 2 === 1) {
      write('Deine Rechnung für y', `${task.fn.name}(${point.x.toNumber()}) = ${point.y.toNumber()}`)
      await user.click(screen.getByRole('button', { name: 'Prüfen' }))
    }
    if (point) {
      write('Dein Schnittpunkt', pointToText(point, 'S'))
      await user.click(screen.getByRole('button', { name: 'Prüfen' }))
    } else {
      const name = task.intersection.kind === 'parallel' ? 'kein Schnittpunkt' : 'unendlich viele'
      await user.click(screen.getByRole('button', { name }))
    }
  }

  const next = async (index: number) => {
    await user.click(screen.getByRole('button', { name: index + 1 < tasks.length ? 'Nächste Aufgabe' : 'Ergebnis ansehen' }))
  }
  return { tasks, user, write, status, answerRight, next }
}

describe('IntersectionPractice', () => {
  it('starts with a task that reads the graphs: no equations, no line input', () => {
    setup()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /^Graphen von f und g/ })).toBeInTheDocument()
    expect(screen.queryByLabelText('Umformung')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'kein Schnittpunkt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'unendlich viele' })).toBeInTheDocument()
  })

  it('finishes a read task wrong with a wrong key and shows the model solution', async () => {
    const s = setup()
    const task = s.tasks[0]!
    const wrongKey = task.intersection.kind === 'parallel' ? 'unendlich viele' : 'kein Schnittpunkt'
    await s.user.click(screen.getByRole('button', { name: wrongKey }))
    expect(s.status().getByText(/Leider falsch/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
  })

  it('counts "Lösung anzeigen" as not solved', async () => {
    const s = setup()
    await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    expect(s.status().getByText(/zählt als nicht gelöst/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toBeInTheDocument()
  })

  it('shows the given equations and the line input in a calculation task', async () => {
    const s = setup()
    await s.answerRight(s.tasks[0]!, 0)
    await s.next(0)
    expect(screen.getByText('Aufgabe 2 von 10')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Deine Rechnung' })).toBeInTheDocument()
    expect(screen.getByLabelText('Umformung')).toBeInTheDocument()
    expect(screen.queryByLabelText('Lösungsmenge')).not.toBeInTheDocument()
  })

  it('accepts the model answers of a whole series and stores the result', async () => {
    const s = setup()
    for (let i = 0; i < s.tasks.length; i++) {
      await s.answerRight(s.tasks[i]!, i)
      expect(s.status().getByText('✓ Richtig!')).toBeInTheDocument()
      await s.next(i)
    }
    expect(screen.getByRole('heading', { name: 'Serie geschafft: 10 von 10 richtig' })).toHaveFocus()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').topics[TOPIC]).toEqual({
      answered: 10,
      correct: 10,
      lastSeries: { correct: 10, total: 10 },
    })
  }, 30_000)
})
