/**
 * Exact rational numbers on top of bigint.
 *
 * Instances are immutable and always normalised: the denominator is positive
 * and numerator and denominator are coprime, so structural equality of
 * (num, den) is value equality.
 */
export class Rational {
  static readonly ZERO = new Rational(0n, 1n)
  static readonly ONE = new Rational(1n, 1n)

  readonly num: bigint
  readonly den: bigint

  private constructor(num: bigint, den: bigint) {
    this.num = num
    this.den = den
  }

  /** Creates a reduced fraction. `num` must be an integer when given as a number. */
  static of(num: bigint | number, den: bigint | number = 1n): Rational {
    const n = toBigInt(num)
    const d = toBigInt(den)
    if (d === 0n) throw new RangeError('Denominator must not be zero')
    const sign = d < 0n ? -1n : 1n
    const g = gcd(n, d)
    return new Rational((sign * n) / g, (sign * d) / g)
  }

  /**
   * Parses a non-negative decimal literal such as "12", "0.5" or "2,75"
   * (German decimal comma). Returns undefined for anything else.
   */
  static parseDecimal(text: string): Rational | undefined {
    const match = /^(\d+)(?:[.,](\d+))?$/.exec(text)
    if (!match) return undefined
    const intPart = match[1] ?? '0'
    const fracPart = match[2] ?? ''
    const scale = 10n ** BigInt(fracPart.length)
    return Rational.of(BigInt(intPart + fracPart), scale)
  }

  add(other: Rational): Rational {
    return Rational.of(this.num * other.den + other.num * this.den, this.den * other.den)
  }

  sub(other: Rational): Rational {
    return this.add(other.neg())
  }

  mul(other: Rational): Rational {
    return Rational.of(this.num * other.num, this.den * other.den)
  }

  div(other: Rational): Rational {
    if (other.isZero()) throw new RangeError('Division by zero')
    return Rational.of(this.num * other.den, this.den * other.num)
  }

  pow(exponent: number): Rational {
    if (!Number.isInteger(exponent) || exponent < 0) {
      throw new RangeError('Exponent must be a non-negative integer')
    }
    const e = BigInt(exponent)
    return Rational.of(this.num ** e, this.den ** e)
  }

  neg(): Rational {
    return new Rational(-this.num, this.den)
  }

  abs(): Rational {
    return this.num < 0n ? this.neg() : this
  }

  /** -1, 0 or 1. */
  sign(): number {
    return this.num < 0n ? -1 : this.num > 0n ? 1 : 0
  }

  isZero(): boolean {
    return this.num === 0n
  }

  isOne(): boolean {
    return this.num === 1n && this.den === 1n
  }

  isInteger(): boolean {
    return this.den === 1n
  }

  /**
   * Number of digits after the decimal point if the number is a finite
   * decimal fraction (0 for integers, 1 for 7.5, 2 for 8.75); undefined for
   * numbers such as 1/3.
   */
  decimalPlaces(): number | undefined {
    let d = this.den
    let twos = 0
    let fives = 0
    while (d % 2n === 0n) {
      d /= 2n
      twos++
    }
    while (d % 5n === 0n) {
      d /= 5n
      fives++
    }
    return d === 1n ? Math.max(twos, fives) : undefined
  }

  equals(other: Rational): boolean {
    return this.num === other.num && this.den === other.den
  }

  compare(other: Rational): number {
    const diff = this.num * other.den - other.num * this.den
    return diff < 0n ? -1 : diff > 0n ? 1 : 0
  }

  /** Converts to a JS number; only exact for small values. */
  toNumber(): number {
    return Number(this.num) / Number(this.den)
  }

  /** "3", "-3" or "1/2"; for debugging and keys, not for display. */
  toString(): string {
    return this.den === 1n ? this.num.toString() : `${this.num}/${this.den}`
  }
}

/** Greatest common divisor of two integers; always non-negative, gcd(0, 0) = 1. */
export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a
  let y = b < 0n ? -b : b
  while (y !== 0n) {
    ;[x, y] = [y, x % y]
  }
  return x === 0n ? 1n : x
}

function toBigInt(value: bigint | number): bigint {
  if (typeof value === 'bigint') return value
  if (!Number.isSafeInteger(value)) throw new RangeError(`Not a safe integer: ${value}`)
  return BigInt(value)
}
