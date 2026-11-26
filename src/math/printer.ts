import type { Expr } from './ast'
import type { Rational } from './rational'

/**
 * How numbers are printed:
 * - `fraction` (default): non-integers as fractions, e.g. `15/2`
 * - `decimal`: finite decimal fractions with a decimal comma, e.g. `7,5`
 *   (LaTeX `7{,}5`); other numbers such as 1/3 stay fractions. Used by the
 *   geometry tasks, where lengths are whole numbers or end in ,5.
 */
export interface PrintOptions {
  numbers?: 'fraction' | 'decimal'
}

/** Where a sub-expression is printed; decides whether it needs brackets. */
type Context = 'top' | 'add' | 'mul-first' | 'mul' | 'neg' | 'pow-base' | 'div-num' | 'div-den'

interface Dialect {
  readonly latex: boolean
  /** Print finite decimal fractions as decimals (see PrintOptions). */
  readonly decimal: boolean
  readonly comma: string
  readonly times: string
  readonly plus: string
  readonly minus: string
  readonly sign: string
  readonly open: string
  readonly close: string
  power(base: string, exp: number): string
  fraction(num: string, den: string): string
}

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

const TEXT: Dialect = {
  latex: false,
  decimal: false,
  comma: ',',
  times: '·',
  plus: ' + ',
  minus: ' - ',
  sign: '-',
  open: '(',
  close: ')',
  power: (base, exp) =>
    base +
    String(exp)
      .split('')
      .map((d) => SUPERSCRIPT_DIGITS.charAt(Number(d)))
      .join(''),
  fraction: (num, den) => `${num}/${den}`,
}

const LATEX: Dialect = {
  latex: true,
  decimal: false,
  comma: '{,}',
  times: ' \\cdot ',
  plus: ' + ',
  minus: ' - ',
  sign: '-',
  open: '(',
  close: ')',
  power: (base, exp) => `${base}^{${exp}}`,
  fraction: (num, den) => `\\frac{${num}}{${den}}`,
}

/**
 * Display text such as `x² + 6x + 9` or `2·x·3`. The output can be parsed
 * back with `parse`, so it is also suitable as a typed answer.
 */
export function toText(expr: Expr, options?: PrintOptions): string {
  return render(expr, 'top', dialect(TEXT, options))
}

/** LaTeX for KaTeX, e.g. `x^{2} + 6x + 9`. */
export function toLatex(expr: Expr, options?: PrintOptions): string {
  return render(expr, 'top', dialect(LATEX, options))
}

function dialect(base: Dialect, options: PrintOptions | undefined): Dialect {
  return options?.numbers === 'decimal' ? { ...base, decimal: true } : base
}

function render(e: Expr, ctx: Context, d: Dialect): string {
  const s = renderRaw(e, d)
  return needsParens(e, ctx, d) ? d.open + s + d.close : s
}

function renderRaw(e: Expr, d: Dialect): string {
  switch (e.type) {
    case 'num':
      return formatNumber(e.value, d)
    case 'var':
      return e.name
    case 'group':
      return d.open + render(e.body, 'top', d) + d.close
    case 'neg':
      return d.sign + render(e.arg, 'neg', d)
    case 'add':
      return e.terms
        .map((t, i) => {
          if (i === 0) return render(t, 'top', d)
          return isNegLeading(t) ? d.minus + render(stripNeg(t), 'add', d) : d.plus + render(t, 'add', d)
        })
        .join('')
    case 'mul': {
      let out = ''
      e.factors.forEach((f, i) => {
        if (i === 0) {
          out = render(f, 'mul-first', d)
          return
        }
        const prev = e.factors[i - 1]
        const implicit = !e.explicit && prev !== undefined && canJuxtapose(prev, f, d)
        out += (implicit ? '' : d.times) + render(f, 'mul', d)
      })
      return out
    }
    case 'div':
      return d.latex
        ? d.fraction(render(e.num, 'top', d), render(e.den, 'top', d))
        : `${render(e.num, 'div-num', d)}/${render(e.den, 'div-den', d)}`
    case 'pow':
      return d.power(render(e.base, 'pow-base', d), e.exp)
  }
}

function formatNumber(value: Rational, d: Dialect): string {
  const abs = value.abs()
  const body = abs.isInteger()
    ? abs.num.toString()
    : ((d.decimal ? decimalBody(abs, d.comma) : undefined) ?? d.fraction(abs.num.toString(), abs.den.toString()))
  return value.sign() < 0 ? d.sign + body : body
}

