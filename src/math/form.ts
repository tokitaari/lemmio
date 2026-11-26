import { unwrapGroups, type Expr } from './ast'
import { toPolynomial } from './normalize'
import { monomialKey } from './polynomial'

/** Why an equivalent answer is not yet in the requested form. */
export type FormHintCode =
  | 'has-brackets'
  | 'unevaluated-power'
  | 'unevaluated-number'
  | 'repeated-variable'
  | 'like-terms'
  | 'zero-term'
  | 'not-a-product'
  | 'inner-not-simplified'
  | 'common-factor-left'
  | 'factor-further'
  // Linear functions (src/math/functions)
  | 'wrong-name'
  | 'unevaluated-coordinate'
  | 'unevaluated-value'
  // Geometry (src/math/geometry)
  | 'missing-quantity'
  | 'wrong-quantity'
  | 'unevaluated-result'
  | 'decimal-result'
  | 'missing-calculation'
  | 'not-substituted-only'

export interface FormHint {
  code: FormHintCode
  /** German hint for the learner. */
  message: string
}

/**
 * The form a correct answer must have:
 * - `expanded`: a sum of simplified monomials with like terms combined
 *   (order is free), e.g. `x² + 6x + 9`.
 * - `factored`: a product whose bracket factors are simplified and primitive
 *   (nothing left to factor out), with at least `sumFactors` bracket factors
 *   counted with multiplicity, e.g. `(x + 3)²` counts 2.
 */
export type FormRequirement = { kind: 'expanded' } | { kind: 'factored'; sumFactors: number }

const MESSAGES: Record<FormHintCode, string> = {
  'has-brackets': 'Da stehen noch Klammern. Multipliziere sie aus.',
  'unevaluated-power': 'Berechne die Potenz, z. B. (2x)² = 4x².',
  'unevaluated-number': 'Rechne die Zahlen aus, z. B. 2·3x = 6x.',
  'repeated-variable': 'Schreibe gleiche Variablen als Potenz, z. B. x·x = x².',
  'like-terms': 'Fasse gleichartige Terme zusammen, z. B. 2x + 3x = 5x.',
  'zero-term': 'Lass Summanden weg, die 0 ergeben.',
  'not-a-product': 'Schreibe den Term als Produkt, z. B. 3x(2x + 3) oder (x + 3)².',
  'inner-not-simplified': 'Vereinfache den Term in der Klammer.',
  'common-factor-left': 'In einer Klammer steckt noch ein gemeinsamer Faktor. Klammere ihn aus.',
  'factor-further': 'Das lässt sich noch weiter zerlegen. Erkennst du eine binomische Formel?',
  'wrong-name': 'Achte auf den Namen der Funktion.',
  'unevaluated-coordinate': 'Rechne die Koordinaten aus, z. B. P(2|5) statt P(2|2·2 + 1).',
  'unevaluated-value': 'Rechne bis zu einer einzelnen Zahl aus, z. B. f(2) = 2·2 + 1 = 5.',
  'missing-quantity': 'Beginne mit der gesuchten Größe, z. B. A = …',
  'wrong-quantity': 'Achte auf die gesuchte Größe: A für den Flächeninhalt, u für den Umfang.',
  'unevaluated-result': 'Rechne bis zu einer einzelnen Zahl aus, z. B. A = 6 · 4 : 2 = 12.',
  'decimal-result': 'Gib das Ergebnis als Dezimalzahl an, z. B. 7,5 statt 15/2.',
  'missing-calculation': 'Schreibe die Rechnung dazu, z. B. A = g · h = 6 · 4 = 24.',
  'not-substituted-only': 'Setze zuerst nur die bekannten Zahlen in die Formel ein. Umformen kommt danach.',
}

/** Order in which problems are reported when several apply. */
const EXPANDED_SEVERITY: readonly FormHintCode[] = [
  'has-brackets',
  'unevaluated-power',
  'unevaluated-number',
  'repeated-variable',
  'like-terms',
  'zero-term',
]

export function formHint(code: FormHintCode): FormHint {
  return { code, message: MESSAGES[code] }
}

/** Returns a hint if `expr` does not meet `requirement`, otherwise undefined. */
export function checkForm(expr: Expr, requirement: FormRequirement): FormHint | undefined {
  const code =
    requirement.kind === 'expanded' ? expandedIssue(expr) : factoredIssue(expr, requirement.sumFactors)
  return code ? formHint(code) : undefined
}

