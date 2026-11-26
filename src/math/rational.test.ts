// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { gcd, Rational } from './rational'

describe('Rational', () => {
  it('normalises sign and reduces', () => {
    const r = Rational.of(6, -8)
    expect(r.num).toBe(-3n)
    expect(r.den).toBe(4n)
    expect(Rational.of(0, -5).equals(Rational.ZERO)).toBe(true)
  })

  it('rejects a zero denominator and non-integer numbers', () => {
    expect(() => Rational.of(1, 0)).toThrow(RangeError)
    expect(() => Rational.of(0.5)).toThrow(RangeError)
  })

  it('does exact arithmetic', () => {
    const half = Rational.of(1, 2)
    const third = Rational.of(1, 3)
    expect(half.add(third).toString()).toBe('5/6')
    expect(half.sub(third).toString()).toBe('1/6')
    expect(half.mul(third).toString()).toBe('1/6')
    expect(half.div(third).toString()).toBe('3/2')
    expect(Rational.of(-2, 3).pow(3).toString()).toBe('-8/27')
    expect(Rational.of(7).pow(0).isOne()).toBe(true)
    expect(() => half.div(Rational.ZERO)).toThrow(RangeError)
  })

  it('compares and reports sign', () => {
    expect(Rational.of(1, 2).compare(Rational.of(2, 3))).toBe(-1)
    expect(Rational.of(4, 6).compare(Rational.of(2, 3))).toBe(0)
    expect(Rational.of(-1, 2).sign()).toBe(-1)
    expect(Rational.of(-1, 2).abs().toString()).toBe('1/2')
    expect(Rational.of(3, 4).toNumber()).toBe(0.75)
  })

  it('parses decimal literals with point or comma', () => {
    expect(Rational.parseDecimal('12')?.toString()).toBe('12')
    expect(Rational.parseDecimal('0.5')?.toString()).toBe('1/2')
    expect(Rational.parseDecimal('2,75')?.toString()).toBe('11/4')
    expect(Rational.parseDecimal('1.')).toBeUndefined()
    expect(Rational.parseDecimal('-1')).toBeUndefined()
  })

  it('counts the decimal places of finite decimal fractions', () => {
    expect(Rational.of(12).decimalPlaces()).toBe(0)
    expect(Rational.of(15, 2).decimalPlaces()).toBe(1)
    expect(Rational.of(35, 4).decimalPlaces()).toBe(2)
    expect(Rational.of(-7, 4).decimalPlaces()).toBe(2)
    expect(Rational.of(1, 40).decimalPlaces()).toBe(3)
    expect(Rational.of(1, 3).decimalPlaces()).toBeUndefined()
    expect(Rational.of(1, 6).decimalPlaces()).toBeUndefined()
  })

  it('computes gcd for signed values', () => {
    expect(gcd(12n, -18n)).toBe(6n)
    expect(gcd(0n, 5n)).toBe(5n)
    expect(gcd(0n, 0n)).toBe(1n)
  })
})
