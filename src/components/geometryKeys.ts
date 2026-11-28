import { QUANTITY_SYMBOL, type CalculationKey, type Letter } from '../math'
import type { MathKey } from './MathInput'

const SYMBOLS: readonly MathKey[] = [
  { text: '=', label: 'Gleichheitszeichen' },
  { text: '·', label: 'Malpunkt' },
  { text: ':', label: 'Geteilt durch' },
  { text: '+', label: 'Plus' },
  { text: '(', label: 'Klammer auf' },
  { text: ')', label: 'Klammer zu' },
  { text: ',', label: 'Komma' },
]

/**
 * Keys for a calculation such as `A = g · h : 2 = 6 · 4 : 2 = 12`: the
 * quantity, the letters of the figure (including distractors such as b) and
 * the symbols. Units are chosen below the field, not typed.
 */
export function calculationKeys(key: CalculationKey): readonly MathKey[] {
  const symbol = QUANTITY_SYMBOL[key.quantity]
  return [
    { text: `${symbol} = `, display: `${symbol} =`, label: `${symbol} gleich`, wide: true },
    ...Object.keys(key.measures).map((letter) => ({ text: letter })),
    ...SYMBOLS,
  ]
}

/** Keys for the first line of a Rückwärts task, e.g. `12 = 6 · h : 2`: the length asked for and the symbols. */
export function substitutionKeys(unknown: Letter): readonly MathKey[] {
  return [{ text: unknown }, ...SYMBOLS]
}
