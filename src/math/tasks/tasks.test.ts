// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { allSubtopics } from '../../catalog'
import { checkAnswer } from '../check'
import { EQUATION_SUBTOPIC_IDS } from '../equations'
import { FUNCTION_SUBTOPIC_IDS } from '../functions'
import { polynomialToExpr, toPolynomial } from '../normalize'
import { parse } from '../parser'
import { Polynomial } from '../polynomial'
import { toLatex, toText } from '../printer'
import { createRng } from '../random'
import { isBinomialPattern } from './helpers'
import {
  buildBinomialFactorTask,
  buildBinomialTask,
  buildCommonFactorTask,
  buildCommonThenBinomialTask,
  buildExpandTask,
  generateSeries,
  generateTask,
  generators,
  SERIES_LENGTH,
  SUBTOPIC_IDS,
  type Task,
} from './index'

const SAMPLES = 400

function sample(topic: (typeof SUBTOPIC_IDS)[number], seed: number, count = SAMPLES): Task[] {
  const rng = createRng(seed)
  return Array.from({ length: count }, () => generators[topic](rng))
}

describe('task generators', () => {
  it('cover, together with the equation and function generators, exactly the subtopics of the app', () => {
    expect([...SUBTOPIC_IDS, ...EQUATION_SUBTOPIC_IDS, ...FUNCTION_SUBTOPIC_IDS].sort()).toEqual(
      allSubtopics().map((s) => s.id).sort(),
    )
  })

  describe.each(SUBTOPIC_IDS)('%s', (topic) => {
    const tasks = sample(topic, 2026)

    it('is deterministic for a given seed', () => {
      const a = sample(topic, 99, 20).map((t) => t.key)
      const b = sample(topic, 99, 20).map((t) => t.key)
      expect(a).toEqual(b)
    })

    it('produces a worked solution in which every step is equivalent to the prompt', () => {
      for (const task of tasks) {
        expect(task.steps.length, task.key).toBeGreaterThan(0)
        for (const step of task.steps) {
          expect(toPolynomial(step.expr).equals(task.expected), `${task.key} = ${toText(step.expr)}`).toBe(true)
        }
        expect(task.solution).toBe(task.steps[task.steps.length - 1]?.expr)
        expect(task.key).toBe(toText(task.prompt))
      }
    })

    it('accepts the printed model solution as a correct answer', () => {
      for (const task of tasks) {
        expect(checkAnswer(task, toText(task.solution)), `${task.key} → ${toText(task.solution)}`).toEqual({
          kind: 'correct',
        })
      }
    })

    it('rejects the unchanged prompt because of its form', () => {
      for (const task of tasks) {
        expect(checkAnswer(task, toText(task.prompt)).kind, task.key).toBe('wrong-form')
      }
    })

    it('prints every step in both text and LaTeX that can be read back', () => {
      for (const task of tasks.slice(0, 50)) {
        for (const expr of [task.prompt, ...task.steps.map((s) => s.expr)]) {
          expect(toPolynomial(parse(toText(expr))).equals(task.expected)).toBe(true)
          expect(toLatex(expr)).not.toMatch(/undefined|NaN/)
        }
      }
    })

    it('keeps numbers small and integral', () => {
      for (const task of tasks) {
        expect(task.expected.hasIntegerCoefficients(), task.key).toBe(true)
        for (const term of task.expected.terms()) {
          expect(Math.abs(term.coef.toNumber()), task.key).toBeLessThanOrEqual(400)
        }
        expect(task.expected.degree(), task.key).toBeLessThanOrEqual(3)
        expect(task.instruction.length).toBeGreaterThan(0)
      }
    })

    it('offers enough variety for a series without repetition', () => {
      expect(new Set(tasks.map((t) => t.key)).size).toBeGreaterThan(SERIES_LENGTH * 10)
      expect(new Set(tasks.map((t) => t.variant)).size).toBeGreaterThan(2)
    })

    it('generates series of ten without repeated tasks (acceptance criterion 3)', () => {
      for (let seed = 0; seed < 50; seed++) {
        const series = generateSeries(topic, createRng(seed))
        expect(series).toHaveLength(SERIES_LENGTH)
        expect(new Set(series.map((t) => t.key)).size).toBe(SERIES_LENGTH)
        expect(series.every((t) => t.topic === topic)).toBe(true)
      }
    })
  })

  it('avoids excluded keys', () => {
    const rng = createRng(5)
    const first = generateTask('algebra/terme/binomische-formeln', rng)
    for (let i = 0; i < 100; i++) {
      expect(generateTask('algebra/terme/binomische-formeln', rng, [first.key]).key).not.toBe(first.key)
    }
  })
})

