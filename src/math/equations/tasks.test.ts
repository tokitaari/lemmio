// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parse } from '../parser'
import { createRng } from '../random'
import { SERIES_LENGTH, SUBTOPIC_IDS } from '../tasks'
import { checkStep } from './check'
import {
  equationForm,
  equationToLatex,
  equationToText,
  readEquation,
  sidePolynomials,
  solveEquation,
} from './equation'
import { operationToLatex, operationToText, readOperation } from './operation'
import { checkSolutionSet, solutionSetToLatex, solutionSetToText } from './solutionSet'
import {
  buildEquationTask,
  EQUATION_SUBTOPIC_IDS,
  equationGenerators,
  generateEquationSeries,
  generateEquationTask,
} from './tasks'
import type { EquationTask } from './types'

const SAMPLES = 400

type EquationTopic = (typeof EQUATION_SUBTOPIC_IDS)[number]

function sample(topic: EquationTopic, seed: number, count = SAMPLES): EquationTask[] {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => equationGenerators[topic](rng))
}

describe('equation generators', () => {
  it('cover the three subtopics of linear equations and none of the term subtopics', () => {
    expect([...EQUATION_SUBTOPIC_IDS].sort()).toEqual([
      'algebra/lineare-gleichungen/klammern',
      'algebra/lineare-gleichungen/sonderfaelle',
      'algebra/lineare-gleichungen/umformen',
    ])
    expect(EQUATION_SUBTOPIC_IDS.filter((id) => (SUBTOPIC_IDS as readonly string[]).includes(id))).toEqual([])
  })

  describe.each(EQUATION_SUBTOPIC_IDS)('%s', (topic) => {
    const tasks = sample(topic, 2026)

    it('is deterministic for a given seed', () => {
      const a = sample(topic, 99, 20).map((t) => t.key)
      const b = sample(topic, 99, 20).map((t) => t.key)
      expect(a).toEqual(b)
    })

    it('describes the task', () => {
      for (const task of tasks) {
        expect(task.topic).toBe(topic)
        expect(task.key).toBe(equationToText(task.equation))
        expect(task.instruction.length).toBeGreaterThan(0)
        expect(task.solutionNote.length).toBeGreaterThan(0)
        expect(['x', 'y', 'a']).toContain(task.variable)
      }
    })

    it('produces a worked solution in which every line passes the step check', () => {
      for (const task of tasks) {
        expect(task.steps.length, task.key).toBeGreaterThan(0)
        let line = task.equation
        for (const step of task.steps) {
          const text = equationToText(step.equation)
          const result = checkStep(line, step.operation, text)
          expect(result.kind, `${task.key}: ${operationToText(step.operation)} → ${text}`).toBe('correct')
          expect(step.note?.length, task.key).toBeGreaterThan(0)
          line = step.equation
        }
      }
    })

    it('never repeats a line in the worked solution', () => {
      for (const task of tasks) {
        const lines = [task.equation, ...task.steps.map((s) => s.equation)].map((e) => equationToText(e))
        expect(new Set(lines).size, task.key).toBe(lines.length)
      }
    })

    it('states operations that can be typed in', () => {
      for (const task of tasks) {
        for (const step of task.steps) {
          const text = operationToText(step.operation)
          const read = readOperation(text)
          expect(read.ok && operationToText(read.operation), `${task.key}: ${text}`).toBe(text)
        }
      }
    })

    it('ends with a solved line and the right solution set', () => {
      for (const task of tasks) {
        const last = task.steps[task.steps.length - 1]
        if (!last) throw new Error(`No steps in ${task.key}`)
        expect(equationForm(last.equation), task.key).toBe(
          task.solutionSet.kind === 'single' ? 'solved' : 'statement',
        )
        expect(solveEquation(task.equation), task.key).toEqual(task.solutionSet)
        expect(checkSolutionSet(task, solutionSetToText(task.solutionSet)), task.key).toEqual({ kind: 'correct' })
      }
    })

    it('keeps all numbers small and integral', () => {
      for (const task of tasks) {
        for (const equation of [task.equation, ...task.steps.map((s) => s.equation)]) {
          const { left, right } = sidePolynomials(equation)
          for (const term of [...left.terms(), ...right.terms()]) {
            expect(term.coef.isInteger(), task.key).toBe(true)
            expect(Math.abs(term.coef.toNumber()), task.key).toBeLessThanOrEqual(99)
          }
        }
        if (task.solutionSet.kind === 'single') {
          expect(task.solutionSet.value.isInteger(), task.key).toBe(true)
          expect(Math.abs(task.solutionSet.value.toNumber()), task.key).toBeLessThanOrEqual(9)
        }
      }
    })

    it('prints every line in text that can be read back and in LaTeX', () => {
      for (const task of tasks.slice(0, 50)) {
        for (const equation of [task.equation, ...task.steps.map((s) => s.equation)]) {
          const read = readEquation(equationToText(equation))
          const sides = sidePolynomials(equation)
          expect(read.ok && read.left.equals(sides.left) && read.right.equals(sides.right), task.key).toBe(true)
          expect(equationToLatex(equation)).not.toMatch(/undefined|NaN/)
        }
        for (const step of task.steps) expect(operationToLatex(step.operation)).not.toMatch(/undefined|NaN/)
        expect(solutionSetToLatex(task.solutionSet)).not.toMatch(/undefined|NaN/)
      }
    })

    it('offers enough variety for a series without repetition', () => {
      expect(new Set(tasks.map((t) => t.key)).size).toBeGreaterThan(SERIES_LENGTH * 10)
      expect(new Set(tasks.map((t) => t.variant)).size).toBeGreaterThan(2)
    })

    it('generates series of ten without repeated tasks', () => {
      for (let seed = 0; seed < 50; seed++) {
        const series = generateEquationSeries(topic, createRng(seed))
        expect(series).toHaveLength(SERIES_LENGTH)
        expect(new Set(series.map((t) => t.key)).size).toBe(SERIES_LENGTH)
        expect(series.every((t) => t.topic === topic)).toBe(true)
      }
    })
  })

  it('avoids excluded keys', () => {
    const rng = createRng(5)
    const first = generateEquationTask('algebra/lineare-gleichungen/umformen', rng)
    for (let i = 0; i < 100; i++) {
      expect(generateEquationTask('algebra/lineare-gleichungen/umformen', rng, [first.key]).key).not.toBe(first.key)
    }
  })

  it('knows no generator for other subtopics', () => {
    expect(() => generateEquationTask('algebra/terme/faktorisieren', createRng(1))).toThrow(/No equation generator/)
  })
})

