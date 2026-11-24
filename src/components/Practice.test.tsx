import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAnswer, createRng, generateSeries, toText, type SubtopicId } from '../math'
import { STORAGE_KEY } from '../practice/progress'
import { taskVariables } from '../practice/session'
import Practice from './Practice'

const SEED = 3

beforeEach(() => {
  localStorage.clear()
})

function setup(topic: SubtopicId = 'algebra/terme/ausmultiplizieren') {
  const tasks = generateSeries(topic, createRng(SEED))
  const rng = createRng(SEED)
  const user = userEvent.setup()
  const view = render(<Practice topic={topic} rng={rng} />)
  const input = () => screen.getByLabelText('Deine Antwort')
  const answer = async (text: string) => {
    await user.clear(input())
    if (text) await user.type(input(), text)
    await user.click(screen.getByRole('button', { name: 'Prüfen' }))
  }
  const status = () => within(screen.getByRole('status'))
  return { tasks, user, view, input, answer, status }
}

const solution = (tasks: ReturnType<typeof generateSeries>, i: number) => toText(tasks[i]!.solution)

describe('practice area', () => {
  it('shows the first task of a series of ten', () => {
    const { tasks } = setup()
    expect(screen.getByRole('region', { name: 'Übung' })).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.getByText(tasks[0]!.instruction)).toBeInTheDocument()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fortschritt zurücksetzen' })).not.toBeInTheDocument()
  })

  it('accepts a correct answer, shows the model solution and counts it', async () => {
    const { tasks, answer, status } = setup()
    await answer(solution(tasks, 0))
    expect(status().getByText('✓ Richtig!')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
    const steps = within(screen.getByRole('list', { name: 'Lösungsweg' })).getAllByRole('listitem')
    expect(steps).toHaveLength(tasks[0]!.steps.length + 1)
    expect(screen.getByText('Bisher: 1 von 1 richtig.')).toBeInTheDocument()
    // Checking again is not possible; the answer stays visible.
    expect(screen.getByRole('button', { name: 'Prüfen' })).toBeDisabled()
    expect(screen.getByLabelText('Deine Antwort')).toHaveAttribute('readonly')
  })

  it('submits with Enter', async () => {
    const { tasks, user, input, status } = setup()
    await user.type(input(), `${solution(tasks, 0)}{Enter}`)
    expect(status().getByText('✓ Richtig!')).toBeInTheDocument()
  })

  it('marks a wrong answer, shows it typeset and gives the model solution', async () => {
    const { answer, status } = setup()
    await answer('0')
    expect(status().getByText(/Leider falsch/)).toBeInTheDocument()
    expect(status().getByText(/Deine Antwort:/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Lösungsweg' })).toBeInTheDocument()
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
  })

  it('shows the check as chips: equivalent and form', async () => {
    const { tasks, answer, status } = setup()
    await answer(solution(tasks, 0))
    expect(status().getByText('äquivalent')).toBeInTheDocument()
    expect(status().getByText('Form ok')).toBeInTheDocument()
  })

  it('shows a single "nicht äquivalent" chip for a wrong answer', async () => {
    const { answer, status } = setup()
    await answer('0')
    expect(status().getByText('nicht äquivalent')).toBeInTheDocument()
    expect(status().queryByText('Form ok')).not.toBeInTheDocument()
  })

  it('shows "äquivalent" but "Form nicht ok" for an equivalent term in the wrong form', async () => {
    const { tasks, answer, status } = setup()
    await answer(toText(tasks[0]!.prompt))
    expect(status().getByText('äquivalent')).toBeInTheDocument()
    expect(status().getByText('Form nicht ok')).toBeInTheDocument()
  })

  it('shows the series as a path of ten nodes and moves the marker along', async () => {
    const { tasks, user, answer } = setup()
    const nodes = () => within(screen.getByRole('list', { name: 'Fortschritt in dieser Serie' })).getAllByRole('listitem')
    expect(nodes()).toHaveLength(10)
    expect(nodes()[0]).toHaveTextContent('Aufgabe 1: aktuell')
    expect(nodes()[1]).toHaveTextContent('Aufgabe 2: offen')
    await answer(solution(tasks, 0))
    expect(nodes()[0]).toHaveTextContent('Aufgabe 1: richtig')
    await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }))
    expect(nodes()[0]).toHaveTextContent('Aufgabe 1: richtig')
    expect(nodes()[1]).toHaveTextContent('Aufgabe 2: aktuell')
  })

  it.each<SubtopicId>(['algebra/terme/ausmultiplizieren', 'algebra/terme/binomische-formeln', 'algebra/terme/faktorisieren'])(
    '%s: an equivalent term in the wrong form gets a hint and can be corrected',
    async (topic) => {
      const { tasks, answer, status, input } = setup(topic)
      const first = tasks[0]!
      const attempt = toText(first.prompt)
      const result = checkAnswer(first, attempt)
      if (result.kind !== 'wrong-form') throw new Error(`expected wrong-form, got ${result.kind}`)

      await answer(attempt)
      expect(status().getByText(/gleichwertig, aber noch nicht in der gewünschten Form/)).toBeInTheDocument()
      expect(status().getByText(result.hint.message)).toBeInTheDocument()
      // Not final: no solution yet, nothing counted, the input stays editable and focused.
      expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
      expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
      expect(input()).not.toHaveAttribute('readonly')
      expect(input()).toHaveFocus()

      await answer(solution(tasks, 0))
      expect(status().getByText('✓ Richtig!')).toBeInTheDocument()
      expect(screen.getByText('Bisher: 1 von 1 richtig.')).toBeInTheDocument()
    },
  )

  it('explains unreadable input and marks the faulty position', async () => {
    const { tasks, answer, status } = setup()
    const result = checkAnswer(tasks[0]!, 'x+')
    if (result.kind !== 'invalid') throw new Error('expected invalid')
    await answer('x+')
    expect(status().getByText(new RegExp(result.error.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument()
    const echo = status().getByText((_, el) => el?.tagName === 'CODE')
    expect(echo).toHaveTextContent('x+')
    expect(echo.querySelector('mark')).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
  })

  it('treats an empty answer as unreadable, not as wrong', async () => {
    const { answer, status } = setup()
    await answer('')
    expect(status().getByText(/Das kann ich nicht lesen/)).toBeInTheDocument()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
  })

  it('lets the learner give up: solution shown, counted as not solved', async () => {
    const { user, status } = setup()
    await user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    expect(status().getByText(/zählt als nicht gelöst/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Lösungsweg' })).toBeInTheDocument()
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
  })

  it('moves on to the next task with an empty input', async () => {
    const { tasks, user, answer, input } = setup()
    await answer(solution(tasks, 0))
    await user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }))
    expect(screen.getByText('Aufgabe 2 von 10')).toBeInTheDocument()
    expect(input()).toHaveValue('')
    expect(input()).toHaveFocus()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
  })
})

describe('math keys', () => {
  it('offers the variables of the task plus symbol keys', () => {
    const { tasks } = setup()
    const keys = within(screen.getByRole('group', { name: 'Mathe-Tasten' }))
    for (const v of taskVariables(toText(tasks[0]!.prompt))) expect(keys.getByRole('button', { name: v })).toBeInTheDocument()
    for (const name of ['Hoch zwei', 'Klammer auf', 'Klammer zu', 'Plus', 'Minus', 'Malpunkt', 'Letztes Zeichen löschen']) {
      expect(keys.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('inserts at the caret and keeps the focus in the field', async () => {
    const { user, input } = setup()
    await user.type(input(), 'xx')
    ;(input() as HTMLInputElement).setSelectionRange(1, 1)
    await user.click(screen.getByRole('button', { name: 'Hoch zwei' }))
    expect(input()).toHaveValue('x²x')
    expect(input()).toHaveFocus()
    expect((input() as HTMLInputElement).selectionStart).toBe(2)
    await user.click(screen.getByRole('button', { name: 'Klammer auf' }))
    expect(input()).toHaveValue('x²(x')
  })

  it('replaces a selection and deletes backwards', async () => {
    const { user, input } = setup()
    await user.type(input(), 'ab')
    ;(input() as HTMLInputElement).setSelectionRange(0, 2)
    await user.click(screen.getByRole('button', { name: 'Klammer auf' }))
    expect(input()).toHaveValue('(')
    await user.click(screen.getByRole('button', { name: 'Letztes Zeichen löschen' }))
    expect(input()).toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Letztes Zeichen löschen' }))
    expect(input()).toHaveValue('')
  })

  it('builds an answer that is checked like typed text', async () => {
    const { user, input, status } = setup()
    // The first task may use any variable; the keys must be enough to type a wrong but readable term.
    await user.click(screen.getByRole('button', { name: 'Klammer auf' }))
    await user.click(screen.getByRole('button', { name: 'Klammer zu' }))
    expect(input()).toHaveValue('()')
    await user.click(screen.getByRole('button', { name: 'Prüfen' }))
    expect(status().getByText(/Das kann ich nicht lesen/)).toBeInTheDocument()
  })

  it('is disabled once the task is finished', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    for (const key of within(screen.getByRole('group', { name: 'Mathe-Tasten' })).getAllByRole('button')) expect(key).toBeDisabled()
  })
})

describe('series and progress', () => {
  async function finishSeries(setupResult: ReturnType<typeof setup>, correctEvery: (i: number) => boolean) {
    const { tasks, user, answer } = setupResult
    for (let i = 0; i < tasks.length; i++) {
      await answer(correctEvery(i) ? solution(tasks, i) : '0')
      await user.click(screen.getByRole('button', { name: i === tasks.length - 1 ? 'Ergebnis ansehen' : 'Nächste Aufgabe' }))
    }
  }

  it('ends after ten tasks with a summary and stores the result', async () => {
    const s = setup('algebra/terme/binomische-formeln')
    await finishSeries(s, (i) => i < 8)
    expect(screen.getByRole('heading', { name: 'Serie geschafft: 8 von 10 richtig' })).toHaveFocus()
    const dots = within(screen.getByRole('list', { name: 'Ergebnis je Aufgabe' })).getAllByRole('listitem')
    expect(dots).toHaveLength(10)
    expect(dots[0]).toHaveTextContent('Aufgabe 1: richtig')
    expect(dots[9]).toHaveTextContent('Aufgabe 10: falsch')
    expect(screen.getByText('Bisher: 8 von 10 richtig. Letzte Serie: 8 von 10 richtig.')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').topics['algebra/terme/binomische-formeln']).toEqual({
      answered: 10,
      correct: 8,
      lastSeries: { correct: 8, total: 10 },
    })
  })

  it('starts a new series without repeating the progress', async () => {
    const s = setup()
    await finishSeries(s, () => true)
    await s.user.click(screen.getByRole('button', { name: 'Neue Serie' }))
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(s.input()).toHaveFocus()
    expect(screen.getByText('Bisher: 10 von 10 richtig. Letzte Serie: 10 von 10 richtig.')).toBeInTheDocument()
  })

  it('keeps the progress after a reload', async () => {
    const first = setup('algebra/terme/faktorisieren')
    await first.answer(solution(first.tasks, 0))
    first.view.unmount()
    render(<Practice topic="algebra/terme/faktorisieren" rng={createRng(SEED)} />)
    expect(screen.getByText('Bisher: 1 von 1 richtig.')).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
  })

  it('keeps the subtopics apart', async () => {
    const first = setup('algebra/terme/faktorisieren')
    await first.answer(solution(first.tasks, 0))
    first.view.unmount()
    render(<Practice topic="algebra/terme/ausmultiplizieren" rng={createRng(SEED)} />)
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
  })

  it('resets after confirmation and starts a new series', async () => {
    const other = { answered: 4, correct: 3, lastSeries: null }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, topics: { 'algebra/terme/faktorisieren': other } }))
    const s = setup()
    await s.answer(solution(s.tasks, 0))
    await s.user.click(screen.getByRole('button', { name: 'Nächste Aufgabe' }))
    await s.user.click(screen.getByRole('button', { name: 'Fortschritt zurücksetzen' }))

    // Cancel keeps everything.
    await s.user.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.getByText('Bisher: 1 von 1 richtig.')).toBeInTheDocument()

    await s.user.click(screen.getByRole('button', { name: 'Fortschritt zurücksetzen' }))
    await s.user.click(screen.getByRole('button', { name: 'Ja, zurücksetzen' }))
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').topics).toEqual({ 'algebra/terme/faktorisieren': other })
    expect(screen.queryByRole('button', { name: 'Fortschritt zurücksetzen' })).not.toBeInTheDocument()
  })

  it('warns when the browser cannot store the progress, and keeps working', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const { tasks, answer } = setup()
    await answer(solution(tasks, 0))
    expect(screen.getByRole('alert')).toHaveTextContent('Dein Browser erlaubt kein Speichern')
    expect(screen.getByText('Bisher: 1 von 1 richtig.')).toBeInTheDocument()
    spy.mockRestore()
  })
})
