// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import {
  ALL_SUBTOPIC_IDS,
  areEquivalent,
  checkAnswer,
  checkSolutionSet,
  checkStep,
  equalSolutionSets,
  equationToLatex,
  equationToText,
  isTermSubtopic,
  operationToLatex,
  parse,
  readEquation,
  readSolutionSet,
  solutionSetToLatex,
  solutionSetToText,
  solveEquation,
  toLatex,
  toPolynomial,
  toText,
  type Rational,
} from '../math'
import { allSubtopics, catalog } from '../catalog'
import { deckLatex, deckMarkup, deckTerms, validateDeck } from '../cards'
import {
  allEntries,
  allFormulas,
  entryLatex,
  findContent,
  findFormula,
  formulaGroupsOf,
  formulaSheets,
  subtopicContent,
} from './index'
import { chainToLatex, equationPieces, equationToLatexMarkup, splitChain, splitMarkup, termToLatex } from './markup'
import { isEquationTask, type EquivalenceRule, type SolutionSetRule, type SubtopicContent } from './types'

/** Every markup text of a topic: all texts of its cards and the example comments. */
function markupTexts(content: SubtopicContent): string[] {
  return [
    ...deckMarkup({ id: 'content', cards: content.cards }),
    ...content.examples.flatMap((e) => (e.comment ? [e.comment] : [])),
  ]
}

function mathSources(text: string): string[] {
  return splitMarkup(text).flatMap((s) => (s.kind === 'math' ? [s.source] : []))
}

function equationSources(text: string): string[] {
  return splitMarkup(text).flatMap((s) => (s.kind === 'equation' ? [s.source] : []))
}

/** Value of a term with numbers for its letters, e.g. `a:c` with a = 3, c = 2 gives 3/2. */
function valueAt(term: string, values: Readonly<Record<string, number>>): Rational | undefined {
  const source = term.replace(/[a-z]/g, (letter) => `(${values[letter] ?? Number.NaN})`)
  return toPolynomial(parse(source)).constantValue()
}

/** True if both sides of the equation have the same value for these numbers. */
function holdsAt(equation: string, values: Readonly<Record<string, number>>): boolean {
  const [left = '', right = ''] = equation.split('=')
  const l = valueAt(left, values)
  const r = valueAt(right, values)
  if (!l || !r) throw new Error(`Not a number: ${equation}`)
  return l.equals(r)
}

/** Numbers for a, b and c, with equal and different a and b; c is never 0. */
const SAMPLES = [
  { a: 3, b: 3, c: 2 },
  { a: -1, b: -1, c: 5 },
  { a: 4, b: 7, c: 2 },
  { a: -2, b: 5, c: -3 },
  { a: 0, b: 6, c: 4 },
] as const

/** KaTeX in strict mode: unknown commands or bad syntax throw. */
function renderStrict(latex: string, displayMode = false): string {
  return katex.renderToString(latex, { throwOnError: true, strict: 'error', displayMode })
}

