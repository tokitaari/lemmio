import { chainToLatex, termToLatex } from './markup'
import type { Formula, FormulaGroup, SheetEntry } from './types'

/**
 * Formula sheet per topic, keyed by "area/topic" as in the catalog. Topics
 * without formulas have no entry. Every formula is checked for equivalence in
 * the content tests.
 */
export const formulaSheets: Readonly<Record<string, readonly FormulaGroup[]>> = {
  'algebra/terme': [
    {
      title: 'Ausmultiplizieren',
      formulas: [
        { id: 'distributive', name: 'Zahl oder Variable mal Summe', lhs: 'a(b+c)', rhs: 'ab+ac' },
        { id: 'sum-times-sum', name: 'Summe mal Summe', lhs: '(a+b)(c+d)', rhs: 'ac+ad+bc+bd' },
      ],
    },
    {
      title: 'Binomische Formeln',
      formulas: [
        { id: 'binomial-1', name: '1. binomische Formel', lhs: '(a+b)^2', rhs: 'a^2+2ab+b^2' },
        { id: 'binomial-2', name: '2. binomische Formel', lhs: '(a-b)^2', rhs: 'a^2-2ab+b^2' },
        { id: 'binomial-3', name: '3. binomische Formel', lhs: '(a+b)(a-b)', rhs: 'a^2-b^2' },
      ],
    },
    {
      title: 'Faktorisieren',
      formulas: [
        { id: 'common-factor', name: 'Ausklammern', lhs: 'ab+ac', rhs: 'a(b+c)' },
        { id: 'binomial-1-backwards', name: '1. binomische Formel rückwärts', lhs: 'a^2+2ab+b^2', rhs: '(a+b)^2' },
        { id: 'binomial-2-backwards', name: '2. binomische Formel rückwärts', lhs: 'a^2-2ab+b^2', rhs: '(a-b)^2' },
        { id: 'binomial-3-backwards', name: '3. binomische Formel rückwärts', lhs: 'a^2-b^2', rhs: '(a+b)(a-b)' },
      ],
    },
    {
      title: 'Rechenregeln',
      formulas: [
        { id: 'same-variable', name: 'Gleiche Variablen multiplizieren', lhs: 'a·a', rhs: 'a^2' },
        { id: 'square-product', name: 'Ein Produkt quadrieren', lhs: '(ab)^2', rhs: 'a^2b^2' },
        { id: 'sign-minus-plus', name: 'Minus mal Plus', lhs: '(-a)·b', rhs: '-ab' },
        { id: 'sign-minus-minus', name: 'Minus mal Minus', lhs: '(-a)·(-b)', rhs: 'ab' },
      ],
    },
  ],
  'algebra/lineare-gleichungen': [
    {
      title: 'Äquivalenzumformungen',
      formulas: [
        { kind: 'equivalence', id: 'equation-add', name: 'Auf beiden Seiten addieren', from: 'a = b', to: 'a + c = b + c' },
        {
          kind: 'equivalence',
          id: 'equation-subtract',
          name: 'Auf beiden Seiten subtrahieren',
          from: 'a = b',
          to: 'a - c = b - c',
        },
        {
          kind: 'equivalence',
          id: 'equation-multiply',
          name: 'Beide Seiten mit derselben Zahl multiplizieren',
          from: 'a = b',
          to: 'a·c = b·c',
          condition: 'c ≠ 0',
        },
        {
          kind: 'equivalence',
          id: 'equation-divide',
          name: 'Beide Seiten durch dieselbe Zahl teilen',
          from: 'a = b',
          to: 'a:c = b:c',
          condition: 'c ≠ 0',
        },
        { kind: 'equivalence', id: 'equation-swap', name: 'Seiten tauschen', from: 'a = b', to: 'b = a' },
      ],
    },
    {
      title: 'Klammern auflösen',
      formulas: [
        { id: 'number-times-difference', name: 'Zahl mal Differenz', lhs: 'a(b-c)', rhs: 'ab-ac' },
        { id: 'minus-before-sum', name: 'Minus vor einer Summe', lhs: '-(a+b)', rhs: '-a-b' },
        { id: 'minus-before-difference', name: 'Minus vor einer Differenz', lhs: '-(a-b)', rhs: '-a+b' },
      ],
    },
    {
      title: 'Lösungsmenge ablesen',
      formulas: [
        { kind: 'solution-set', id: 'solution-single', name: 'Genau eine Lösung', line: 'x = c', set: 'L = {c}' },
        {
          kind: 'solution-set',
          id: 'solution-empty',
          name: 'Keine Lösung: x fällt weg, eine falsche Aussage bleibt',
          line: '0 = 5',
          set: 'L = { }',
        },
        {
          kind: 'solution-set',
          id: 'solution-all',
          name: 'Unendlich viele Lösungen: x fällt weg, eine wahre Aussage bleibt',
          line: '0 = 0',
          set: 'L = ℚ',
        },
      ],
    },
  ],
  'funktionen/lineare-funktionen': [
    {
      title: 'Funktionsgleichung',
      formulas: [
        {
          kind: 'statement',
          id: 'function-equation',
          name: 'Lineare Funktion mit Steigung m und y-Achsenabschnitt n',
          latex: String.raw`f(x) = mx + n`,
        },
        {
          kind: 'statement',
          id: 'function-value',
          name: 'Funktionswert an der Stelle a',
          latex: String.raw`f(a) = m \cdot a + n`,
        },
        {
          kind: 'statement',
          id: 'point-test',
          name: 'Punktprobe',
          latex: String.raw`P(a \mid b) \text{ liegt auf dem Graphen von } f \iff f(a) = b`,
        },
      ],
    },
    {
      title: 'Steigung aus zwei Punkten',
      formulas: [
        {
          kind: 'statement',
          id: 'slope-two-points',
          name: 'Steigung der Geraden durch P(x₁|y₁) und Q(x₂|y₂)',
          latex: String.raw`m = \frac{y_2 - y_1}{x_2 - x_1}`,
          condition: String.raw`x_1 \neq x_2`,
        },
        {
          kind: 'statement',
          id: 'intercept-from-point',
          name: 'y-Achsenabschnitt aus der Steigung und einem Punkt P(x₁|y₁)',
          latex: String.raw`y_1 = m \cdot x_1 + n \iff n = y_1 - m \cdot x_1`,
        },
      ],
    },
    {
      title: 'Nullstelle',
      formulas: [
        {
          kind: 'statement',
          id: 'zero-equation',
          name: 'Nullstelle: f(x) = 0 lösen',
          latex: String.raw`f(x_0) = 0 \;\Rightarrow\; N(x_0 \mid 0)`,
        },
        {
          kind: 'statement',
          id: 'zero-none',
          name: 'Keine Nullstelle: Der Graph verläuft parallel zur x-Achse',
          latex: String.raw`m = 0,\ n \neq 0`,
        },
      ],
    },
    {
      title: 'Schnittpunkt',
      formulas: [
        {
          kind: 'statement',
          id: 'intersection-equate',
          name: 'Schnittpunkt: gleichsetzen, dann y berechnen',
          latex: String.raw`f(x_S) = g(x_S) \;\Rightarrow\; S(x_S \mid f(x_S))`,
        },
        {
          kind: 'statement',
          id: 'intersection-one',
          name: 'Genau ein Schnittpunkt: verschiedene Steigungen',
          latex: String.raw`m_f \neq m_g`,
        },
        {
          kind: 'statement',
          id: 'intersection-parallel',
          name: 'Kein Schnittpunkt: parallele Geraden',
          latex: String.raw`m_f = m_g,\ n_f \neq n_g`,
        },
        {
          kind: 'statement',
          id: 'intersection-identical',
          name: 'Unendlich viele Schnittpunkte: identische Geraden',
          latex: String.raw`m_f = m_g,\ n_f = n_g`,
        },
      ],
    },
  ],
}

