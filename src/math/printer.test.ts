// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { add, mul, neg, num, pow, sub, times, v } from './ast'
import { polynomialToExpr, toPolynomial } from './normalize'
import { parse } from './parser'
import { Polynomial } from './polynomial'
import { toLatex, toText } from './printer'
import { createRng, randInt } from './random'
import { Rational } from './rational'

const x = v('x')

describe('toText', () => {
  it('prints implicit products where school notation does', () => {
    expect(toText(mul(num(3), x, add(mul(num(2), x), num(3))))).toBe('3x(2x + 3)')
    expect(toText(mul(add(x, num(3)), sub(x, num(3))))).toBe('(x + 3)(x - 3)')
    expect(toText(mul(num(2), pow(add(x, num(3)), 2)))).toBe('2(x + 3)²')
    expect(toText(mul(v('a'), pow(v('b'), 2)))).toBe('ab²')
    expect(toText(mul(x, x))).toBe('x·x')
    expect(toText(mul(x, num(2)))).toBe('x·2')
  })

  it('prints explicit products for worked solutions', () => {
    const products = add(times(x, x), times(x, num(-2)), times(num(3), x), times(num(3), num(-2)))
    expect(toText(products)).toBe('x·x + x·(-2) + 3·x + 3·(-2)')
    expect(toText(times(num(2), mul(num(2), x), num(3)))).toBe('2·2x·3')
  })

  it('handles signs and brackets', () => {
    expect(toText(add(x, neg(num(3))))).toBe('x - 3')
    expect(toText(neg(add(x, num(1))))).toBe('-(x + 1)')
    expect(toText(pow(mul(num(2), x), 2))).toBe('(2x)²')
    expect(toText(pow(num(-3), 2))).toBe('(-3)²')
    expect(toText(add(x, neg(neg(x))))).toBe('x - (-x)')
    expect(toText(add(neg(times(x, num(3))), x))).toBe('-x·3 + x')
    expect(toText(add(x, neg(times(num(2), x, num(3)))))).toBe('x - 2·x·3')
  })

  it('prints fractions unambiguously', () => {
    expect(toText(mul(num(Rational.of(1, 2)), x))).toBe('(1/2)x')
    expect(toText(add(x, num(Rational.of(-1, 2))))).toBe('x - 1/2')
  })

  it('keeps user brackets', () => {
    expect(toText(parse('((x))+(2)'))).toBe('((x)) + (2)')
  })
})

describe('toLatex', () => {
  it('produces KaTeX-ready markup', () => {
    expect(toLatex(parse('x^2+6x+9'))).toBe('x^{2} + 6x + 9')
    expect(toLatex(times(num(2), x, num(3)))).toBe('2 \\cdot x \\cdot 3')
    expect(toLatex(mul(num(Rational.of(1, 2)), x))).toBe('\\frac{1}{2}x')
    expect(toLatex(parse('(x+1)/2'))).toBe('\\frac{(x + 1)}{2}')
    expect(toLatex(pow(add(x, num(3)), 2))).toBe('(x + 3)^{2}')
  })
})

describe('decimal numbers', () => {
  const decimal = { numbers: 'decimal' } as const

  it('prints finite decimal fractions with a decimal comma', () => {
    expect(toText(num(Rational.of(15, 2)), decimal)).toBe('7,5')
    expect(toLatex(num(Rational.of(15, 2)), decimal)).toBe('7{,}5')
    expect(toText(num(Rational.of(1, 20)), decimal)).toBe('0,05')
    expect(toText(num(Rational.of(-7, 4)), decimal)).toBe('-1,75')
    expect(toText(num(12), decimal)).toBe('12')
  })

  it('needs no brackets around decimals', () => {
    expect(toText(mul(num(Rational.of(3, 2)), v('c')), decimal)).toBe('1,5c')
    expect(toText(times(num(2), num(Rational.of(15, 2))), decimal)).toBe('2·7,5')
    expect(toText(add(x, num(Rational.of(-1, 2))), decimal)).toBe('x - 0,5')
  })

  it('keeps fractions without a finite decimal expansion', () => {
    expect(toText(num(Rational.of(1, 3)), decimal)).toBe('1/3')
    expect(toLatex(num(Rational.of(1, 3)), decimal)).toBe('\\frac{1}{3}')
    expect(toText(mul(num(Rational.of(1, 3)), x), decimal)).toBe('(1/3)x')
  })

  it('leaves the default output unchanged', () => {
    expect(toText(num(Rational.of(15, 2)))).toBe('15/2')
    expect(toText(mul(num(Rational.of(3, 2)), v('c')))).toBe('(3/2)c')
  })

  it('prints text that parses back to the same value', () => {
    const poly = Polynomial.monomial(Rational.of(3, 2), { c: 1 }).add(Polynomial.constant(Rational.of(13, 4)))
    const text = toText(polynomialToExpr(poly), decimal)
    expect(text).toBe('1,5c + 3,25')
    expect(toPolynomial(parse(text)).equals(poly)).toBe(true)
  })
})

describe('round trip', () => {
  it('parses printed canonical polynomials back to the same value and text', () => {
    const rng = createRng(7)
    const vars = ['x', 'y', 'a']
    for (let i = 0; i < 300; i++) {
      const terms = Array.from({ length: randInt(rng, 1, 4) }, () =>
        Polynomial.monomial(randInt(rng, -12, 12), {
          [vars[randInt(rng, 0, 2)] ?? 'x']: randInt(rng, 0, 3),
          [vars[randInt(rng, 0, 2)] ?? 'y']: randInt(rng, 0, 2),
        }),
      )
      const poly = terms.reduce((acc, t) => acc.add(t), Polynomial.zero())
      const text = toText(polynomialToExpr(poly))
      const reparsed = toPolynomial(parse(text))
      expect(reparsed.equals(poly), text).toBe(true)
      expect(toText(polynomialToExpr(reparsed))).toBe(text)
    }
  })
})
