import { add, group, mul, neg, num, type Expr } from '../ast'
import type { PrintOptions } from '../printer'
import { pickWeighted, randInt, randNonZero, type Rng } from '../random'
import { SERIES_LENGTH } from '../tasks'
import { ex, mono, pickVar, sum } from '../tasks/helpers'
import type { SubtopicId } from '../tasks/types'
import { equationToText, sidePolynomials } from './equation'
import { solveStepByStep } from './solve'
import type { Equation, EquationTask, EquationTaskGenerator } from './types'

const TRANSFORM = 'algebra/lineare-gleichungen/umformen'
const BRACKETS = 'algebra/lineare-gleichungen/klammern'
const SPECIAL = 'algebra/lineare-gleichungen/sonderfaelle'

const INSTRUCTION = 'Löse die Gleichung und gib die Lösungsmenge an.'

/** Largest absolute value of any number in a generated task and its worked solution. */
const MAX_NUMBER = 99

/**
 * Task "solve left = right" with its worked solution. Used by the generators
 * and for fixed worked examples in the explanations. With
 * `{ numbers: 'decimal' }` the task is marked to be printed with decimals
 * (key and notes included).
 *
 * @throws RangeError if the equation is not linear in a single variable.
 */
export function buildEquationTask(
  topic: SubtopicId,
  left: Expr,
  right: Expr,
  variant = 'example',
  options?: PrintOptions,
): EquationTask {
  const equation: Equation = { left, right }
  const solution = solveStepByStep(equation, options)
  return {
    topic,
    variant,
    key: equationToText(equation, options),
    instruction: INSTRUCTION,
    equation,
    ...solution,
    ...(options?.numbers === 'decimal' ? { numbers: 'decimal' as const } : {}),
  }
}

/** `a·x + b` in canonical form. */
function lin(a: number, b: number, x: string): Expr {
  return ex(sum(mono(a, x), mono(b)))
}

/** `p(inner)`, e.g. `3(x + 2)` or `-2(x - 1)`. */
function scaled(p: number, inner: Expr): Expr {
  return mul(num(p), inner)
}

/** n or −n with n in [min, max]; negative in about a quarter of the cases. */
function mostlyPositive(rng: Rng, min: number, max: number): number {
  const n = randInt(rng, min, max)
  return rng() < 0.25 ? -n : n
}

/** An equation to try; undefined if the drawn numbers do not fit the variant. */
type Draft = { variant: string; left: Expr; right: Expr } | undefined

/** True if every number in the task and its worked solution is a small integer. */
function hasSmallIntegers(task: EquationTask): boolean {
  return [task.equation, ...task.steps.map((step) => step.equation)].every((equation) => {
    const { left, right } = sidePolynomials(equation)
    return [left, right].every((side) =>
      side.terms().every((term) => term.coef.isInteger() && Math.abs(term.coef.toNumber()) <= MAX_NUMBER),
    )
  })
}

function generatorFor(topic: SubtopicId, draft: (rng: Rng) => Draft): EquationTaskGenerator {
  return (rng) => {
    for (;;) {
      const drawn = draft(rng)
      if (!drawn) continue
      const task = buildEquationTask(topic, drawn.left, drawn.right, drawn.variant)
      if (hasSmallIntegers(task)) return task
    }
  }
}

// Every draft starts from an integer solution s and computes the last free
// number from it, so the solutions are always integers.

type TransformVariant =
  | 'one-side'
  | 'both-sides'
  | 'negative-coefficient'
  | 'negative-terms'
  | 'variable-right'
  | 'no-constant'

const TRANSFORM_VARIANTS: readonly (readonly [TransformVariant, number])[] = [
  ['one-side', 1], // 3x + 5 = 17
  ['both-sides', 4], // 5x + 3 = 2x + 12
  ['negative-coefficient', 2], // 2x + 3 = 5x - 9
  ['negative-terms', 2], // -3x + 4 = 2x - 11
  ['variable-right', 1], // 7 = 2x - 5
  ['no-constant', 1], // 5x = 2x + 12
]

