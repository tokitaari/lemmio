import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRng,
  equationToText,
  generateEquationSeries,
  operationToText,
  solutionSetToText,
  type EquationTask,
  type EquationSubtopicId,
} from '../math'
import { STORAGE_KEY } from '../practice/progress'
import EquationPractice from './EquationPractice'

const SEED = 3
const TOPIC: EquationSubtopicId = 'algebra/lineare-gleichungen/umformen'

beforeEach(() => {
  localStorage.clear()
})

function setup(topic: EquationSubtopicId = TOPIC) {
  const tasks = generateEquationSeries(topic, createRng(SEED))
  const user = userEvent.setup()
  const view = render(<EquationPractice topic={topic} rng={createRng(SEED)} />)
  const field = (name: string) => screen.getByLabelText(name) as HTMLInputElement
  // Sets a whole field at once; typing every character would make the long solutions slow.
  const write = (name: string, text: string) => fireEvent.change(field(name), { target: { value: text } })
  const line = async (operation: string, equation: string) => {
    write('Umformung', operation)
    write('Neue Zeile', equation)
    await user.click(screen.getByRole('button', { name: 'Zeile prüfen' }))
  }
  const solutionSet = async (text: string) => {
    write('Lösungsmenge', text)
    await user.click(screen.getByRole('button', { name: 'Lösungsmenge prüfen' }))
  }
  /** Enters the model solution line by line, up to but not including the solution set. */
  const solveLines = async (task: EquationTask) => {
    for (const step of task.steps) await line(operationToText(step.operation), equationToText(step.equation))
  }
  const status = () => within(screen.getByRole('status'))
  const work = () => within(screen.getByRole('list', { name: 'Deine Rechnung' }))
  return { tasks, user, view, field, write, line, solutionSet, solveLines, status, work }
}

