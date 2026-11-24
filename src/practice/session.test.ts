import { describe, expect, it } from 'vitest'
import { createRng, generateSeries, toText, SUBTOPIC_IDS, type Task } from '../math'
import {
  countCorrect,
  createSession,
  currentTask,
  finishedBetween,
  isSeriesOver,
  isTaskFinished,
  nextTask,
  revealSolution,
  submitAnswer,
  taskVariables,
} from './session'

function series(topic: (typeof SUBTOPIC_IDS)[number] = 'algebra/terme/ausmultiplizieren', seed = 7): Task[] {
  return generateSeries(topic, createRng(seed))
}

const solutionOf = (task: Task) => toText(task.solution)

describe('submitAnswer', () => {
  it('finishes a task with a correct answer', () => {
    const s = createSession(series())
    const next = submitAnswer(s, solutionOf(s.tasks[0]!))
    expect(next.feedback).toEqual({ kind: 'correct' })
    expect(next.outcomes).toEqual(['correct'])
    expect(isTaskFinished(next)).toBe(true)
  })

  it('finishes a task with a wrong answer and keeps the parsed answer', () => {
    const s = createSession(series())
    const next = submitAnswer(s, '0')
    expect(next.outcomes).toEqual(['wrong'])
    expect(next.feedback).toMatchObject({ kind: 'wrong' })
    expect((next.feedback as { answer: unknown }).answer).not.toBeNull()
  })

  it.each(SUBTOPIC_IDS)('%s: an equivalent answer in the wrong form gives a hint and allows another try', (topic) => {
    const s = createSession(series(topic))
    // The task itself is equivalent to its solution but not yet in the requested form.
    const next = submitAnswer(s, toText(s.tasks[0]!.prompt))
    expect(next.feedback).toMatchObject({ kind: 'wrong-form' })
    expect(next.outcomes).toEqual([])
    expect(isTaskFinished(next)).toBe(false)
    const retry = submitAnswer(next, solutionOf(s.tasks[0]!))
    expect(retry.outcomes).toEqual(['correct'])
  })

  it('reports unreadable input with the text the positions refer to', () => {
    const s = createSession(series())
    const next = submitAnswer(s, 'x+')
    expect(next.feedback).toMatchObject({ kind: 'invalid', input: 'x+' })
    expect(next.outcomes).toEqual([])
  })

  it('treats empty input as unreadable, not as wrong', () => {
    const next = submitAnswer(createSession(series()), '   ')
    expect(next.feedback).toMatchObject({ kind: 'invalid' })
    expect(next.outcomes).toEqual([])
  })

  it('ignores further answers once the task is finished', () => {
    const s = createSession(series())
    const done = submitAnswer(s, '0')
    expect(submitAnswer(done, solutionOf(s.tasks[0]!))).toBe(done)
    expect(revealSolution(done)).toBe(done)
  })
})

describe('revealSolution', () => {
  it('counts the task as wrong', () => {
    const next = revealSolution(createSession(series()))
    expect(next.outcomes).toEqual(['wrong'])
    expect(next.feedback).toEqual({ kind: 'revealed' })
  })
})

describe('nextTask', () => {
  it('only moves on after the task is finished', () => {
    const s = createSession(series())
    expect(nextTask(s)).toBe(s)
    const moved = nextTask(revealSolution(s))
    expect(moved.index).toBe(1)
    expect(moved.feedback).toBeNull()
    expect(currentTask(moved)).toBe(s.tasks[1])
  })

  it('ends the series after the last task', () => {
    let s = createSession(series('algebra/terme/faktorisieren'))
    for (const task of s.tasks) s = nextTask(submitAnswer(s, solutionOf(task)))
    expect(isSeriesOver(s)).toBe(true)
    expect(currentTask(s)).toBeUndefined()
    expect(countCorrect(s)).toBe(10)
    expect(nextTask(s)).toBe(s)
  })
})

describe('finishedBetween', () => {
  it('reports a finished task, with the series result on the last one', () => {
    let s = createSession(series())
    const events = []
    for (const [i, task] of s.tasks.entries()) {
      const before = s
      s = submitAnswer(s, i % 2 === 0 ? solutionOf(task) : '0')
      events.push(finishedBetween(before, s))
      s = nextTask(s)
    }
    expect(events.slice(0, 9).every((e) => e !== null && e.series === undefined)).toBe(true)
    expect(events.map((e) => e?.correct)).toEqual([true, false, true, false, true, false, true, false, true, false])
    expect(events[9]?.series).toEqual({ correct: 5, total: 10 })
  })

  it('reports nothing while only a hint is shown', () => {
    const s = createSession(series())
    expect(finishedBetween(s, submitAnswer(s, 'x+'))).toBeNull()
    expect(finishedBetween(s, submitAnswer(s, toText(s.tasks[0]!.prompt)))).toBeNull()
  })
})

describe('series', () => {
  it.each(SUBTOPIC_IDS)('%s: ten tasks without a repeat', (topic) => {
    for (let seed = 1; seed <= 30; seed++) {
      const tasks = series(topic, seed)
      expect(tasks).toHaveLength(10)
      expect(new Set(tasks.map((t) => t.key)).size).toBe(10)
    }
  })
})

describe('taskVariables', () => {
  it('lists each letter once, sorted', () => {
    expect(taskVariables('(x+y)(x−y)')).toEqual(['x', 'y'])
    expect(taskVariables('(b+a)²')).toEqual(['a', 'b'])
    expect(taskVariables('12·3')).toEqual([])
  })
})