function draftTransform(rng: Rng): Draft {
  const variant = pickWeighted(rng, TRANSFORM_VARIANTS)
  const x = pickVar(rng)
  const s = randInt(rng, -9, 9)
  switch (variant) {
    case 'one-side': {
      const a = mostlyPositive(rng, 2, 9)
      const b = randNonZero(rng, 12)
      return { variant, left: lin(a, b, x), right: num(a * s + b) }
    }
    case 'both-sides': {
      const a = randInt(rng, 3, 9)
      const c = randInt(rng, 1, a - 1)
      const b = randNonZero(rng, 12)
      const d = (a - c) * s + b
      return d === 0 ? undefined : { variant, left: lin(a, b, x), right: lin(c, d, x) }
    }
    case 'negative-coefficient': {
      const a = randInt(rng, 1, 6)
      const c = randInt(rng, a + 1, 9)
      const b = randNonZero(rng, 12)
      const d = (a - c) * s + b
      return d === 0 ? undefined : { variant, left: lin(a, b, x), right: lin(c, d, x) }
    }
    case 'negative-terms': {
      const a = randNonZero(rng, 9)
      const c = randNonZero(rng, 9)
      if (a === c || (a > 0 && c > 0)) return undefined
      const b = randNonZero(rng, 12)
      const d = (a - c) * s + b
      return d === 0 ? undefined : { variant, left: lin(a, b, x), right: lin(c, d, x) }
    }
    case 'variable-right': {
      const c = mostlyPositive(rng, 2, 9)
      const d = randNonZero(rng, 12)
      return { variant, left: num(c * s + d), right: lin(c, d, x) }
    }
    case 'no-constant': {
      const a = randInt(rng, 2, 9)
      const c = randNonZero(rng, 9)
      if (a === c || s === 0) return undefined
      return { variant, left: lin(a, 0, x), right: lin(c, (a - c) * s, x) }
    }
  }
}

type BracketVariant =
  | 'bracket-left'
  | 'bracket-plus-number'
  | 'two-brackets'
  | 'minus-bracket'
  | 'number-minus-bracket'
  | 'bracket-sum'

const BRACKET_VARIANTS: readonly (readonly [BracketVariant, number])[] = [
  ['bracket-left', 3], // 3(x + 2) = x + 10
  ['bracket-plus-number', 2], // 2(3x - 1) + 4 = 5x + 6
  ['two-brackets', 2], // 4(x - 1) = 2(x + 3)
  ['minus-bracket', 2], // 5x - (2x - 4) = 13
  ['number-minus-bracket', 1], // 7 - 2(x + 3) = x - 5
  ['bracket-sum', 2], // 2(x + 1) - 3(x - 2) = 5
]

function draftBrackets(rng: Rng): Draft {
  const variant = pickWeighted(rng, BRACKET_VARIANTS)
  const x = pickVar(rng)
  const s = randInt(rng, -9, 9)
  switch (variant) {
    case 'bracket-left': {
      const p = mostlyPositive(rng, 2, 6)
      const q = randNonZero(rng, 9)
      const c = randInt(rng, 0, 5)
      if (c === p) return undefined
      return { variant, left: scaled(p, lin(1, q, x)), right: lin(c, p * (s + q) - c * s, x) }
    }
    case 'bracket-plus-number': {
      const p = mostlyPositive(rng, 2, 5)
      const a = randInt(rng, 1, 3)
      const q = randNonZero(rng, 6)
      const r = randNonZero(rng, 9)
      const c = randInt(rng, 0, 6)
      if (c === p * a) return undefined
      const d = p * (a * s + q) + r - c * s
      return { variant, left: add(scaled(p, lin(a, q, x)), num(r)), right: lin(c, d, x) }
    }
    case 'two-brackets': {
      const p = mostlyPositive(rng, 2, 6)
      const r = randInt(rng, 2, 6)
      const q = randNonZero(rng, 9)
      // p(s + q) = r(s + t) must give an integer t.
      const rest = p * (s + q) - r * s
      if (p === r || rest % r !== 0 || rest === 0) return undefined
      return { variant, left: scaled(p, lin(1, q, x)), right: scaled(r, lin(1, rest / r, x)) }
    }
    case 'minus-bracket': {
      const a = randInt(rng, 2, 9)
      const c = randInt(rng, 1, 6)
      const q = randNonZero(rng, 9)
      if (a === c) return undefined
      return {
        variant,
        left: add(lin(a, 0, x), neg(group(lin(c, q, x)))),
        right: num((a - c) * s - q),
      }
    }
    case 'number-minus-bracket': {
      const m = randInt(rng, 1, 12)
      const p = randInt(rng, 2, 5)
      const q = randNonZero(rng, 6)
      const c = randInt(rng, 0, 4)
      const d = m - p * (s + q) - c * s
      return { variant, left: add(num(m), scaled(-p, lin(1, q, x))), right: lin(c, d, x) }
    }
    case 'bracket-sum': {
      const p = randInt(rng, 2, 5)
      const r = randNonZero(rng, 5)
      const q = randNonZero(rng, 6)
      const t = randNonZero(rng, 6)
      if (p + r === 0 || Math.abs(r) === 1) return undefined
      return {
        variant,
        left: add(scaled(p, lin(1, q, x)), scaled(r, lin(1, t, x))),
        right: num(p * (s + q) + r * (s + t)),
      }
    }
  }
}

type Outcome = 'none' | 'all' | 'single'
type Shape = 'plain' | 'collect' | 'bracket' | 'two-brackets'

const OUTCOMES: readonly (readonly [Outcome, number])[] = [
  ['none', 4], // L = { }
  ['all', 4], // L = ℚ
  ['single', 2], // L = {c}: the learner has to tell the cases apart
]