describe('equation practice', () => {
  it('shows the first equation of a series of ten with the three fields', () => {
    const { tasks, field, work } = setup()
    expect(screen.getByRole('region', { name: 'Übung' })).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.getByText(tasks[0]!.instruction)).toBeInTheDocument()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(work().getAllByRole('listitem')).toHaveLength(1)
    for (const name of ['Umformung', 'Neue Zeile', 'Lösungsmenge']) expect(field(name)).toHaveValue('')
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
  })

  it('accepts the model solution line by line, then the solution set, and counts the task', async () => {
    const { tasks, solveLines, solutionSet, status, work } = setup()
    const task = tasks[0]!

    await solveLines(task)
    expect(status().getByText('✓ Die Zeile stimmt.')).toBeInTheDocument()
    expect(work().getAllByRole('listitem')).toHaveLength(task.steps.length + 1)
    expect(work().getAllByText('Umformung ok')).toHaveLength(task.steps.length)
    expect(work().getAllByText('beide Seiten ok')).toHaveLength(task.steps.length)
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()

    await solutionSet(solutionSetToText(task.solutionSet))
    expect(status().getByText(/✓ Richtig!/)).toBeInTheDocument()
    expect(work().getAllByRole('listitem')).toHaveLength(task.steps.length + 2)
    expect(work().getByText('Lösungsmenge ok')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
    expect(within(screen.getByRole('list', { name: 'Lösungsweg' })).getAllByRole('listitem')).toHaveLength(task.steps.length + 2)
    expect(screen.getByText('Bisher: 1 von 1 richtig.')).toBeInTheDocument()
    // The entry is gone; the learner moves on with the button.
    expect(screen.queryByRole('button', { name: 'Zeile prüfen' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nächste Aufgabe' })).toBeInTheDocument()
  })

  it('clears the fields after an accepted line and moves the focus to the operation', async () => {
    const { tasks, line, field } = setup()
    const step = tasks[0]!.steps[0]!
    await line(operationToText(step.operation), equationToText(step.equation))
    expect(field('Umformung')).toHaveValue('')
    expect(field('Neue Zeile')).toHaveValue('')
    expect(field('Umformung')).toHaveFocus()
  })

  it('marks a line that does not follow from the operation and keeps it for a correction', async () => {
    const { tasks, line, field, status, work } = setup()
    const given = equationToText(tasks[0]!.equation)
    // "+ 1" applied to the given equation can never give the equation itself.
    await line('| + 1', given)

    expect(status().getByText(/passt nicht zur Umformung/)).toBeInTheDocument()
    expect(status().getByText('Umformung ok')).toBeInTheDocument()
    expect(status().getByText('linke Seite nicht ok')).toBeInTheDocument()
    expect(status().getByText('rechte Seite nicht ok')).toBeInTheDocument()
    // The same equation has the same solutions, only not because of "+ 1".
    expect(status().getByText(/dieselben Lösungen wie die davor/)).toBeInTheDocument()
    // Not final: nothing counted, no line added, the entry stays editable and focused.
    expect(work().getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(field('Neue Zeile')).toHaveValue(given)
    expect(field('Neue Zeile')).toHaveFocus()
  })

  it('rejects an operation with a term as not allowed and keeps the task open', async () => {
    const { line, field, status, work } = setup()
    await line('| · x', 'x = 1')
    expect(status().getByText(/Diese Umformung ist nicht erlaubt/)).toBeInTheDocument()
    expect(status().getByText(/Multipliziere nur mit einer Zahl/)).toBeInTheDocument()
    expect(status().getByText('Umformung nicht ok')).toBeInTheDocument()
    expect(work().getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(field('Umformung')).toHaveFocus()
  })

  it('explains unreadable input and marks the faulty position', async () => {
    const { line, field, status } = setup()

    await line('3', 'x = 1')
    expect(status().getByText(/Die Umformung kann ich nicht lesen/)).toBeInTheDocument()
    const echo = status().getByText((_, el) => el?.tagName === 'CODE')
    expect(echo).toHaveTextContent('3')
    expect(echo.querySelector('mark')).not.toBeNull()
    expect(field('Umformung')).toHaveFocus()

    await line('| + 1', 'x =')
    expect(status().getByText(/Die Zeile kann ich nicht lesen/)).toBeInTheDocument()
    expect(field('Neue Zeile')).toHaveFocus()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
  })

  it('asks the learner to keep transforming before the solution set is given', async () => {
    const { solutionSet, field, status } = setup()
    await solutionSet('L = { }')
    expect(status().getByText(/Noch nicht fertig/)).toBeInTheDocument()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
    expect(field('Umformung')).toHaveFocus()
  })

  it('counts a wrong solution set as wrong and shows it as the last line', async () => {
    const { tasks, solveLines, solutionSet, status, work } = setup()
    const task = tasks[0]!
    await solveLines(task)
    await solutionSet(task.solutionSet.kind === 'all' ? 'L = { }' : 'L = ℚ')

    expect(status().getByText(/Leider falsch/)).toBeInTheDocument()
    expect(work().getByText('Lösungsmenge nicht ok')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
  })

  it('asks again for an unreadable solution set', async () => {
    const { tasks, solveLines, solutionSet, field, status } = setup()
    const task = tasks[0]!
    await solveLines(task)
    await solutionSet('L = 3')
    expect(status().getByText(/Die Lösungsmenge kann ich nicht lesen/)).toBeInTheDocument()
    expect(field('Lösungsmenge')).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()

    await solutionSet(solutionSetToText(task.solutionSet))
    expect(status().getByText(/✓ Richtig!/)).toBeInTheDocument()
  })

  it('lets the learner give up: solution shown, counted as not solved', async () => {
    const { user, status } = setup()
    await user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    expect(status().getByText(/zählt als nicht gelöst/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Lösungsweg' })).toBeInTheDocument()
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zeile prüfen' })).not.toBeInTheDocument()
  })

  it('moves on to the next equation with empty fields and the focus in the operation', async () => {
    const { user, field } = setup()
    await user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }))
    expect(screen.getByText('Aufgabe 2 von 10')).toBeInTheDocument()
    expect(field('Umformung')).toHaveValue('')
    expect(field('Umformung')).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
  })
})

describe('math keys of the equation practice', () => {
  const keys = () => within(screen.getByRole('group', { name: 'Mathe-Tasten' }))

  it('offers keys for the operation first, including "Term umformen" and "⇄"', async () => {
    const { tasks, user, field } = setup()
    for (const name of ['Strich', 'Plus', 'Minus', 'Term umformen', 'Seiten tauschen', 'Letztes Zeichen löschen']) {
      expect(keys().getByRole('button', { name })).toBeInTheDocument()
    }
    expect(keys().getByRole('button', { name: tasks[0]!.variable })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Leere Menge' })).not.toBeInTheDocument()

    // Complete operations replace the field; the focus stays in it.
    await user.click(keys().getByRole('button', { name: 'Term umformen' }))
    expect(field('Umformung')).toHaveValue('| Term umformen')
    await user.click(keys().getByRole('button', { name: 'Seiten tauschen' }))
    expect(field('Umformung')).toHaveValue('| ⇄')
    expect(field('Umformung')).toHaveFocus()
  })

  it('inserts at the caret and deletes backwards', async () => {
    const { user, field } = setup()
    await user.click(keys().getByRole('button', { name: 'Strich' }))
    await user.click(keys().getByRole('button', { name: 'Minus' }))
    expect(field('Umformung')).toHaveValue('|−')
    expect(field('Umformung').selectionStart).toBe(2)
    field('Umformung').setSelectionRange(1, 1)
    await user.click(keys().getByRole('button', { name: 'Plus' }))
    expect(field('Umformung')).toHaveValue('|+−')
    await user.click(keys().getByRole('button', { name: 'Letztes Zeichen löschen' }))
    expect(field('Umformung')).toHaveValue('|−')
  })

  it('follows the field that has the focus', async () => {
    const { tasks, user, field } = setup()
    const variable = tasks[0]!.variable

    await user.click(field('Neue Zeile'))
    expect(screen.queryByRole('button', { name: 'Strich' })).not.toBeInTheDocument()
    await user.click(keys().getByRole('button', { name: variable }))
    await user.click(keys().getByRole('button', { name: 'Gleichheitszeichen' }))
    expect(field('Neue Zeile')).toHaveValue(`${variable}=`)
    expect(field('Umformung')).toHaveValue('')

    await user.click(field('Lösungsmenge'))
    await user.click(keys().getByRole('button', { name: 'Lösungsmenge mit einer Zahl' }))
    expect(field('Lösungsmenge')).toHaveValue('L = {}')
    // The caret sits between the braces.
    await user.click(keys().getByRole('button', { name: 'Minus' }))
    expect(field('Lösungsmenge')).toHaveValue('L = {−}')
    await user.click(keys().getByRole('button', { name: 'Leere Menge' }))
    expect(field('Lösungsmenge')).toHaveValue('L = { }')
    await user.click(keys().getByRole('button', { name: 'Alle rationalen Zahlen' }))
    expect(field('Lösungsmenge')).toHaveValue('L = ℚ')
  })

  it('builds a solution step that is checked like typed text', async () => {
    const { user, field, status } = setup()
    await user.click(keys().getByRole('button', { name: 'Term umformen' }))
    await user.click(field('Neue Zeile'))
    await user.click(keys().getByRole('button', { name: 'Gleichheitszeichen' }))
    await user.click(screen.getByRole('button', { name: 'Zeile prüfen' }))
    expect(status().getByText(/Die Zeile kann ich nicht lesen/)).toBeInTheDocument()
  })
})

describe('series and progress of the equation practice', () => {
  it('ends after ten equations with a summary and stores the result', async () => {
    const { tasks, user, solveLines, solutionSet } = setup()
    await solveLines(tasks[0]!)
    await solutionSet(solutionSetToText(tasks[0]!.solutionSet))
    await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }))
    for (let i = 1; i < tasks.length; i++) {
      await user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
      await user.click(screen.getByRole('button', { name: i === tasks.length - 1 ? 'Ergebnis ansehen' : 'Nächste Aufgabe' }))
    }

    expect(screen.getByRole('heading', { name: 'Serie geschafft: 1 von 10 richtig' })).toHaveFocus()
    const dots = within(screen.getByRole('list', { name: 'Ergebnis je Aufgabe' })).getAllByRole('listitem')
    expect(dots).toHaveLength(10)
    expect(dots[0]).toHaveTextContent('Aufgabe 1: richtig')
    expect(dots[9]).toHaveTextContent('Aufgabe 10: falsch')
    expect(screen.getByText('Bisher: 1 von 10 richtig. Letzte Serie: 1 von 10 richtig.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').topics[TOPIC]).toEqual({
      answered: 10,
      correct: 1,
      lastSeries: { correct: 1, total: 10 },
    })

    await user.click(screen.getByRole('button', { name: 'Neue Serie' }))
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.getByLabelText('Umformung')).toHaveFocus()
  }, 20_000)

  it('keeps the progress after a reload, apart from the other subtopics', async () => {
    const first = setup('algebra/lineare-gleichungen/klammern')
    await first.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    first.view.unmount()

    const again = render(<EquationPractice topic="algebra/lineare-gleichungen/klammern" rng={createRng(SEED)} />)
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    again.unmount()

    render(<EquationPractice topic="algebra/lineare-gleichungen/sonderfaelle" rng={createRng(SEED)} />)
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
  })
})
