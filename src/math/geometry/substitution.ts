import { equationToText, haveSameSolutions, parseEquation, sidePolynomials } from '../equations/equation'
import type { Equation } from '../equations/types'
import { TermError, type TermErrorInfo } from '../errors'
import { formHint, type FormHint } from '../form'
import type { Rational } from '../rational'
import { attempt } from './attempt'
import { rejectTypedUnit } from './calculation'
import { DECIMAL, isLetter, numberText, variableNodes } from './formulas'
import type { Letter, Measures } from './types'

/** What the first line of a Rückwärts task must be; every `reverse` task satisfies it. */
export interface SubstitutionKey {
  /** The length asked for; the only letter left in the line. */
  unknown: Letter
  /** The given area. */
  value: Rational
  /** The known lengths. */
  measures: Measures
  /** Expected line, e.g. `12 = 6·h/2`. */
  substitution: Equation
}

export type SubstitutionCheckResult =
  /** Both sides are equivalent to the expected ones (sides may be swapped); `equation` is the line as typed. */
  | { kind: 'correct'; equation: Equation }
  /** Final: the line has another solution (wrong formula or number); `left`/`right` tell which sides match. */
  | { kind: 'wrong'; equation: Equation; left: boolean; right: boolean }
  /** Same solution, but already transformed (e.g. `h = 4`, `24 = 6h`): insert first, then solve. */
  | { kind: 'wrong-form'; hint: FormHint }
  /** Unreadable, a known length not inserted, another letter, a typed unit or the unknown missing. */
  | { kind: 'invalid'; error: TermErrorInfo }

/** Throws for every letter except the unknown, with a hint what to insert. */
function rejectLetters(input: string, equation: Equation, key: SubstitutionKey): void {
  for (const node of [...variableNodes(equation.left), ...variableNodes(equation.right)]) {
    if (node.name === key.unknown) continue
    const position = node.span?.start ?? 0
    const typed = input.charAt(position) || node.name
    const known = isLetter(node.name) ? key.measures[node.name] : undefined
    const message = known
      ? `Setze für ${node.name} die Zahl ${numberText(known)} ein.`
      : typed === 'A'
        ? `Setze für A den Flächeninhalt ${numberText(key.value)} ein.`
        : `In dieser Figur gibt es keine Größe „${typed}“.`
    throw new TermError('unknown-letter', message, position)
  }
}

/**
 * Checks the first line of a Rückwärts task (acceptance criterion 4): the
 * formula with the known numbers inserted, e.g. `12 = 6 · h : 2`. Each side
 * must be equivalent to the expected side (sides may be swapped), so
 * `12 = 3h` counts, but `h = 4` does not.
 */
export function checkSubstitution(key: SubstitutionKey, input: string): SubstitutionCheckResult {
  const read = attempt(() => {
    const equals = input.indexOf('=')
    if (equals >= 0) {
      rejectTypedUnit(input.slice(0, equals), 0)
      rejectTypedUnit(input.slice(equals + 1), equals + 1)
    }
    const equation = parseEquation(input)
    rejectLetters(input, equation, key)
    const sides = sidePolynomials(equation)
    if (!sides.left.variables().includes(key.unknown) && !sides.right.variables().includes(key.unknown)) {
      throw new TermError(
        'missing-unknown',
        `Die gesuchte Größe ${key.unknown} bleibt stehen, z. B. ${equationToText(key.substitution, DECIMAL)}.`,
        0,
        input.length,
      )
    }
    return { equation, sides }
  })
  if (!read.ok) return { kind: 'invalid', error: read.error }
  const { equation, sides } = read.value

  const expected = sidePolynomials(key.substitution)
  const straight = [sides.left.equals(expected.left), sides.right.equals(expected.right)] as const
  const swapped = [sides.left.equals(expected.right), sides.right.equals(expected.left)] as const
  if ((straight[0] && straight[1]) || (swapped[0] && swapped[1])) return { kind: 'correct', equation }
  if (haveSameSolutions(key.substitution, equation)) {
    const example = equationToText(key.substitution, DECIMAL)
    const hint = formHint('not-substituted-only')
    return { kind: 'wrong-form', hint: { ...hint, message: `${hint.message} Zum Beispiel: ${example}` } }
  }
  const count = (pair: readonly [boolean, boolean]) => Number(pair[0]) + Number(pair[1])
  const [left, right] = count(swapped) > count(straight) ? swapped : straight
  return { kind: 'wrong', equation, left, right }
}
