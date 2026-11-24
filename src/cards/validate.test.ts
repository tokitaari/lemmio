// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { chainToLatex, splitChain, splitMarkup, termToLatex } from '../content/markup'
import { parse, toPolynomial } from '../math'
import { demoDeck } from '../pages/dev/demoDeck'
import type { Card, Deck } from './types'
import { deckLatex, deckMarkup, deckTerms, validateDeck } from './validate'

const deckOf = (...cards: Card[]): Deck => ({ id: 'test/deck/a', cards })
const card = (extra: Partial<Card> = {}): Card => ({ id: 'karte', title: 'Titel', body: ['Text'], ...extra })

function renderStrict(latex: string): void {
  katex.renderToString(latex, { throwOnError: true, strict: 'error' })
}

describe('validateDeck', () => {
  it('accepts a well-formed deck', () => {
    expect(validateDeck(deckOf(card()))).toEqual([])
  })

  it('reports ids, duplicates and missing texts', () => {
    const problems = validateDeck({ id: 'Bad Id', cards: [card({ id: 'a' }), card({ id: 'a', title: ' ', body: [] }), card({ id: 'B' })] })
    expect(problems).toEqual([
      'deck id "Bad Id" must be lower-case segments joined by "/"',
      'card "a": duplicate id',
      'card "a": empty title',
      'card "a": no text',
      'card "B": id must be lower case with hyphens',
    ])
    expect(validateDeck({ id: 'leer', cards: [] })).toEqual(['deck has no cards'])
  })

  it('needs exactly one correct option in a choice question', () => {
    const none = card({ question: { kind: 'choice', prompt: 'P', options: [{ text: 'a' }, { text: 'b' }] } })
    const two = card({ question: { kind: 'choice', prompt: 'P', options: [{ text: 'a', correct: true }, { text: 'b', correct: true }] } })
    const one = card({ question: { kind: 'choice', prompt: 'P', options: [{ text: 'a', correct: true }] } })
    expect(validateDeck(deckOf(none))).toEqual(['card "karte": choice: needs exactly one correct option, has 0'])
    expect(validateDeck(deckOf(two))).toEqual(['card "karte": choice: needs exactly one correct option, has 2'])
    expect(validateDeck(deckOf(one))).toEqual(['card "karte": choice: needs at least two options'])
  })

  it('needs a term question whose model answer passes its own check', () => {
    const wrongForm = card({ question: { kind: 'term', prompt: 'P', answer: '(x+1)^2', form: { kind: 'expanded' } } })
    const broken = card({ question: { kind: 'term', prompt: 'P', answer: 'x+', form: { kind: 'expanded' } } })
    const badKey = card({ question: { kind: 'term', prompt: 'P', answer: 'x', form: { kind: 'expanded' }, variables: ['xy'] } })
    expect(validateDeck(deckOf(wrongForm))).toEqual(['card "karte": term: answer "(x+1)^2" fails its own check (wrong-form)'])
    expect(validateDeck(deckOf(broken))).toEqual(['card "karte": term: answer "x+" does not parse'])
    expect(validateDeck(deckOf(badKey))).toEqual(['card "karte": term: variable key "xy" must be a single lower-case letter'])
  })

  it('needs term steps that parse and stay equivalent to the start', () => {
    const steps = card({
      widget: { kind: 'term-steps', start: '(x+1)^2', steps: [{ term: 'x^2+2x+1' }, { term: 'x^2+1' }, { term: '((' }] },
    })
    expect(validateDeck(deckOf(steps))).toEqual([
      'card "karte": term-steps: "x^2+1" is not equivalent to "(x+1)^2"',
      'card "karte": term-steps: "((" does not parse',
    ])
    expect(validateDeck(deckOf(card({ widget: { kind: 'term-steps', start: 'x', steps: [] } })))).toEqual([
      'card "karte": term-steps: no steps',
    ])
  })
})

describe('area model widget', () => {
  it('reports the problems of the area model with the card', () => {
    const area = card({ widget: { kind: 'area-model', first: ['x', 'x+1'], second: ['-x'], mode: 'expand' } })
    expect(validateDeck(deckOf(area))).toEqual([
      'card "karte": area-model: summand "x+1" must be a single term',
      'card "karte": area-model: second side needs a positive summand',
    ])
    const fine = card({ widget: { kind: 'area-model', first: ['x', '3'], second: ['x', '-5'], mode: 'expand' } })
    expect(validateDeck(deckOf(fine))).toEqual([])
  })
})