describe('markup', () => {
  it('splits text and math segments', () => {
    expect(splitMarkup('Aus $x·x$ wird $x^2$.')).toEqual([
      { kind: 'text', text: 'Aus ' },
      { kind: 'math', source: 'x·x' },
      { kind: 'text', text: ' wird ' },
      { kind: 'math', source: 'x^2' },
      { kind: 'text', text: '.' },
    ])
  })

  it('rejects an unbalanced dollar sign', () => {
    expect(() => splitMarkup('Kosten: 5 $')).toThrow(/Unbalanced/)
  })

  it('splits chains with = and ≠', () => {
    expect(splitChain('(a+b)^2 ≠ a^2+b^2 = x')).toEqual({
      terms: ['(a+b)^2', 'a^2+b^2', 'x'],
      relations: ['≠', '='],
    })
  })

  it('prints chains with toLatex', () => {
    expect(chainToLatex('x·x ≠ 2x')).toBe('x \\cdot x \\neq 2x')
    expect(chainToLatex('(a+b)(a-b) = a^2-b^2')).toBe('(a + b)(a - b) = a^{2} - b^{2}')
  })

  it('splits off equations marked with "eq:"', () => {
    expect(splitMarkup('Löse $eq: 2x = 6$ mit $eq: | : 2$.')).toEqual([
      { kind: 'text', text: 'Löse ' },
      { kind: 'equation', source: '2x = 6' },
      { kind: 'text', text: ' mit ' },
      { kind: 'equation', source: '| : 2' },
      { kind: 'text', text: '.' },
    ])
  })

  it('prints equations, operations and solution sets with the math core', () => {
    expect(equationPieces('3x + 2 = x + 8 | - x')).toEqual(['3x + 2', '= x + 8', '\\mid\\; {-}\\, x'])
    expect(equationToLatexMarkup('2·(x+1) = 6')).toBe('2 \\cdot (x + 1) = 6')
    expect(equationToLatexMarkup('L = {3}')).toBe('\\mathbb{L} = \\{3\\}')
    expect(equationToLatexMarkup('L = { }')).toBe('\\mathbb{L} = \\{\\,\\}')
    expect(equationToLatexMarkup('L = ℚ')).toBe('\\mathbb{L} = \\mathbb{Q}')
  })

  it('rejects equation segments that cannot be read', () => {
    expect(() => equationPieces('2x + = 3')).toThrow(/Not an equation/)
    expect(() => equationPieces('2x = 6 | · x')).toThrow(/Not an allowed operation/)
    expect(() => equationPieces('L = {x}')).toThrow(/Not a solution set/)
    expect(() => equationPieces('')).toThrow(/Empty/)
  })

  it('keeps multiplication dots written in the source', () => {
    expect(chainToLatex('3·(-5) = -15')).toBe('3 \\cdot (-5) = -15')
    expect(chainToLatex('2·x·5 = 10x')).toBe('2 \\cdot x \\cdot 5 = 10x')
    expect(chainToLatex('(-a)·b = -ab')).toBe('(-a) \\cdot b = -ab')
    expect(chainToLatex('3x(2x+3)')).toBe('3x(2x + 3)')
  })
})

