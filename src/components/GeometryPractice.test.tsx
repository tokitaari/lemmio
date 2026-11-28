import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createRng, DECIMAL, equationToText, operationToText } from '../math'
import { generateCalculationSeries, type CalculationTask } from '../practice/geometrySession'
import { STORAGE_KEY } from '../practice/progress'
import GeometryPractice from './GeometryPractice'

const TOPIC = 'geometrie/vierecke-und-flaechen/dreieck'
const SEED = 4
/** Series tests click through ten tasks with many lines; the full parallel run needs more than 5 s. */
const SERIES_TIMEOUT = 30_000

beforeEach(() => {
  localStorage.clear()
})

function setup() {
  const tasks = generateCalculationSeries(TOPIC, createRng(SEED))
  const user = userEvent.setup()
  render(<GeometryPractice topic={TOPIC} rng={createRng(SEED)} />)
  const write = (label: string, text: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } })
  const status = () => within(screen.getByRole('status'))
  const check = () => user.click(screen.getByRole('button', { name: 'Prüfen' }))

  const answerRight = async (task: CalculationTask) => {
    if (task.kind !== 'reverse') {
      write('Deine Rechnung', task.calculation.answer)
      await user.click(screen.getByRole('radio', { name: task.calculation.unit }))
      await check()
      return
    }
    write('Formel eingesetzt', equationToText(task.substitution, DECIMAL))
    await check()
    for (const step of task.equation.steps) {
      write('Umformung', operationToText(step.operation, DECIMAL))
      write('Neue Zeile', equationToText(step.equation, DECIMAL))
      await user.click(screen.getByRole('button', { name: 'Zeile prüfen' }))
    }
    await user.click(screen.getByRole('radio', { name: task.unit }))
    await check()
  }

  const next = async (index: number) => {
    await user.click(screen.getByRole('button', { name: index + 1 < tasks.length ? 'Nächste Aufgabe' : 'Ergebnis ansehen' }))
  }
  return { tasks, user, write, status, check, answerRight, next }
}

describe('GeometryPractice', () => {
  it('starts with an area task: figure, chain and unit choice', () => {
    const s = setup()
    expect(s.tasks[0]?.kind).toBe('area')
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /^Figur zur Aufgabe\. Dreieck/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Deine Rechnung')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'cm' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'cm²' })).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'A gleich' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Komma' })).toBeInTheDocument()
  })

  it('asks for the unit, keeps the chain and moves the focus to the unit choice', async () => {
    const s = setup()
    const task = s.tasks[0]!
    if (task.kind === 'reverse') throw new Error('unexpected')
    s.write('Deine Rechnung', task.calculation.answer)
    await s.check()
    expect(s.status().getByText(/Wähle noch die Einheit/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'cm' })).toHaveFocus()
    expect(screen.getByLabelText('Deine Rechnung')).toHaveValue(task.calculation.answer)
  })

  it('finishes a wrong unit as wrong and shows the model solution', async () => {
    const s = setup()
    const task = s.tasks[0]!
    if (task.kind === 'reverse') throw new Error('unexpected')
    s.write('Deine Rechnung', task.calculation.answer)
    await s.user.click(screen.getByRole('radio', { name: 'cm' }))
    await s.check()
    expect(s.status().getByText(/Leider falsch/)).toBeInTheDocument()
    expect(s.status().getByText('Einheit nicht ok')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
    expect(screen.getByRole('img', { name: /^Figur zur Musterlösung/ })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Lösungsweg' })).toBeInTheDocument()
  })

  it('counts "Lösung anzeigen" as not solved', async () => {
    const s = setup()
    await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    expect(s.status().getByText(/zählt als nicht gelöst/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toBeInTheDocument()
  })

  it(
    'solves a Rückwärts task: fill in, lines with decimal comma, unit',
    async () => {
      const s = setup()
      const index = s.tasks.findIndex((t) => t.kind === 'reverse')
      for (let i = 0; i < index; i++) {
        await s.answerRight(s.tasks[i]!)
        await s.next(i)
      }
      const task = s.tasks[index]!
      if (task.kind !== 'reverse') throw new Error('no Rückwärts task')
      expect(screen.getByRole('img', { name: new RegExp(`^Figur zur Aufgabe\\..* ${task.unknown} gesucht`) })).toBeInTheDocument()
      expect(screen.getByLabelText('Formel eingesetzt')).toHaveFocus()
      s.write('Formel eingesetzt', equationToText(task.substitution, DECIMAL))
      await s.check()
      expect(s.status().getByText(/Richtig eingesetzt/)).toBeInTheDocument()
      expect(screen.getByLabelText('Umformung')).toHaveFocus()
      expect(screen.getByRole('list', { name: 'Deine Rechnung' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Lösungsmenge')).not.toBeInTheDocument()
      for (const step of task.equation.steps) {
        s.write('Umformung', operationToText(step.operation, DECIMAL))
        s.write('Neue Zeile', equationToText(step.equation, DECIMAL))
        await s.user.click(screen.getByRole('button', { name: 'Zeile prüfen' }))
      }
      expect(s.status().getByText(new RegExp(`${task.unknown} steht allein`))).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'cm' })).toHaveFocus()
      await s.user.click(screen.getByRole('radio', { name: 'cm' }))
      await s.check()
      expect(s.status().getByText('✓ Richtig!')).toBeInTheDocument()
    },
    SERIES_TIMEOUT,
  )

  it(
    'accepts the model answers of a whole series and stores the result',
    async () => {
      const s = setup()
      for (let i = 0; i < s.tasks.length; i++) {
        await s.answerRight(s.tasks[i]!)
        expect(s.status().getByText('✓ Richtig!')).toBeInTheDocument()
        await s.next(i)
      }
      expect(screen.getByRole('heading', { name: 'Serie geschafft: 10 von 10 richtig' })).toHaveFocus()
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').topics[TOPIC]).toEqual({
        answered: 10,
        correct: 10,
        lastSeries: { correct: 10, total: 10 },
      })
    },
    SERIES_TIMEOUT,
  )
})