/** `7,5` for 15/2; undefined for integers and numbers without a finite decimal expansion. */
function decimalBody(value: Rational, comma: string): string | undefined {
  const places = value.decimalPlaces()
  if (places === undefined || places === 0) return undefined
  const digits = ((value.num * 10n ** BigInt(places)) / value.den).toString().padStart(places + 1, '0')
  return digits.slice(0, -places) + comma + digits.slice(-places)
}

/** True for numbers printed without a fraction: integers, and finite decimals in decimal mode. */
function printsPlain(value: Rational, d: Dialect): boolean {
  return value.isInteger() || (d.decimal && value.decimalPlaces() !== undefined)
}

function needsParens(e: Expr, ctx: Context, d: Dialect): boolean {
  switch (e.type) {
    case 'var':
    case 'group':
      return false
    case 'num':
      if (e.value.sign() < 0) return ctx !== 'top' && ctx !== 'mul-first'
      if (printsPlain(e.value, d)) return false
      // Fractions: `(1/2)x` in text; `\frac` is unambiguous except as a base.
      return d.latex ? ctx === 'pow-base' : ctx !== 'top' && ctx !== 'add'
    case 'add':
      if (d.latex && (ctx === 'div-num' || ctx === 'div-den')) return false
      return ctx !== 'top' && ctx !== 'add'
    case 'neg':
      return ctx !== 'top' && ctx !== 'mul-first'
    case 'mul':
      return ctx === 'pow-base' || (!d.latex && ctx === 'div-den')
    case 'div':
      if (d.latex) return ctx === 'pow-base'
      return ctx !== 'top' && ctx !== 'add' && ctx !== 'neg' && ctx !== 'mul-first'
    case 'pow':
      return ctx === 'pow-base'
  }
}

/** Whether `left right` may be written without a multiplication dot. */
function canJuxtapose(left: Expr, right: Expr, d: Dialect): boolean {
  if (left.type === 'div') return false
  // `x·x` stays readable; `xx` would not.
  if (lastLetter(left) !== undefined && lastLetter(left) === firstLetter(right)) return false
  if (startsWithLetter(right)) return true
  return startsWithBracket(right, d)
}

function firstLetter(e: Expr): string | undefined {
  if (e.type === 'var') return e.name
  if (e.type === 'pow') return e.base.type === 'var' ? e.base.name : undefined
  if (e.type === 'mul' && !e.explicit && e.factors[0]) return firstLetter(e.factors[0])
  return undefined
}

function lastLetter(e: Expr): string | undefined {
  if (e.type === 'var') return e.name
  if (e.type === 'pow') return e.base.type === 'var' ? e.base.name : undefined
  const last = e.type === 'mul' ? e.factors[e.factors.length - 1] : undefined
  return last && e.type === 'mul' && !e.explicit ? lastLetter(last) : undefined
}

function startsWithLetter(e: Expr): boolean {
  switch (e.type) {
    case 'var':
      return true
    case 'pow':
      return e.base.type === 'var'
    case 'mul':
      return !e.explicit && e.factors[0] !== undefined && startsWithLetter(e.factors[0])
    default:
      return false
  }
}

/** True for factors printed as `( … )` that start with a bracket because they are sums. */
function startsWithBracket(e: Expr, d: Dialect): boolean {
  if (e.type === 'group' || e.type === 'add') return true
  if (e.type === 'pow') return startsWithBracket(e.base, d) || e.base.type === 'mul'
  if (e.type === 'mul') return !e.explicit && e.factors[0] !== undefined && startsWithBracket(e.factors[0], d)
  return false
}

function isNegLeading(e: Expr): boolean {
  switch (e.type) {
    case 'neg':
      return true
    case 'num':
      return e.value.sign() < 0
    case 'mul':
      return e.factors[0] !== undefined && isNegLeading(e.factors[0])
    case 'div':
      return isNegLeading(e.num)
    default:
      return false
  }
}

function stripNeg(e: Expr): Expr {
  switch (e.type) {
    case 'neg':
      return e.arg
    case 'num':
      return { ...e, value: e.value.abs() }
    case 'mul': {
      const [first, ...rest] = e.factors
      return first ? { ...e, factors: [stripNeg(first), ...rest] } : e
    }
    case 'div':
      return { ...e, num: stripNeg(e.num) }
    default:
      return e
  }
}