export function isExpanded(expr: Expr): boolean {
  return expandedIssue(expr) === undefined
}

function expandedIssue(expr: Expr): FormHintCode | undefined {
  const terms = flattenSum(unwrapGroups(expr))
  const found = new Set<FormHintCode>()
  for (const term of terms) monomialIssues(term, found)

  const seen = new Set<string>()
  for (const term of terms) {
    const poly = toPolynomial(term)
    if (poly.isZero()) {
      // A lone "0" is a valid expanded answer.
      if (terms.length > 1) found.add('zero-term')
      continue
    }
    const [single] = poly.terms()
    if (poly.termCount !== 1 || !single) continue // brackets, already reported
    const key = monomialKey(single.mono)
    if (seen.has(key)) found.add('like-terms')
    seen.add(key)
  }
  return EXPANDED_SEVERITY.find((code) => found.has(code))
}

/** Summands of a sum written without brackets; signs are dropped. */
function flattenSum(e: Expr): Expr[] {
  if (e.type === 'add') return e.terms.flatMap(flattenSum)
  if (e.type === 'neg') return flattenSum(e.arg)
  return [e]
}

/** Records why a single summand is not a simplified monomial like `-3x²y`. */
function monomialIssues(term: Expr, found: Set<FormHintCode>): void {
  let numbers = 0
  const vars = new Map<string, number>()

  const visit = (e: Expr): void => {
    switch (e.type) {
      case 'num':
        numbers++
        return
      case 'var':
        vars.set(e.name, (vars.get(e.name) ?? 0) + 1)
        return
      case 'neg':
        visit(e.arg)
        return
      case 'add':
        found.add('has-brackets')
        return
      case 'group': {
        const body = unwrapGroups(e.body)
        if (body.type === 'add') found.add('has-brackets')
        else visit(body)
        return
      }
      case 'mul':
        e.factors.forEach(visit)
        return
      case 'div':
        visit(e.num)
        if (unwrapGroups(e.den).type !== 'num') found.add('unevaluated-number')
        return
      case 'pow': {
        const base = unwrapGroups(e.base)
        if (base.type === 'var') vars.set(base.name, (vars.get(base.name) ?? 0) + 1)
        else if (base.type === 'num') found.add('unevaluated-number')
        else if (base.type === 'add') found.add('has-brackets')
        else found.add('unevaluated-power')
        return
      }
    }
  }

  visit(term)
  if (numbers > 1) found.add('unevaluated-number')
  if ([...vars.values()].some((count) => count > 1)) found.add('repeated-variable')
}

function factoredIssue(expr: Expr, requiredSumFactors: number): FormHintCode | undefined {
  const factors = collectFactors(unwrapGroups(expr))
  if (!factors) return 'not-a-product'
  const sums = factors.filter((f) => toPolynomial(f).termCount >= 2)
  if (sums.length === 0 && requiredSumFactors > 0) return 'not-a-product'
  if (sums.some((s) => !isExpanded(s))) return 'inner-not-simplified'
  if (sums.some((s) => !toPolynomial(s).isPrimitive())) return 'common-factor-left'
  if (sums.length < requiredSumFactors) return 'factor-further'
  return undefined
}

/**
 * Factors of a product, with powers expanded into repeated factors and
 * bracketed sums returned as their (unbracketed) body. Returns undefined if
 * the expression is a sum at the top level, i.e. not a product at all.
 * Parsed input always brackets inner sums; built expressions may not.
 */
function collectFactors(e: Expr, top = true): Expr[] | undefined {
  switch (e.type) {
    case 'num':
    case 'var':
      return [e]
    case 'group': {
      const body = unwrapGroups(e.body)
      return body.type === 'add' ? [body] : collectFactors(body, false)
    }
    case 'neg':
      return collectFactors(e.arg, false)
    case 'mul': {
      const out: Expr[] = []
      for (const f of e.factors) {
        const inner = collectFactors(f, false)
        if (!inner) return undefined
        out.push(...inner)
      }
      return out
    }
    case 'div':
      return collectFactors(e.num, false)
    case 'pow': {
      const base = unwrapGroups(e.base)
      const inner = base.type === 'add' ? [base] : collectFactors(base, false)
      if (!inner) return undefined
      return Array.from({ length: e.exp }, () => inner).flat()
    }
    case 'add':
      // A sum inside a product can only come from code-built expressions,
      // where the printer adds the brackets.
      return top ? undefined : [e]
  }
}
