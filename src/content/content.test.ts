// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import {
  ALL_SUBTOPIC_IDS,
  areEquivalent,
  checkAnswer,
  checkCalculation,
  checkDrawnLine,
  checkFunction,
  checkFunctionValue,
  checkIntersection,
  checkSolutionSet,
  checkStep,
  checkSubstitution,
  checkZero,
  DECIMAL,
  functionToText,
  geometryNumberToText,
  isFunctionSubtopic,
  isGeometrySubtopic,
  equalSolutionSets,
  equationToLatex,
  equationToText,
  isTermSubtopic,
  operationToLatex,
  numberToText,
  parse,
  point,
  pointToText,
  Rational,
  readEquation,
  readSolutionSet,
  solutionSetToLatex,
  solutionSetToText,
  solveEquation,
  toLatex,
  toPolynomial,
  toText,
  valueAt as functionValueAt,
  withUnit,
  type EquationTask,
  type FunctionTask,
  type ShapeKind,
} from '../math'
import { DEFAULT_WINDOW } from '../plane'
import { allSubtopics, catalog } from '../catalog'
import { deckLatex, deckMarkup, deckTerms, validateDeck } from '../cards'
import type { CardWidget } from '../cards/types'
import {
  allEntries,
  allFormulas,
  entryLatex,
  findContent,
  findFormula,
  formulaGroupsOf,
  formulaSheets,
  functionExampleFigure,
  subtopicContent,
} from './index'
import {
  chainToLatex,
  equationPieces,
  equationToLatexMarkup,
  readFunctionSegment,
  readGeometrySegment,
  splitChain,
  splitMarkup,
  termToLatex,
} from './markup'
import {
  isEquationTask,
  isFunctionTask,
  isGeometryTask,
  type EquivalenceRule,
  type GeometryExampleTask,
  type SolutionSetRule,
  type SubtopicContent,
} from './types'

/** The card widgets that show a coordinate plane. */
const PLANE_WIDGETS: readonly CardWidget['kind'][] = [
  'line-sliders',
  'slope-triangle',
  'line-points',
  'value-table',
  'two-lines',
]

/** The card widgets about figures (geometry). */
const GEOMETRY_WIDGETS: readonly CardWidget['kind'][] = ['shape-sliders', 'shape-points', 'shear', 'decompose']

/** The figure of each geometry subtopic, by the last segment of its id. */
const SHAPE_OF: Readonly<Record<string, ShapeKind>> = {
  parallelogramm: 'parallelogram',
  dreieck: 'triangle',
  raute: 'rhombus',
  trapez: 'trapezoid',
}

/** A number with decimals, e.g. `6,5` or `6.5`. */
const DECIMAL_NUMBER = /\d[,.]\d/

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

function functionSources(text: string): string[] {
  return splitMarkup(text).flatMap((s) => (s.kind === 'function' ? [s.source] : []))
}

function geometrySources(text: string): string[] {
  return splitMarkup(text).flatMap((s) => (s.kind === 'geometry' ? [s.source] : []))
}

/** The result of a geometry example, given as the learner would, is accepted; Rückwärts tasks are solved line by line. */
function expectGeometryResultAccepted(task: GeometryExampleTask) {
  if (task.kind === 'reverse') {
    expect(checkSubstitution(task, equationToText(task.substitution, DECIMAL)).kind).toBe('correct')
    expect(task.equation.numbers).toBe('decimal')
    expectSolvedLineByLine(task.equation)
    const last = task.equation.steps.at(-1)
    // The line by line solution ends with the length asked for, e.g. `h = 4`.
    expect(last && equationToText(last.equation, DECIMAL)).toBe(`${task.unknown} = ${geometryNumberToText(task.result)}`)
    return
  }
  const { calculation } = task
  expect(checkCalculation(calculation, calculation.answer, calculation.unit).kind).toBe('correct')
}

/** Checks the worked solution of an equation line by line, including the solution set. */
function expectSolvedLineByLine(task: EquationTask) {
  // Geometry prints its equations with a decimal comma, as the learner would type them.
  const options = task.numbers === 'decimal' ? DECIMAL : undefined
  let previous = task.equation
  for (const step of task.steps) {
    const text = equationToText(step.equation, options)
    expect(checkStep(previous, step.operation, text).kind, text).toBe('correct')
    previous = step.equation
  }
  expect(checkSolutionSet(task, solutionSetToText(task.solutionSet, options))).toEqual({ kind: 'correct' })
}

