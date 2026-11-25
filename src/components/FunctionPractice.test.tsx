import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createRng,
  functionToText,
  generateFunctionSeries,
  linearFunction,
  numberToText,
  valueAt,
  type FunctionTask,
} from '../math'
import { STORAGE_KEY } from '../practice/progress'
import { FUNCTION_PRACTICE_SUBTOPIC_IDS, type FunctionPracticeSubtopicId } from '../practice/functionSession'
import FunctionPractice from './FunctionPractice'

const SEED = 3
const GRAPH: FunctionPracticeSubtopicId = 'funktionen/lineare-funktionen/steigung-und-graph'
const POINT_ZERO: FunctionPracticeSubtopicId = 'funktionen/lineare-funktionen/punktprobe-nullstelle'
// A whole series answers ten tasks, some of them by moving points key by key.
const SERIES_TIMEOUT = 20_000

beforeEach(() => {
  localStorage.clear()
})

/** "x = 2, y = −3" → { x: 2, y: -3 } */
function position(slider: HTMLElement) {
  const match = /x = (−?\d+), y = (−?\d+)/.exec(slider.getAttribute('aria-valuetext') ?? '')
  if (!match) throw new Error('No position')
  const n = (s: string) => Number(s.replace('−', '-'))
  return { x: n(match[1]!), y: n(match[2]!) }
}

function setup(topic: FunctionPracticeSubtopicId = GRAPH) {
  const tasks = generateFunctionSeries(topic, createRng(SEED))
  const user = userEvent.setup()
  const view = render(<FunctionPractice topic={topic} rng={createRng(SEED)} />)
  const status = () => within(screen.getByRole('status'))
  const check = () => user.click(screen.getByRole('button', { name: 'Prüfen' }))
  const write = (label: string, text: string) => fireEvent.change(screen.getByLabelText(label), { target: { value: text } })
  const slider = (label: 'P' | 'Q') => screen.getByRole('slider', { name: `Punkt ${label}` })

  /** Moves a point with the arrow keys; it must have the focus. */
  const moveTo = async (label: 'P' | 'Q', target: { x: number; y: number }) => {
    const at = position(slider(label))
    const keys = [
      ...Array<string>(Math.abs(target.x - at.x)).fill(target.x > at.x ? '{ArrowRight}' : '{ArrowLeft}'),
      ...Array<string>(Math.abs(target.y - at.y)).fill(target.y > at.y ? '{ArrowUp}' : '{ArrowDown}'),
    ]
    if (keys.length) await user.keyboard(keys.join(''))
    expect(position(slider(label))).toEqual(target)
  }

  /** Draws the line through (0|n) and (1|m + n) with the keyboard only. */
  const draw = async (task: FunctionTask, n = task.fn.n.toNumber(), m = task.fn.m.toNumber()) => {
    await user.click(screen.getByRole('button', { name: 'Punkt setzen' }))
    expect(slider('P')).toHaveFocus()
    await moveTo('P', { x: 0, y: n })
    await user.click(screen.getByRole('button', { name: 'Punkt setzen' }))
    expect(slider('Q')).toHaveFocus()
    await moveTo('Q', { x: 1, y: m + n })
  }

  /** Answers the current task with the model answer. */
  const answerRight = async (task: FunctionTask) => {
    switch (task.kind) {
      case 'read-equation':
      case 'from-point-slope':
      case 'from-two-points':
        write('Deine Funktionsgleichung', functionToText(task.fn))
        break
      case 'draw-graph':
        await draw(task)
        break
      case 'point-test':
        write('Deine Rechnung', `f(${numberToText(task.point.x)}) = ${numberToText(task.value)}`)
        await user.click(screen.getByRole('radio', { name: task.onGraph ? /^Ja/ : /^Nein/ }))
        break
      case 'zero':
        if (task.zero.kind === 'single') write('Deine Nullstelle', `x = ${numberToText(task.zero.x)}`)
        else {
          await user.click(screen.getByRole('button', { name: 'keine Nullstelle' }))
          return
        }
        break
      case 'intersection':
        throw new Error('Not part of this practice')
    }
    await check()
  }

  const next = (i: number) =>
    user.click(screen.getByRole('button', { name: i === tasks.length - 1 ? 'Ergebnis ansehen' : 'Nächste Aufgabe' }))

  return { tasks, user, view, status, check, write, slider, draw, answerRight, next }
}