const SHAPES: readonly (readonly [Shape, number])[] = [
  ['collect', 2], // 2x + 3 + x = 3x + 3
  ['bracket', 3], // 2(x + 3) = 2x + 5
  ['two-brackets', 2], // 2(x + 3) - 1 = 2(x + 1) + 3
]

/** Shapes for equations without a solution; the plain one would be trivial for `all`. */
const SHAPES_NONE: readonly (readonly [Shape, number])[] = [['plain', 2], ...SHAPES] // 2x + 3 = 2x + 5

/**
 * Special cases: the variable terms cancel (`none`, `all`) or, as a control,
 * they do not (`single`). `e` is the difference of the coefficients of x on
 * both sides and `shift` what is added to the number that would make both
 * sides equal.
 */
function draftSpecial(rng: Rng): Draft {
  const outcome = pickWeighted(rng, OUTCOMES)
  const shape = pickWeighted(rng, outcome === 'none' ? SHAPES_NONE : SHAPES)
  const variant = `${outcome}-${shape}`
  const x = pickVar(rng)
  const s = randInt(rng, -9, 9)
  const e = outcome === 'single' ? randNonZero(rng, 3) : 0
  const shift = outcome === 'none' ? randNonZero(rng, 9) : 0
  switch (shape) {
    case 'plain': {
      const a = mostlyPositive(rng, 1, 9)
      const b = randNonZero(rng, 12)
      if (b + shift === 0) return undefined
      return { variant, left: lin(a, b, x), right: lin(a, b + shift, x) }
    }
    case 'collect': {
      const a = randInt(rng, 1, 6)
      const c = randNonZero(rng, 6)
      const b = randNonZero(rng, 12)
      if (a + c === 0 || a + c + e === 0) return undefined
      // (a + c)x + b = (a + c + e)x + d  ⇔  b - d = e·x
      const d = b - e * s + shift
      return { variant, left: add(lin(a, 0, x), num(b), lin(c, 0, x)), right: lin(a + c + e, d, x) }
    }
    case 'bracket': {
      const p = mostlyPositive(rng, 2, 6)
      const q = randNonZero(rng, 9)
      if (p + e === 0) return undefined
      // p(x + q) = (p + e)x + d  ⇔  p·q - d = e·x
      const d = p * q - e * s + shift
      return { variant, left: scaled(p, lin(1, q, x)), right: lin(p + e, d, x) }
    }
    case 'two-brackets': {
      const p = randInt(rng, 2, 5)
      const q = randNonZero(rng, 6)
      const t = randNonZero(rng, 6)
      const r = randNonZero(rng, 9)
      if (q === t || p + e <= 1) return undefined
      // p(x + q) + r = (p + e)(x + t) + u
      const u = p * (s + q) + r - (p + e) * (s + t) + shift
      if (u === 0) return undefined
      return {
        variant,
        left: add(scaled(p, lin(1, q, x)), num(r)),
        right: add(scaled(p + e, lin(1, t, x)), num(u)),
      }
    }
  }
}

/**
 * Generators of the topic "Lineare Gleichungen". They are kept apart from the
 * term generators (`generators`), because an equation task is solved line by
 * line and has no single term as its answer.
 */
export const equationGenerators = {
  [TRANSFORM]: generatorFor(TRANSFORM, draftTransform),
  [BRACKETS]: generatorFor(BRACKETS, draftBrackets),
  [SPECIAL]: generatorFor(SPECIAL, draftSpecial),
} as const satisfies Record<SubtopicId, EquationTaskGenerator>

/** All subtopics that have an equation generator. */
export const EQUATION_SUBTOPIC_IDS = Object.keys(equationGenerators) as (keyof typeof equationGenerators)[]

const MAX_ATTEMPTS = 200

/** Generates an equation task whose key is not in `exclude` (see `generateTask`). */
export function generateEquationTask(topic: SubtopicId, rng: Rng, exclude: Iterable<string> = []): EquationTask {
  const excluded = new Set(exclude)
  if (!Object.hasOwn(equationGenerators, topic)) throw new Error(`No equation generator for subtopic "${topic}"`)
  const generate: EquationTaskGenerator = equationGenerators[topic as keyof typeof equationGenerators]
  let task = generate(rng)
  for (let i = 1; i < MAX_ATTEMPTS && excluded.has(task.key); i++) task = generate(rng)
  return task
}

/** A series of equation tasks without repetitions. */
export function generateEquationSeries(topic: SubtopicId, rng: Rng, length = SERIES_LENGTH): EquationTask[] {
  const tasks: EquationTask[] = []
  for (let i = 0; i < length; i++) {
    tasks.push(generateEquationTask(topic, rng, tasks.map((t) => t.key)))
  }
  return tasks
}