describe('subtopic specifics', () => {
  it('multiplying out never uses binomial-formula products', () => {
    for (const task of sample('algebra/terme/ausmultiplizieren', 1)) {
      expect(task.prompt.type).toBe('mul')
      if (task.prompt.type !== 'mul') continue
      const [f, g] = task.prompt.factors.map(toPolynomial)
      expect(f && g && isBinomialPattern(f, g), task.key).toBe(false)
      expect(task.form).toEqual({ kind: 'expanded' })
    }
  })

  it('binomial tasks cover all three formulas', () => {
    const kinds = new Set(sample('algebra/terme/binomische-formeln', 2).map((t) => t.variant.split('-')[0]))
    expect(kinds).toEqual(new Set(['plus', 'minus', 'conjugate']))
  })

  it('binomial tasks reject the classic mistake (a + b)² = a² + b²', () => {
    for (const task of sample('algebra/terme/binomische-formeln', 3).filter((t) => t.variant.startsWith('plus'))) {
      const terms = task.expected.terms()
      const first = terms[0]
      const last = terms[terms.length - 1]
      if (!first || !last) throw new Error(`No terms in ${task.key}`)
      const mistake = toText(polynomialToExpr(Polynomial.fromTerms([first, last])))
      expect(checkAnswer(task, mistake).kind, `${task.key}: ${mistake}`).toBe('wrong')
    }
  })

  it('factoring tasks come in expanded form and require complete factorisation', () => {
    for (const task of sample('algebra/terme/faktorisieren', 4)) {
      expect(task.prompt.type, task.key).toBe('add')
      const commonOnly = task.variant.startsWith('common-') && !task.variant.startsWith('common-then')
      expect(task.form, task.variant).toEqual({ kind: 'factored', sumFactors: commonOnly ? 1 : 2 })
    }
  })

  it('factoring rejects a partially extracted common factor', () => {
    const tasks = sample('algebra/terme/faktorisieren', 5).filter((t) => t.variant === 'common-monomial')
    let checked = 0
    for (const task of tasks) {
      // E.g. 6x² + 9x: content 3x; taking out only 3 gives 3(2x² + 3x).
      const k = task.expected.content().terms()[0]?.coef
      if (!k || k.isOne()) continue
      const inner = task.expected.divideByMonomial(Polynomial.constant(k))
      const partial = `${k}(${toText(polynomialToExpr(inner))})`
      const result = checkAnswer(task, partial)
      expect(result.kind === 'wrong-form' && result.hint.code, `${task.key}: ${partial}`).toBe('common-factor-left')
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('factoring with a binomial formula asks to factor further after only taking out k', () => {
    const tasks = sample('algebra/terme/faktorisieren', 6).filter((t) => t.variant.startsWith('common-then-binomial'))
    expect(tasks.length).toBeGreaterThan(10)
    for (const task of tasks) {
      const first = task.steps[0]
      if (!first) throw new Error(`No steps in ${task.key}`)
      const result = checkAnswer(task, toText(first.expr))
      expect(result.kind === 'wrong-form' && result.hint.code, task.key).toBe('factor-further')
    }
  })
})

describe('task builders with fixed numbers', () => {
  const p = (s: string) => toPolynomial(parse(s))

  it('build the same kind of task as the generators', () => {
    const expand = buildExpandTask(p('x+3'), p('x-5'))
    expect([expand.topic, expand.variant, expand.key, expand.form]).toEqual([
      'algebra/terme/ausmultiplizieren',
      'example',
      '(x + 3)(x - 5)',
      { kind: 'expanded' },
    ])

    const binomial = buildBinomialTask('conjugate', { a: p('x'), b: p('5') }, true)
    expect([binomial.topic, binomial.variant, binomial.key]).toEqual(['algebra/terme/binomische-formeln', 'conjugate', '(x - 5)(x + 5)'])

    const common = buildCommonFactorTask(p('3x'), p('2x+3'))
    expect([common.topic, common.key, toText(common.solution), common.form]).toEqual([
      'algebra/terme/faktorisieren',
      '6x² + 9x',
      '3x(2x + 3)',
      { kind: 'factored', sumFactors: 1 },
    ])

    const backwards = buildBinomialFactorTask('minus', { a: p('x'), b: p('5') })
    expect([backwards.variant, backwards.key, toText(backwards.solution)]).toEqual([
      'example-minus',
      'x² - 10x + 25',
      '(x - 5)²',
    ])

    const combined = buildCommonThenBinomialTask(2, 'plus', { a: p('x'), b: p('3') })
    expect([combined.variant, combined.key, toText(combined.solution)]).toEqual([
      'common-then-binomial-plus',
      '2x² + 12x + 18',
      '2(x + 3)²',
    ])
  })
})