describe('function practice', () => {
  it('shows the first task of a series of ten', () => {
    const { tasks } = setup()
    expect(screen.getByRole('region', { name: 'Übung' })).toBeInTheDocument()
    expect(screen.getByText('Aufgabe 1 von 10')).toBeInTheDocument()
    expect(screen.getByText(tasks[0]!.instruction)).toBeInTheDocument()
    expect(screen.getByText('Noch keine Aufgabe gelöst.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Musterlösung' })).not.toBeInTheDocument()
  })

  it.each(FUNCTION_PRACTICE_SUBTOPIC_IDS)(
    'accepts the model answers of a whole series of %s and stores the result',
    async (topic) => {
      const s = setup(topic)
      for (let i = 0; i < s.tasks.length; i++) {
        await s.answerRight(s.tasks[i]!)
        expect(s.status().getByText('✓ Richtig!')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
        await s.next(i)
      }
      expect(screen.getByRole('heading', { name: 'Serie geschafft: 10 von 10 richtig' })).toHaveFocus()
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').topics[topic]).toEqual({
        answered: 10,
        correct: 10,
        lastSeries: { correct: 10, total: 10 },
      })
    },
    SERIES_TIMEOUT,
  )

  it('starts the next task with an empty entry and the focus on it', async () => {
    const s = setup()
    await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
    expect(s.status().getByText(/Die Aufgabe zählt als nicht gelöst/)).toBeInTheDocument()
    expect(screen.getByText('Bisher: 0 von 1 richtig.')).toBeInTheDocument()
    await s.next(0)
    const second = s.tasks[1]!
    if (second.kind === 'draw-graph') expect(screen.getByRole('button', { name: 'Punkt setzen' })).toHaveFocus()
    else expect(screen.getByLabelText('Deine Funktionsgleichung')).toHaveFocus()
    if (second.kind !== 'draw-graph') expect(screen.getByLabelText('Deine Funktionsgleichung')).toHaveValue('')
  })
})

