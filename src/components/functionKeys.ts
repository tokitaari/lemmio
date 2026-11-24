import type { MathKey } from './MathInput'

const SYMBOLS: readonly MathKey[] = [
  { text: '+', label: 'Plus' },
  { text: '−', label: 'Minus' },
  { text: '·', label: 'Malpunkt' },
  { text: '(', label: 'Klammer auf' },
  { text: ')', label: 'Klammer zu' },
]

/** Keys for a function equation such as `f(x) = −2x + 3`. */
export const FUNCTION_KEYS: readonly MathKey[] = [
  { text: 'f(x) = ', display: 'f(x) =', label: 'f von x gleich', wide: true },
  { text: 'x' },
  ...SYMBOLS,
]

/** Keys for the calculation of a Punktprobe; `x` is the inserted number, e.g. `−2` for `f(−2) =`. */
export function valueKeys(x: string): readonly MathKey[] {
  return [
    { text: `f(${x}) = `, display: `f(${x}) =`, label: `f von ${x} gleich`, wide: true },
    { text: '=', label: 'Gleichheitszeichen' },
    ...SYMBOLS,
  ]
}

/** Keys for a zero: `N(…|0)` puts the caret inside the bracket. */
export const ZERO_KEYS: readonly MathKey[] = [
  { text: 'N(|0)', display: 'N(…|0)', label: 'Nullstelle als Punkt', caretBack: 3, wide: true },
  { text: 'x = ', display: 'x =', label: 'x gleich', wide: true },
  { text: '|', label: 'Strich' },
  { text: '−', label: 'Minus' },
]
