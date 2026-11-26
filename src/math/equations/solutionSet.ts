import { num } from '../ast'
import { TermError, toErrorInfo, type TermErrorInfo } from '../errors'
import { toPolynomial } from '../normalize'
import { toLatex, toText, type PrintOptions } from '../printer'
import { equalSolutionSets, parseAt } from './equation'
import type { SolutionSet } from './types'

const FORMAT_HINT = 'Gib die Lösungsmenge so an: L = {3}, L = { } oder L = ℚ.'

/**
 * Parses a solution set: `L = {3}`, `L = { }` or `L = ℚ` (also `Q`, `∅`).
 * The prefix `L =` is optional. The element is a number in term syntax, e.g.
 * `-3` or `1/2`.
 *
 * @throws TermError with a German message and the position of the problem.
 */
export function parseSolutionSet(input: string): SolutionSet {
  if (input.trim() === '') throw new TermError('empty', 'Bitte gib die Lösungsmenge an.', 0, 0)
  const prefix = /^\s*L\s*=/i.exec(input)
  const bodyStart = prefix ? prefix[0].length : 0
  const body = input.slice(bodyStart).trim()
  if (/^[ℚQ]$/i.test(body)) return { kind: 'all' }
  if (body === '∅') return { kind: 'empty' }
  if (body.length >= 2 && body.startsWith('{') && body.endsWith('}')) {
    const open = input.indexOf('{', bodyStart)
    const close = input.lastIndexOf('}')
    const inner = input.slice(open + 1, close)
    if (inner.trim() === '') return { kind: 'empty' }
    const value = toPolynomial(parseAt(inner, open + 1)).constantValue()
    if (value === undefined) {
      throw new TermError(
        'invalid-solution-set',
        'In die Mengenklammer gehört nur eine Zahl, z. B. L = {3}.',
        open + 1,
        close - open - 1,
      )
    }
    return { kind: 'single', value }
  }
  throw new TermError('invalid-solution-set', FORMAT_HINT, 0, input.length)
}

export type ReadSolutionSetResult =
  | { ok: true; solutionSet: SolutionSet }
  | { ok: false; error: TermErrorInfo }

/** Parses a solution set without throwing. */
export function readSolutionSet(input: string): ReadSolutionSetResult {
  try {
    return { ok: true, solutionSet: parseSolutionSet(input) }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}

/** Display text `L = {3}`, `L = { }` or `L = ℚ`; can be read back with `parseSolutionSet`. */
export function solutionSetToText(set: SolutionSet, options?: PrintOptions): string {
  switch (set.kind) {
    case 'single':
      return `L = {${toText(num(set.value), options)}}`
    case 'empty':
      return 'L = { }'
    case 'all':
      return 'L = ℚ'
  }
}

/** LaTeX for KaTeX. */
export function solutionSetToLatex(set: SolutionSet, options?: PrintOptions): string {
  switch (set.kind) {
    case 'single':
      return `\\mathbb{L} = \\{${toLatex(num(set.value), options)}\\}`
    case 'empty':
      return '\\mathbb{L} = \\{\\,\\}'
    case 'all':
      return '\\mathbb{L} = \\mathbb{Q}'
  }
}

export type SolutionSetCheckResult =
  | { kind: 'correct' }
  /** A readable solution set, but not the right one. */
  | { kind: 'wrong'; given: SolutionSet }
  /** Input could not be read as a solution set. */
  | { kind: 'invalid'; error: TermErrorInfo }

/** Checks the last line of a solution; `key` is satisfied by every EquationTask. */
export function checkSolutionSet(key: { solutionSet: SolutionSet }, input: string): SolutionSetCheckResult {
  const read = readSolutionSet(input)
  if (!read.ok) return { kind: 'invalid', error: read.error }
  return equalSolutionSets(read.solutionSet, key.solutionSet)
    ? { kind: 'correct' }
    : { kind: 'wrong', given: read.solutionSet }
}