/** The result of a function task, given as the learner would, is accepted. */
function expectFunctionResultAccepted(task: FunctionTask) {
  switch (task.kind) {
    case 'read-equation':
    case 'from-point-slope':
    case 'from-two-points':
      expect(checkFunction(task.fn, functionToText(task.fn))).toEqual({ kind: 'correct' })
      break
    case 'draw-graph':
      expect(checkDrawnLine(task.fn, point(0, task.fn.n), point(1, functionValueAt(task.fn, Rational.ONE)))).toEqual({
        kind: 'correct',
      })
      break
    case 'point-test': {
      const x = task.point.x
      const input = `f(${numberToText(x)}) = ${numberToText(task.value)}`
      expect(checkFunctionValue(task.fn, input, x)).toEqual({ kind: 'correct' })
      expect(task.onGraph).toBe(task.value.equals(task.point.y))
      break
    }
    case 'zero': {
      const zero = task.zero
      expect(zero.kind).not.toBe('all')
      const answer =
        zero.kind === 'single'
          ? { kind: 'input' as const, input: pointToText(point(zero.x, 0), 'N') }
          : { kind: 'none' as const }
      expect(checkZero(task, answer)).toEqual({ kind: 'correct' })
      break
    }
    case 'intersection': {
      const i = task.intersection
      const answer = i.kind === 'point' ? { kind: 'point' as const, input: pointToText(i.point, 'S') } : { kind: i.kind }
      expect(checkIntersection(task, answer)).toEqual({ kind: 'correct' })
      break
    }
  }
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

  it('splits off segments about functions marked with "fn:"', () => {
    expect(splitMarkup('Für $fn: f(x) = 2x - 1$ liegt $fn: P(2|3)$ auf dem Graphen.')).toEqual([
      { kind: 'text', text: 'Für ' },
      { kind: 'function', source: 'f(x) = 2x - 1' },
      { kind: 'text', text: ' liegt ' },
      { kind: 'function', source: 'P(2|3)' },
      { kind: 'text', text: ' auf dem Graphen.' },
    ])
  })

  it('reads function equations, function values, points and values of m and n', () => {
    expect(readFunctionSegment('f(x) = 2x - 3')).toEqual({ kind: 'function', pieces: ['f(x)', '= 2x - 3'] })
    expect(readFunctionSegment('g(x) = 2(x + 1) - 1').pieces).toEqual(['g(x)', '= 2(x + 1) - 1'])
    expect(readFunctionSegment('y = -x + 4').pieces).toEqual(['y', '= -x + 4'])
    expect(readFunctionSegment('f(2) = 2·2 - 1 = 3').pieces).toEqual(['f(2)', '= 2 \\cdot 2 - 1', '= 3'])
    expect(readFunctionSegment('f(-3)').pieces).toEqual(['f(-3)'])
    expect(readFunctionSegment('P(2|-3)')).toEqual({ kind: 'point', pieces: ['P(2 \\mid -3)'] })
    expect(readFunctionSegment('(0|4)').pieces).toEqual(['(0 \\mid 4)'])
    expect(readFunctionSegment('m = (9 - 3)/(4 - 1) = 2').pieces).toEqual(['m', '= \\frac{9 - 3}{4 - 1}', '= 2'])
    const value = readFunctionSegment('f(2) = 2·2 - 1 = 3')
    expect(value.kind === 'value' && value.values.map((v) => v.toString())).toEqual(['3', '3'])
  })

  it('rejects function segments that cannot be read', () => {
    expect(() => readFunctionSegment('f(x) = 2x + n')).toThrow(/Not a function equation/)
    expect(() => readFunctionSegment('f(2) = x')).toThrow(/Not a function value/)
    expect(() => readFunctionSegment('m = 2x')).toThrow(/Not a number/)
    expect(() => readFunctionSegment('P(2,5)')).toThrow(/Not a function equation, function value or point/)
  })

  it('splits off geometry segments marked with "geo:"', () => {
    expect(splitMarkup('Also $geo: A = g · h$.')).toEqual([
      { kind: 'text', text: 'Also ' },
      { kind: 'geometry', source: 'A = g · h' },
      { kind: 'text', text: '.' },
    ])
  })

  it('reads calculations with a quantity, decimals and a unit, and equations in a length', () => {
    expect(readGeometrySegment('A = g · h : 2 = 6,5 · 4 : 2 = 13 cm²')).toEqual({
      kind: 'calculation',
      pieces: ['A', '= \\frac{g \\cdot h}{2}', '= \\frac{6{,}5 \\cdot 4}{2}', '= 13\\,\\text{cm}^{2}'],
      values: [Rational.of(13), Rational.of(13)],
    })
    expect(readGeometrySegment('u = 2 · (a + b)').pieces).toEqual(['u', '= 2 \\cdot (a + b)'])
    expect(readGeometrySegment('h = 4 cm').pieces).toEqual(['h', '= 4\\,\\text{cm}'])
    expect(readGeometrySegment('A = (6 + 3) · 3 : 2 = 13.5 cm²').values.map((v) => v.toString())).toEqual(['27/2', '27/2'])
    const equation = readGeometrySegment('18 = 4,5h | : 4,5')
    expect(equation.kind).toBe('equation')
    expect(equation.pieces.slice(0, 2)).toEqual(['18', '= 4{,}5h'])
    expect(equation.pieces[2]).toContain('4{,}5')
  })

  it('rejects geometry segments with a wrong unit or letter', () => {
    expect(() => readGeometrySegment('A = 6 · 4 = 24 cm')).toThrow(/unit of A is cm²/)
    expect(() => readGeometrySegment('u = 16 cm²')).toThrow(/unit of u is cm/)
    expect(() => readGeometrySegment('A = x · 4')).toThrow(/Letter "x"/)
    expect(() => readGeometrySegment('h = 2 · A : g')).toThrow(/Letter "A"/)
    expect(() => readGeometrySegment('A = ')).toThrow(/Empty term/)
    expect(() => readGeometrySegment('12 = ')).toThrow(/Not a calculation or an equation/)
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

  it('has the groups of linear functions', () => {
    expect(formulaGroupsOf('funktionen', 'lineare-funktionen').map((g) => g.title)).toEqual([
      'Funktionsgleichung',
      'Steigung aus zwei Punkten',
      'Nullstelle',
      'Schnittpunkt',
    ])
    expect(entryLatex(findFormula('slope-two-points'))).toBe('m = \\frac{y_2 - y_1}{x_2 - x_1} \\quad (x_1 \\neq x_2)')
  })

  it('has the groups of geometry, typeset like the worked solutions', () => {
    expect(formulaGroupsOf('geometrie', 'vierecke-und-flaechen').map((g) => g.title)).toEqual(['Flächeninhalt', 'Umfang'])
    expect(entryLatex(findFormula('area-triangle'))).toBe('A = \\frac{g \\cdot h}{2}')
    expect(entryLatex(findFormula('area-trapezoid'))).toBe('A = \\frac{(a + c) \\cdot h}{2}')
    expect(entryLatex(findFormula('perimeter-rhombus'))).toBe('u = 4 \\cdot a')
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
      else if (isFunctionSubtopic(topic)) expect(PLANE_WIDGETS.some((kind) => kinds.has(kind))).toBe(true)
      else if (isGeometrySubtopic(topic)) {
        expect(GEOMETRY_WIDGETS.some((kind) => kinds.has(kind))).toBe(true)
        // The parallelogram is sheared to a rectangle; triangle and trapezoid are doubled, the rhombus lies in the rectangle e × f.
        const shape = SHAPE_OF[topic.split('/').at(-1)!]
        if (shape === 'parallelogram') expect(kinds.has('shear')).toBe(true)
        else expect(cards.some((c) => c.widget?.kind === 'decompose' && c.widget.shape === shape)).toBe(true)
      } else expect([kinds.has('balance'), kinds.has('equation-steps')]).toEqual([true, true])
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

    it('reads every function segment in the text, its numbers agree, and typesets it with KaTeX', () => {
      for (const text of markupTexts(content)) {
        for (const source of functionSources(text)) {
          const segment = readFunctionSegment(source)
          if (segment.kind === 'value' || segment.kind === 'assignment') {
            for (const value of segment.values) {
              expect(value.equals(segment.values[0]!), `${source} (in: ${text})`).toBe(true)
            }
          }
          expect(() => renderStrict(segment.pieces.join(' ')), `${source} (in: ${text})`).not.toThrow()
        }
      }
    })

    it('reads every geometry segment in the text, its numbers agree, and typesets it with KaTeX', () => {
      for (const text of markupTexts(content)) {
        for (const source of geometrySources(text)) {
          const segment = readGeometrySegment(source)
          for (const value of segment.values) {
            expect(value.equals(segment.values[0]!), `${source} (in: ${text})`).toBe(true)
          }
          expect(() => renderStrict(segment.pieces.join(' ')), `${source} (in: ${text})`).not.toThrow()
        }
      }
    })

    it.runIf(isGeometrySubtopic(topic))('writes decimals only in geometry segments (elsewhere they would print as fractions)', () => {
      for (const text of markupTexts(content)) {
        for (const source of [...mathSources(text), ...equationSources(text)]) {
          expect(DECIMAL_NUMBER.test(source), `${source} (in: ${text})`).toBe(false)
        }
      }
      for (const card of content.cards) {
        if (card.question?.kind === 'term') expect(DECIMAL_NUMBER.test(card.question.answer), card.id).toBe(false)
      }
    })

    describe.each(content.examples.map((e) => [e.title, e] as const))('example "%s"', (_title, example) => {
      const { task } = example

      it('belongs to this subtopic', () => {
        expect(task.topic).toBe(topic)
      })

      it.runIf(isFunctionTask(task))('draws its figure with whole numbers inside the window', () => {
        if (!isFunctionTask(task)) return
        const { lines, points } = functionExampleFigure(task)
        expect(lines.length).toBeGreaterThan(0)
        for (const line of lines) {
          expect([Number.isInteger(line.m), Number.isInteger(line.n)], line.name).toEqual([true, true])
        }
        for (const p of points) {
          expect(Number.isInteger(p.x) && Number.isInteger(p.y), p.label).toBe(true)
          expect(p.x >= DEFAULT_WINDOW.x[0] && p.x <= DEFAULT_WINDOW.x[1], p.label).toBe(true)
          expect(p.y >= DEFAULT_WINDOW.y[0] && p.y <= DEFAULT_WINDOW.y[1], p.label).toBe(true)
        }
      })

      it('has a worked solution whose result is accepted as correct', () => {
        if (isGeometryTask(task)) {
          expect(task.steps.length).toBeGreaterThan(0)
          expectGeometryResultAccepted(task)
          return
        }
        if (isFunctionTask(task)) {
          expect(task.steps.length).toBeGreaterThan(1)
          expectFunctionResultAccepted(task)
          if ('equation' in task) expectSolvedLineByLine(task.equation)
          return
        }
        if (isEquationTask(task)) {
          expect(task.steps.length).toBeGreaterThan(0)
          expectSolvedLineByLine(task)
          return
        }
        expect(task.steps.length).toBeGreaterThan(1)
        for (const step of task.steps) expect(areEquivalent(step.expr, task.prompt)).toBe(true)
        expect(checkAnswer(task, toText(task.solution))).toEqual({ kind: 'correct' })
      })

      it('typesets prompt and steps with KaTeX', () => {
        if (isGeometryTask(task)) {
          const latex = [
            ...task.steps.map((step) => step.latex),
            ...(task.kind === 'reverse'
              ? task.equation.steps.flatMap((s) => [operationToLatex(s.operation, DECIMAL), equationToLatex(s.equation, DECIMAL)])
              : []),
          ]
          for (const l of latex) expect(() => renderStrict(l), l).not.toThrow()
          return
        }
        if (isFunctionTask(task)) {
          for (const step of task.steps) expect(() => renderStrict(step.latex), step.latex).not.toThrow()
          return
        }
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
          isGeometryTask(task)
            ? task.kind === 'reverse'
              ? `reverse → ${task.unknown} = ${withUnit(task.result, task.unit)}`
              : `${task.kind} → ${withUnit(task.calculation.value, task.calculation.unit)}`
            : isFunctionTask(task)
            ? `${task.kind} → ${task.steps[task.steps.length - 1]!.text}`
            : isEquationTask(task)
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
      'funktionen/lineare-funktionen/steigung-und-graph': [
        'read-equation → f(x) = -x + 2',
        'draw-graph → f(x) = 2x - 3',
        'read-equation → f(x) = 3',
      ],
      'funktionen/lineare-funktionen/gleichung-aufstellen': [
        'from-point-slope → f(x) = -3x + 7',
        'from-two-points → f(x) = 2x + 1',
        'from-two-points → f(x) = -2x + 3',
      ],
      'funktionen/lineare-funktionen/punktprobe-nullstelle': [
        'point-test → 5 = 5',
        'point-test → -7 ≠ -4',
        'zero → N(-2|0)',
        'zero → L = { }',
      ],
      'funktionen/lineare-funktionen/schnittpunkt': [
        'intersection → S(2|5)',
        'intersection → L = { }',
        'intersection → L = ℚ',
      ],
      'geometrie/vierecke-und-flaechen/parallelogramm': ['area → 26 cm²', 'area → 15 cm²', 'perimeter → 16 cm', 'reverse → h = 4 cm'],
      'geometrie/vierecke-und-flaechen/dreieck': ['area → 12 cm²', 'area → 7,5 cm²', 'perimeter → 12 cm', 'reverse → g = 8 cm'],
      'geometrie/vierecke-und-flaechen/raute': ['area → 12 cm²', 'area → 10,5 cm²', 'perimeter → 18 cm', 'reverse → f = 6 cm'],
      'geometrie/vierecke-und-flaechen/trapez': ['area → 13,5 cm²', 'area → 18 cm²', 'perimeter → 20 cm', 'reverse → c = 4 cm'],
    })
  })
})