describe('subtopic specifics', () => {
  it('"umformen" has no brackets and exactly one solution', () => {
    const tasks = sample('algebra/lineare-gleichungen/umformen', 1)
    for (const task of tasks) {
      expect(task.key).not.toContain('(')
      expect(task.solutionSet.kind, task.key).toBe('single')
    }
    // The model solutions use every operation, including "⇄".
    const kinds = new Set(tasks.flatMap((t) => t.steps.map((s) => s.operation.kind)))
    expect(kinds).toEqual(new Set(['add', 'subtract', 'multiply', 'divide', 'swap']))
  })

  it('"umformen" mostly has the variable on both sides', () => {
    const tasks = sample('algebra/lineare-gleichungen/umformen', 2)
    const bothSides = tasks.filter((t) => {
      const { left, right } = sidePolynomials(t.equation)
      return left.degree() === 1 && right.degree() === 1
    })
    expect(bothSides.length).toBeGreaterThan(tasks.length / 2)
  })

  it('"klammern" always has brackets, which the worked solution removes first', () => {
    for (const task of sample('algebra/lineare-gleichungen/klammern', 3)) {
      expect(task.key).toContain('(')
      expect(task.solutionSet.kind, task.key).toBe('single')
      expect(task.steps[0]?.operation.kind, task.key).toBe('simplify')
      expect(task.steps[0]?.note, task.key).toBe('Klammern auflösen.')
      expect(equationToText(task.steps[0]!.equation), task.key).not.toContain('(')
    }
  })

  it('"sonderfaelle" mixes all three kinds of solution sets, named by the variant', () => {
    const tasks = sample('algebra/lineare-gleichungen/sonderfaelle', 4)
    const count = (kind: string) => tasks.filter((t) => t.solutionSet.kind === kind).length
    expect(count('empty')).toBeGreaterThan(SAMPLES / 4)
    expect(count('all')).toBeGreaterThan(SAMPLES / 4)
    expect(count('single')).toBeGreaterThan(SAMPLES / 10)
    const kinds: Record<string, string> = { none: 'empty', all: 'all', single: 'single' }
    for (const task of tasks) {
      const expected = kinds[task.variant.split('-')[0] ?? '']
      expect(task.solutionSet.kind, `${task.key} (${task.variant})`).toBe(expected)
      // An equation whose sides are printed the same would give the answer away.
      expect(equationToText({ left: task.equation.left, right: task.equation.left }), task.key).not.toBe(task.key)
    }
  })
})

describe('buildEquationTask', () => {
  it('builds a task with fixed numbers, e.g. for worked examples', () => {
    const task = buildEquationTask('algebra/lineare-gleichungen/klammern', parse('3(x + 2)'), parse('x + 10'))
    expect([task.topic, task.variant, task.key, task.variable]).toEqual([
      'algebra/lineare-gleichungen/klammern',
      'example',
      '3(x + 2) = x + 10',
      'x',
    ])
    expect(task.steps.map((s) => `${operationToText(s.operation)} → ${equationToText(s.equation)}`)).toEqual([
      '| Term umformen → 3x + 6 = x + 10',
      '| - x → 2x + 6 = 10',
      '| - 6 → 2x = 4',
      '| : 2 → x = 2',
    ])
    expect(solutionSetToText(task.solutionSet)).toBe('L = {2}')
  })

  it('refuses equations that cannot be solved step by step', () => {
    expect(() => buildEquationTask('algebra/lineare-gleichungen/umformen', parse('x^2'), parse('4'))).toThrow(
      RangeError,
    )
  })
})