describe('balance widget', () => {
  it('reports the problems of the balance with the card', () => {
    const broken = card({ widget: { kind: 'balance', equation: '3x + 2 = x + 8', mode: 'steps', steps: ['| : 2', '| · x'] } })
    expect(validateDeck(deckOf(broken))).toEqual(['card "karte": balance: operation "| · x" cannot be used (multiply-by-term)'])
    const stuck = card({ widget: { kind: 'balance', equation: '3x + 2 = x + 8', mode: 'steps', steps: ['| : 2'] } })
    expect(validateDeck(deckOf(stuck))).toEqual(['card "karte": balance: step ": 2" does not work on 3x + 2 = x + 8 (not-divisible)'])
    const fine = card({ widget: { kind: 'balance', equation: '3x + 2 = x + 8', mode: 'steps', steps: ['| - x', '| - 2', '| : 2'] } })
    expect(validateDeck(deckOf(fine))).toEqual([])
  })
})

describe('equation steps widget', () => {
  it('reports the problems of the equation steps with the card', () => {
    const wrong = card({
      widget: { kind: 'equation-steps', start: '2x = 6', steps: [{ operation: '| : 2', equation: 'x = 2' }] },
    })
    expect(validateDeck(deckOf(wrong))).toEqual([
      'card "karte": equation-steps: "x = 2" does not follow from the line before with "| : 2" (wrong)',
    ])
  })

  it('collects the sides as terms, the notes as markup and the other LaTeX separately', () => {
    const deck = deckOf(
      card({
        widget: {
          kind: 'equation-steps',
          start: '2x = 6',
          steps: [{ operation: '| : 2', equation: 'x = 3', note: 'durch $2$ teilen' }],
          solution: 'L = {3}',
        },
      }),
    )
    expect(deckTerms(deck)).toEqual(['2x', '6', 'x', '3'])
    expect(deckMarkup(deck)).toEqual(['Text', 'durch $2$ teilen'])
    expect(deckLatex(deck)).toEqual(['2x = 6', '\\mid\\; {:}\\, 2', 'x = 3', '2x {:}\\, 2 = 6 {:}\\, 2', '\\mathbb{L} = \\{3\\}'])
    for (const latex of deckLatex(deck)) expect(() => renderStrict(latex)).not.toThrow()
  })
})

describe('line widgets', () => {
  it('reports the problems of the line widgets with the card', () => {
    const sliders = card({ widget: { kind: 'line-sliders', m: { value: 5 }, n: { value: 0 } } })
    expect(validateDeck(deckOf(sliders))).toEqual(['card "karte": line-sliders: m = 5 lies outside its range -4…4'])
    const triangle = card({ widget: { kind: 'slope-triangle', m: 0, n: 1 } })
    expect(validateDeck(deckOf(triangle))).toEqual([
      'card "karte": slope-triangle: m must not be 0 (a horizontal line has no triangle)',
    ])
    const points = card({
      widget: {
        kind: 'line-points',
        points: [
          [1, 1],
          [1, 1],
        ],
      },
    })
    expect(validateDeck(deckOf(points))).toEqual(['card "karte": line-points: P and Q must be different points'])
  })

  it('collects the start equations as LaTeX and skips broken widgets', () => {
    const deck = deckOf(
      card({ id: 'a', widget: { kind: 'line-sliders', m: { value: 2 }, n: { value: -3 } } }),
      card({ id: 'b', widget: { kind: 'slope-triangle', m: 2, n: 1 } }),
      card({
        id: 'c',
        widget: {
          kind: 'line-points',
          name: 'g',
          points: [
            [0, 1],
            [1, 2],
          ],
          table: [0],
        },
      }),
      card({ id: 'd', widget: { kind: 'slope-triangle', m: 0, n: 1 } }),
    )
    expect(deckLatex(deck)).toEqual([
      'f(x) = 2x - 3',
      'f(x) = 2x + 1',
      'm = \\frac{\\text{hoch}}{\\text{rechts}} = \\frac{2}{1} = 2',
      'g(x) = x + 1',
      '1',
    ])
    for (const latex of deckLatex(deck)) expect(() => renderStrict(latex)).not.toThrow()
    expect(deckTerms(deck)).toEqual([])
  })
})