/** Every entry of the formula sheet, in sheet order. */
export const allEntries: readonly SheetEntry[] = Object.values(formulaSheets).flatMap((groups) =>
  groups.flatMap((g) => g.formulas),
)

/** True for an identity `lhs = rhs` (as opposed to a rule for equations). */
export function isFormula(entry: SheetEntry): entry is Formula {
  return entry.kind === undefined || entry.kind === 'identity'
}

/** The identities of the formula sheet; the content tests check each for equivalence. */
export const allFormulas: readonly Formula[] = allEntries.filter(isFormula)

/** The formula groups of a topic; empty if the topic has none. */
export function formulaGroupsOf(areaSlug: string, topicSlug: string): readonly FormulaGroup[] {
  const key = `${areaSlug}/${topicSlug}`
  return Object.hasOwn(formulaSheets, key) ? formulaSheets[key]! : []
}

/** The entry with this id, an identity or a rule. */
export function findFormula(id: string): SheetEntry {
  const entry = allEntries.find((f) => f.id === id)
  if (!entry) throw new Error(`Unknown formula id: ${id}`)
  return entry
}

/** LaTeX for a formula, e.g. `(a + b)^{2} = a^{2} + 2ab + b^{2}`. */
export function formulaLatex(formula: Formula): string {
  return `${termToLatex(formula.lhs)} = ${termToLatex(formula.rhs)}`
}

/** Both sides of an equation in input syntax; sides may divide by a letter (`a:c`), so they are not evaluated. */
function equationLatex(source: string): string {
  const equals = source.indexOf('=')
  if (equals < 0 || source.indexOf('=', equals + 1) >= 0) throw new Error(`Not an equation: ${source}`)
  return `${termToLatex(source.slice(0, equals).trim())} = ${termToLatex(source.slice(equals + 1).trim())}`
}

/** LaTeX for `L = {c}`, `L = { }` or `L = ℚ`, written like `solutionSetToLatex`. */
export function solutionSetSourceLatex(source: string): string {
  const inner = source.replace(/^\s*L\s*=\s*/, '').trim()
  if (inner === 'ℚ') return '\\mathbb{L} = \\mathbb{Q}'
  const braces = /^\{(.*)\}$/.exec(inner)
  if (!braces) throw new Error(`Not a solution set: ${source}`)
  const element = braces[1]!.trim()
  return element === '' ? '\\mathbb{L} = \\{\\,\\}' : `\\mathbb{L} = \\{${termToLatex(element)}\\}`
}

/** LaTeX for any entry of the formula sheet. */
export function entryLatex(entry: SheetEntry): string {
  switch (entry.kind) {
    case undefined:
    case 'identity':
      return formulaLatex(entry)
    case 'equivalence': {
      const rule = `${equationLatex(entry.from)} \\iff ${equationLatex(entry.to)}`
      return entry.condition ? `${rule} \\quad (${chainToLatex(entry.condition)})` : rule
    }
    case 'solution-set':
      return `${equationLatex(entry.line)} \\;\\Rightarrow\\; ${solutionSetSourceLatex(entry.set)}`
    case 'statement':
      return entry.condition ? `${entry.latex} \\quad (${entry.condition})` : entry.latex
  }
}