describe('formula sheet', () => {
  it('has unique ids', () => {
    const ids = allEntries.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(allFormulas.map((f) => [f.name, f] as const))('%s is a true identity', (_name, formula) => {
    expect(areEquivalent(parse(formula.lhs), parse(formula.rhs))).toBe(true)
  })

  it('typesets every formula and rule with KaTeX', () => {
    for (const entry of allEntries) expect(() => renderStrict(entryLatex(entry), true), entry.id).not.toThrow()
  })

  const equivalences = allEntries.filter((e): e is EquivalenceRule => e.kind === 'equivalence')
  const solutionSets = allEntries.filter((e): e is SolutionSetRule => e.kind === 'solution-set')

  it.each(equivalences.map((r) => [r.name, r] as const))('%s keeps the solutions', (_name, rule) => {
    for (const values of SAMPLES) {
      expect(holdsAt(rule.to, values), `${rule.to} with ${JSON.stringify(values)}`).toBe(holdsAt(rule.from, values))
    }
  })

  it.each(solutionSets.map((r) => [r.name, r] as const))('%s reads off the right solution set', (_name, rule) => {
    const line = readEquation(rule.line)
    expect(line.ok).toBe(true)
    if (!line.ok || /[a-z]/.test(rule.line)) return
    const set = readSolutionSet(rule.set)
    expect(set.ok && equalSolutionSets(solveEquation(line.equation)!, set.solutionSet)).toBe(true)
  })

  it('has rules for equations and the three kinds of solution sets', () => {
    expect(formulaGroupsOf('algebra', 'lineare-gleichungen').map((g) => g.title)).toEqual([
      'Äquivalenzumformungen',
      'Klammern auflösen',
      'Lösungsmenge ablesen',
    ])
    expect(solutionSets.map((r) => entryLatex(r))).toEqual([
      'x = c \\;\\Rightarrow\\; \\mathbb{L} = \\{c\\}',
      '0 = 5 \\;\\Rightarrow\\; \\mathbb{L} = \\{\\,\\}',
      '0 = 0 \\;\\Rightarrow\\; \\mathbb{L} = \\mathbb{Q}',
    ])
  })

  it('belongs to topics of the catalog', () => {
    const topicKeys = catalog.flatMap((area) => area.topics.map((topic) => `${area.slug}/${topic.slug}`))
    for (const key of Object.keys(formulaSheets)) expect(topicKeys).toContain(key)
    expect(formulaGroupsOf('algebra', 'terme').length).toBeGreaterThan(0)
    expect(formulaGroupsOf('algebra', 'gibt-es-nicht')).toEqual([])
    expect(formulaGroupsOf('toString', 'constructor')).toEqual([])
  })

  it('shows the three binomial formulas in school notation', () => {
    const latex = formulaGroupsOf('algebra', 'terme').find((g) => g.title === 'Binomische Formeln')?.formulas.map(entryLatex)
    expect(latex).toEqual([
      '(a + b)^{2} = a^{2} + 2ab + b^{2}',
      '(a - b)^{2} = a^{2} - 2ab + b^{2}',
      '(a + b)(a - b) = a^{2} - b^{2}',
    ])
  })
})

describe('topic content', () => {
  it('exists for exactly the subtopics of the app', () => {
    expect(Object.keys(subtopicContent).sort()).toEqual(allSubtopics().map((s) => s.id).sort())
    expect(findContent('gibt-es-nicht')).toBeUndefined()
    expect(findContent('toString')).toBeUndefined()
  })

  describe.each(ALL_SUBTOPIC_IDS)('%s', (topic) => {
    const content = subtopicContent[topic]

    it('has a card deck and at least one worked example', () => {
      expect(content.cards.length).toBeGreaterThan(0)
      expect(content.examples.length).toBeGreaterThan(0)
    })

    it('has a valid card deck', () => {
      expect(validateDeck({ id: topic, cards: content.cards })).toEqual([])
    })

    it('uses the card features: both kinds of questions and the interactive elements of its topic', () => {
      const cards = content.cards
      const kinds = new Set(cards.flatMap((c) => (c.widget ? [c.widget.kind] : [])))
      expect(cards.some((c) => c.question?.kind === 'choice')).toBe(true)
      expect(cards.some((c) => c.question?.kind === 'term')).toBe(true)
      if (isTermSubtopic(topic)) expect(kinds.has('area-model')).toBe(true)
      else expect([kinds.has('balance'), kinds.has('equation-steps')]).toEqual([true, true])
    })

    it('typesets the operations, intermediate lines and solution sets of its widgets', () => {
      for (const latex of deckLatex({ id: topic, cards: content.cards })) {
        expect(() => renderStrict(latex), latex).not.toThrow()
      }
    })

    it('typesets every term of its card widgets and term questions', () => {
      for (const term of deckTerms({ id: topic, cards: content.cards })) {
        expect(() => renderStrict(termToLatex(term)), term).not.toThrow()
      }
    })

    it('only references known formulas', () => {
      expect(content.formulaIds.length).toBeGreaterThan(0)
      for (const id of content.formulaIds) expect(() => findFormula(id)).not.toThrow()
    })

    it('uses terms that parse, and every "=" and "≠" in the text is true', () => {
      for (const text of markupTexts(content)) {
        for (const source of mathSources(text)) {
          const { terms, relations } = splitChain(source)
          const polys = terms.map((term) => toPolynomial(parse(term)))
          relations.forEach((rel, i) => {
            const equal = polys[i]!.equals(polys[i + 1]!)
            expect(equal, `${source} (in: ${text})`).toBe(rel === '=')
          })
        }
      }
    })

    it('typesets every text term with KaTeX', () => {
      for (const text of markupTexts(content)) {
        for (const source of mathSources(text)) expect(() => renderStrict(chainToLatex(source))).not.toThrow()
      }
    })

    it('reads every equation, operation and solution set in the text and typesets it with KaTeX', () => {
      for (const text of markupTexts(content)) {
        for (const source of equationSources(text)) {
          expect(() => renderStrict(equationToLatexMarkup(source)), `${source} (in: ${text})`).not.toThrow()
        }
      }
    })

    describe.each(content.examples.map((e) => [e.title, e] as const))('example "%s"', (_title, example) => {
      const { task } = example

      it('belongs to this subtopic', () => {
        expect(task.topic).toBe(topic)
      })

      it('has a worked solution whose result is accepted as correct', () => {
        if (isEquationTask(task)) {
          expect(task.steps.length).toBeGreaterThan(0)
          let previous = task.equation
          for (const step of task.steps) {
            const text = equationToText(step.equation)
            expect(checkStep(previous, step.operation, text).kind, text).toBe('correct')
            previous = step.equation
          }
          expect(checkSolutionSet(task, solutionSetToText(task.solutionSet))).toEqual({ kind: 'correct' })
          return
        }
        expect(task.steps.length).toBeGreaterThan(1)
        for (const step of task.steps) expect(areEquivalent(step.expr, task.prompt)).toBe(true)
        expect(checkAnswer(task, toText(task.solution))).toEqual({ kind: 'correct' })
      })

      it('typesets prompt and steps with KaTeX', () => {
        if (isEquationTask(task)) {
          const latex = [
            equationToLatex(task.equation),
            ...task.steps.flatMap((s) => [operationToLatex(s.operation), equationToLatex(s.equation)]),
            solutionSetToLatex(task.solutionSet),
          ]
          for (const l of latex) expect(() => renderStrict(l), l).not.toThrow()
          return
        }
        for (const expr of [task.prompt, ...task.steps.map((s) => s.expr)]) {
          expect(() => renderStrict(toLatex(expr))).not.toThrow()
        }
      })
    })
  })

  it('works through the planned examples', () => {
    const summary = Object.fromEntries(
      ALL_SUBTOPIC_IDS.map((topic) => [
        topic,
        subtopicContent[topic].examples.map(({ task }) =>
          isEquationTask(task)
            ? `${equationToText(task.equation)} → ${solutionSetToText(task.solutionSet)}`
            : `${toText(task.prompt)} = ${toText(task.solution)}`,
        ),
      ]),
    )
    expect(summary).toEqual({
      'algebra/terme/ausmultiplizieren': ['(x + 3)(x - 5) = x² - 2x - 15', '(2a + b)(a - 3b) = 2a² - 5ab - 3b²'],
      'algebra/terme/binomische-formeln': ['(x + 4)² = x² + 8x + 16', '(3x - 2)² = 9x² - 12x + 4', '(x + 5)(x - 5) = x² - 25'],
      'algebra/terme/faktorisieren': [
        '6x² + 9x = 3x(2x + 3)',
        'x² - 10x + 25 = (x - 5)²',
        '4x² - 9 = (2x + 3)(2x - 3)',
        '2x² + 12x + 18 = 2(x + 3)²',
      ],
      'algebra/lineare-gleichungen/umformen': ['4x + 7 = x + 19 → L = {4}', '15 = 2x + 3 → L = {6}', '3x - 4 = 5x + 6 → L = {-5}'],
      'algebra/lineare-gleichungen/klammern': ['4(x - 2) = 2x + 6 → L = {7}', '5 - (x + 1) = 2(x - 7) → L = {6}'],
      'algebra/lineare-gleichungen/sonderfaelle': [
        '2(x + 3) = 2x + 1 → L = { }',
        '4x - (x - 5) = 3x + 5 → L = ℚ',
        '5x + 3 = 2x + 3 → L = {0}',
      ],
    })
  })
})