describe('value table and two lines', () => {
  it('reports their problems with the card', () => {
    const table = card({ widget: { kind: 'value-table', m: 2, n: -3, table: [0, 6] } })
    expect(validateDeck(deckOf(table))).toEqual(['card "karte": value-table: point (6|9) lies outside the window'])
    const lines = card({ widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: '2(x + 1) - 1', vary: 'n' } })
    expect(validateDeck(deckOf(lines))).toEqual(['card "karte": two-lines: g as a term needs vary none'])
  })

  it('collects equations, values, equating and the point as LaTeX', () => {
    const deck = deckOf(
      card({ id: 'a', widget: { kind: 'value-table', m: -1, n: 2, table: [0, 1] } }),
      card({ id: 'b', widget: { kind: 'two-lines', f: { m: 2, n: 1 }, g: { m: -1, n: 7 }, equate: true } }),
      card({ id: 'c', widget: { kind: 'value-table', m: 1, n: 0, table: [9] } }),
    )
    expect(deckLatex(deck)).toEqual([
      'f(x) = -x + 2',
      '2',
      '1',
      'f(x) = 2x + 1',
      'g(x) = -x + 7',
      '2x + 1 = -x + 7',
      '\\mathbb{L} = \\{2\\}',
      'S(2 \\mid 5)',
    ])
    for (const latex of deckLatex(deck)) expect(() => renderStrict(latex)).not.toThrow()
  })
})

describe('deckTerms', () => {
  it('collects widget lines and the terms of term questions', () => {
    const terms = deckTerms(
      deckOf(
        card({ id: 'a', widget: { kind: 'term-steps', start: '(x+1)^2', steps: [{ term: 'x^2+2x+1' }] } }),
        card({ id: 'b', widget: { kind: 'area-model', first: ['x', '3'], second: ['x', '3'], mode: 'factor' } }),
        card({ id: 'c', question: { kind: 'term', prompt: 'P', term: '(x+2)(x+4)', answer: 'x^2+6x+8', form: { kind: 'expanded' } } }),
        card({ id: 'd', widget: { kind: 'area-model', first: [], second: ['x'], mode: 'expand' } }),
        card({ id: 'e', widget: { kind: 'balance', equation: '2x = 6', mode: 'steps', steps: ['| : 2'] } }),
        card({ id: 'f', widget: { kind: 'balance', equation: '2x = 6', mode: 'steps', steps: ['| : 4'] } }),
      ),
    )
    expect(terms).toEqual([
      '(x+1)^2',
      'x^2+2x+1',
      '(x + 3)^2',
      'x² + 3x + 3x + 9',
      'x² + 6x + 9',
      '3x + 3x',
      '6x',
      '(x+2)(x+4)',
      '2x',
      '6',
      'x',
      '3',
    ])
  })
})

describe('deckMarkup', () => {
  it('collects texts, notes, prompts, options, option feedback and explanations', () => {
    const texts = deckMarkup(
      deckOf(
        card({
          body: ['b1', 'b2'],
          widget: { kind: 'term-steps', start: 'x', steps: [{ term: 'x', note: 'n1' }, { term: 'x' }] },
          question: {
            kind: 'choice',
            prompt: 'p',
            options: [{ text: 'o1', feedback: 'f1' }, { text: 'o2', correct: true }],
            explanation: 'e',
          },
        }),
      ),
    )
    expect(texts).toEqual(['b1', 'b2', 'n1', 'p', 'e', 'o1', 'f1', 'o2'])
  })
})

describe('demo deck', () => {
  it('is valid', () => {
    expect(validateDeck(demoDeck)).toEqual([])
  })

  it('only makes true claims and typesets every term', () => {
    for (const text of deckMarkup(demoDeck)) {
      for (const segment of splitMarkup(text)) {
        if (segment.kind !== 'math') continue
        const { terms, relations } = splitChain(segment.source)
        const polys = terms.map((t) => toPolynomial(parse(t)))
        relations.forEach((rel, i) => expect(polys[i]!.equals(polys[i + 1]!), segment.source).toBe(rel === '='))
        expect(() => renderStrict(chainToLatex(segment.source))).not.toThrow()
      }
    }
    for (const term of deckTerms(demoDeck)) {
      expect(() => renderStrict(termToLatex(term)), term).not.toThrow()
    }
    for (const latex of deckLatex(demoDeck)) {
      expect(() => renderStrict(latex), latex).not.toThrow()
    }
  })
})