describe('reading and typing a function equation', () => {
  /** Skips to the first task of the given kind by revealing the ones before. */
  async function skipTo(s: ReturnType<typeof setup>, kind: FunctionTask['kind']) {
    const index = s.tasks.findIndex((task) => task.kind === kind)
    expect(index).toBeGreaterThanOrEqual(0)
    for (let i = 0; i < index; i++) {
      await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
      await s.next(i)
    }
    return s.tasks[index]!
  }

  it('shows the graph without its equation and finishes a wrong answer with chips for m and n', async () => {
    const s = setup()
    const task = await skipTo(s, 'read-equation')
    const graph = screen.getByRole('group', { name: /^Graph von f/ })
    expect(within(graph).getByRole('img', { name: /^Gerade f durch die Gitterpunkte/ })).toBeInTheDocument()
    expect(within(graph).queryByRole('img', { name: /f\(x\) =/ })).not.toBeInTheDocument()

    const m = task.fn.m.toNumber()
    const n = task.fn.n.toNumber()
    s.write('Deine Funktionsgleichung', functionToText(linearFunction('f', m + 1, n)))
    await s.check()
    expect(s.status().getByText(/Das ist nicht die gesuchte Funktion/)).toBeInTheDocument()
    expect(s.status().getByText('m nicht ok')).toBeInTheDocument()
    expect(s.status().getByText('n ok')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Musterlösung' })).toHaveFocus()
    expect(screen.getByRole('group', { name: /^Graph zur Musterlösung/ })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Lösungsweg' })).toBeInTheDocument()
  })

  it('lets the learner correct unreadable input and a wrong form', async () => {
    const s = setup()
    const task = await skipTo(s, 'read-equation')
    s.write('Deine Funktionsgleichung', 'f(x) = 2x +')
    await s.check()
    expect(s.status().getByText(/Das kann ich nicht lesen/)).toBeInTheDocument()
    expect(screen.getByLabelText('Deine Funktionsgleichung')).toHaveFocus()
    s.write('Deine Funktionsgleichung', `g(x) = ${functionToText(task.fn).slice('f(x) = '.length)}`)
    await s.check()
    expect(s.status().getByText(/noch nicht in der gewünschten Form/)).toBeInTheDocument()
    s.write('Deine Funktionsgleichung', functionToText(task.fn))
    await s.check()
    expect(s.status().getByText('✓ Richtig!')).toBeInTheDocument()
    // The tasks before were skipped with "Lösung anzeigen" and count as wrong.
    const answered = s.tasks.indexOf(task) + 1
    expect(screen.getByText(`Bisher: 1 von ${answered} richtig.`)).toBeInTheDocument()
  })

  it('inserts "f(x) =" with its key', async () => {
    const s = setup()
    await skipTo(s, 'read-equation')
    const input = screen.getByLabelText('Deine Funktionsgleichung')
    act(() => input.focus())
    await s.user.click(within(screen.getByRole('group', { name: 'Mathe-Tasten' })).getByRole('button', { name: 'f von x gleich' }))
    expect(input).toHaveValue('f(x) = ')
  })

  it('draws a graph: two points are needed, a wrong line is shown in the model solution', async () => {
    const s = setup()
    const task = await skipTo(s, 'draw-graph')
    await s.check()
    expect(s.status().getByText('Setze zuerst zwei Punkte P und Q.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Punkt setzen' })).toHaveFocus()

    // n one off (towards 0, so both points stay in the window): the slope is right, the intercept is not.
    const n = task.fn.n.toNumber()
    await s.draw(task, task.fn.m.toNumber() + n >= 0 ? n - 1 : n + 1)
    expect(screen.getByRole('button', { name: 'Punkt setzen' })).toBeDisabled()
    expect(screen.getByText(/Beide Punkte sind gesetzt/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade durch P und Q' })).toBeInTheDocument()
    await s.check()
    expect(s.status().getByText(/Deine Gerade ist nicht der Graph von f/)).toBeInTheDocument()
    expect(s.status().getByText('Steigung ok')).toBeInTheDocument()
    expect(s.status().getByText('y-Achsenabschnitt nicht ok')).toBeInTheDocument()
    const solution = screen.getByRole('group', { name: /^Graph zur Musterlösung/ })
    expect(within(solution).getAllByRole('img', { name: /^Gerade/ })).toHaveLength(2)
  })

  it('asks again when the points lie on a vertical line, and can remove them', async () => {
    const s = setup()
    await skipTo(s, 'draw-graph')
    await s.user.click(screen.getByRole('button', { name: 'Punkt setzen' }))
    await s.user.click(screen.getByRole('button', { name: 'Punkt setzen' }))
    await s.user.keyboard('{ArrowUp}{ArrowLeft}') // Q from (1|0) to (0|1), above P(0|0)
    await s.check()
    expect(s.status().getByText(/senkrecht übereinander/)).toBeInTheDocument()
    expect(s.slider('P')).toHaveFocus()
    await s.user.click(screen.getByRole('button', { name: 'Punkte entfernen' }))
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })
})

describe('Punktprobe and zero', () => {
  it('needs a decision and finishes when the decision is wrong', async () => {
    const s = setup(POINT_ZERO)
    const index = s.tasks.findIndex((task) => task.kind === 'point-test')
    for (let i = 0; i < index; i++) {
      await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
      await s.next(i)
    }
    const task = s.tasks[index]!
    if (task.kind !== 'point-test') throw new Error('Expected a Punktprobe')
    const x = numberToText(task.point.x)
    s.write('Deine Rechnung', `f(${x}) = ${numberToText(valueAt(task.fn, task.point.x))}`)
    await s.check()
    expect(s.status().getByText(/Entscheide noch/)).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /^Ja/ })).toHaveFocus()
    await s.user.click(screen.getByRole('radio', { name: task.onGraph ? /^Nein/ : /^Ja/ }))
    await s.check()
    expect(s.status().getByText('Rechnung ok')).toBeInTheDocument()
    expect(s.status().getByText('Entscheidung nicht ok')).toBeInTheDocument()
    expect(screen.getByText(`Bisher: 0 von ${index + 1} richtig.`)).toBeInTheDocument()
  })

  it('finishes "keine Nullstelle" for a function with a zero as wrong', async () => {
    const s = setup(POINT_ZERO)
    const index = s.tasks.findIndex((task) => task.kind === 'zero' && task.zero.kind === 'single')
    for (let i = 0; i < index; i++) {
      await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
      await s.next(i)
    }
    await s.user.click(screen.getByRole('button', { name: 'keine Nullstelle' }))
    expect(s.status().getByText(/f hat eine Nullstelle/)).toBeInTheDocument()
    expect(s.status().getByText('Nullstelle nicht ok')).toBeInTheDocument()
  })

  it('has its own keys for a zero', async () => {
    const s = setup(POINT_ZERO)
    const index = s.tasks.findIndex((task) => task.kind === 'zero')
    for (let i = 0; i < index; i++) {
      await s.user.click(screen.getByRole('button', { name: 'Lösung anzeigen' }))
      await s.next(i)
    }
    const input = screen.getByLabelText('Deine Nullstelle')
    act(() => input.focus())
    await s.user.click(screen.getByRole('button', { name: 'Nullstelle als Punkt' }))
    await s.user.keyboard('-2')
    expect(input).toHaveValue('N(-2|0)')
  })
})

