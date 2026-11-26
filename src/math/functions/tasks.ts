import { add, mul, num, sub, v, type Expr } from '../ast'
import { equationToLatex, equationToText, linearParts } from '../equations/equation'
import { solutionSetToLatex, solutionSetToText } from '../equations/solutionSet'
import { buildEquationTask } from '../equations/tasks'
import type { EquationTask } from '../equations/types'
import { polynomialToExpr, toPolynomial } from '../normalize'
import { Polynomial } from '../polynomial'
import { toLatex, toText } from '../printer'
import { pick, pickWeighted, randInt, randNonZero, type Rng } from '../random'
import { Rational } from '../rational'
import { SERIES_LENGTH } from '../tasks'
import type { SubtopicId } from '../tasks/types'
import {
  functionExpr,
  intersect,
  linearFunction,
  point,
  slopeFromPoints,
  substitute,
  valueAt,
  zeroOf,
} from './analysis'
import {
  functionEquationToLatex,
  functionEquationToText,
  functionToLatex,
  functionToText,
  numberToLatex,
  numberToText,
  pointToLatex,
  pointToText,
} from './print'
import {
  FUNCTION_VARIABLE,
  type FunctionSolutionLine,
  type FunctionTask,
  type FunctionTaskGenerator,
  type LinearFunction,
  type Point,
} from './types'

// `as const` keeps the literal types inside object literals (task.topic, register keys).
const GRAPH = 'funktionen/lineare-funktionen/steigung-und-graph' as const
const SET_UP = 'funktionen/lineare-funktionen/gleichung-aufstellen' as const
const POINT_ZERO = 'funktionen/lineare-funktionen/punktprobe-nullstelle' as const
const INTERSECTION = 'funktionen/lineare-funktionen/schnittpunkt' as const

/** Graph tasks fit into the coordinate window −FUNCTION_WINDOW…FUNCTION_WINDOW on both axes. */
export const FUNCTION_WINDOW = 8

/** Integer coordinates, e.g. `[2, 5]` for P(2|5). */
export type Coordinates = readonly [x: number, y: number]
/** Slope and y-intercept, e.g. `[2, -3]` for f(x) = 2x - 3. */
export type SlopeIntercept = readonly [m: number, n: number]

const t = numberToText
const l = numberToLatex

function line(text: string, latex: string, note: string): FunctionSolutionLine {
  return { text, latex, note }
}

function equationLine(left: Expr, right: Expr, note: string): FunctionSolutionLine {
  return line(`${toText(left)} = ${toText(right)}`, `${toLatex(left)} = ${toLatex(right)}`, note)
}

function pointLine(p: Point, label: string, note: string): FunctionSolutionLine {
  return line(pointToText(p, label), pointToLatex(p, label), note)
}

function functionLine(fn: LinearFunction, note: string): FunctionSolutionLine {
  return line(functionToText(fn), functionToLatex(fn), note)
}

/** `x = 3`, `n = -2` */
function valueLine(name: string, value: Rational, note: string): FunctionSolutionLine {
  return line(`${name} = ${t(value)}`, `${name} = ${l(value)}`, note)
}

/** `f(2) = 3·2 - 1 = 5`; the middle part is left out if there is nothing to calculate. */
function functionValueLine(fn: LinearFunction, x: Rational, note: string): FunctionSolutionLine {
  const inserted = substitute(functionExpr(fn), FUNCTION_VARIABLE, x)
  const value = num(valueAt(fn, x))
  const chain = toText(inserted) === toText(value) ? [value] : [inserted, value]
  return line(
    `${fn.name}(${t(x)}) = ${chain.map((e) => toText(e)).join(' = ')}`,
    `${fn.name}(${l(x)}) = ${chain.map((e) => toLatex(e)).join(' = ')}`,
    note,
  )
}

/** "1 nach rechts, 2 nach oben" */
function slopeTriangle(m: Rational): string {
  if (m.isZero()) return '1 nach rechts und 0 nach oben (waagerecht)'
  return `1 nach rechts, ${t(m.abs())} nach ${m.sign() > 0 ? 'oben' : 'unten'}`
}

function solutionSetLine(equation: EquationTask, note: string): FunctionSolutionLine {
  return line(solutionSetToText(equation.solutionSet), solutionSetToLatex(equation.solutionSet), note)
}

/** The last line of the worked solution of an equation (a statement such as `1 = 5` for special cases). */
function lastLine(equation: EquationTask) {
  return equation.steps[equation.steps.length - 1]?.equation ?? equation.equation
}

/**
 * Task "read the equation from the graph" or "draw the graph" for f(x) = mx + n.
 * Also used for fixed worked examples in the explanations.
 */
export function buildGraphTask(
  kind: 'read-equation' | 'draw-graph',
  [m, n]: SlopeIntercept,
  variant = 'example',
): FunctionTask {
  const fn = linearFunction('f', m, n)
  const text = functionToText(fn)
  const base = { topic: GRAPH, variant, key: `${kind}: ${text}`, fn }
  if (kind === 'read-equation') {
    return {
      ...base,
      kind,
      instruction: 'Lies die Funktionsgleichung f(x) = mx + n am Graphen ab.',
      steps: [
        valueLine('n', fn.n, `Der Graph schneidet die y-Achse im Punkt ${pointToText(point(0, fn.n), '')}.`),
        valueLine('m', fn.m, `Steigungsdreieck: ${slopeTriangle(fn.m)}.`),
        functionLine(fn, 'm und n in f(x) = mx + n einsetzen.'),
      ],
    }
  }
  return {
    ...base,
    kind,
    instruction: `Zeichne den Graphen von ${text}.`,
    steps: [
      pointLine(point(0, fn.n), 'P', `Der y-Achsenabschnitt ist n = ${t(fn.n)}: Punkt P auf der y-Achse.`),
      pointLine(point(1, valueAt(fn, Rational.ONE)), 'Q', `Von P aus mit dem Steigungsdreieck: ${slopeTriangle(fn.m)}.`),
      functionLine(fn, 'Die Gerade durch P und Q ist der Graph von f.'),
    ],
  }
}

/** `f(x) = mx + n` with known m and unknown n; insert P, solve for n. */
function setUpWithPoint(
  fn: LinearFunction,
  p: Point,
  variant: string,
): { steps: FunctionSolutionLine[]; equation: EquationTask } {
  const slopeTerm = polynomialToExpr(Polynomial.monomial(fn.m, { [FUNCTION_VARIABLE]: 1 }))
  const withUnknown = fn.m.isZero() ? v('n') : add(slopeTerm, v('n'))
  const inserted = substitute(withUnknown, FUNCTION_VARIABLE, p.x)
  const equation = buildEquationTask(SET_UP, num(p.y), inserted, variant)
  return {
    equation,
    steps: [
      line(
        functionEquationToText(fn.name, withUnknown),
        functionEquationToLatex(fn.name, withUnknown),
        `Die Steigung m = ${t(fn.m)} einsetzen; n ist noch unbekannt.`,
      ),
      equationLine(num(p.y), inserted, `${pointToText(p)} einsetzen: f(${t(p.x)}) = ${t(p.y)}.`),
      valueLine('n', fn.n, 'Die Gleichung nach n auflösen.'),
      functionLine(fn, 'n einsetzen.'),
    ],
  }
}

/** Task "line with slope m through P"; also used for fixed worked examples. */
export function buildPointSlopeTask(m: number, p: Coordinates, variant = 'example'): FunctionTask {
  const given = point(p[0], p[1])
  const slope = Rational.of(m)
  const fn = linearFunction('f', slope, given.y.sub(slope.mul(given.x)))
  const pointText = pointToText(given)
  return {
    kind: 'from-point-slope',
    topic: SET_UP,
    variant,
    key: `from-point-slope: m = ${t(slope)}, ${pointText}`,
    instruction:
      `Eine Gerade hat die Steigung m = ${t(slope)} und geht durch ${pointText}. ` +
      'Stelle ihre Funktionsgleichung f(x) = mx + n auf.',
    fn,
    point: given,
    ...setUpWithPoint(fn, given, variant),
  }
}

/**
 * Task "line through P and Q"; also used for fixed worked examples.
 *
 * @throws RangeError if both points have the same x-coordinate.
 */
export function buildTwoPointsTask(p: Coordinates, q: Coordinates, variant = 'example'): FunctionTask {
  const first = point(p[0], p[1])
  const second = point(q[0], q[1])
  const m = slopeFromPoints(first, second)
  if (m === undefined) throw new RangeError('The points must have different x-coordinates')
  const fn = linearFunction('f', m, first.y.sub(m.mul(first.x)))
  const dy = second.y.sub(first.y)
  const dx = second.x.sub(first.x)
  const quotient: Expr = {
    type: 'div',
    num: sub(num(second.y), num(first.y)),
    den: sub(num(second.x), num(first.x)),
  }
  const reduced: Expr = { type: 'div', num: num(dy), den: num(dx) }
  const chain = [quotient, ...(dx.isOne() ? [] : [reduced]), num(m)]
  const points = `${pointToText(first)} und ${pointToText(second, 'Q')}`
  const tail = setUpWithPoint(fn, first, variant)
  return {
    kind: 'from-two-points',
    topic: SET_UP,
    variant,
    key: `from-two-points: ${points}`,
    instruction: `Eine Gerade geht durch ${points}. Stelle ihre Funktionsgleichung f(x) = mx + n auf.`,
    fn,
    points: [first, second],
    equation: tail.equation,
    steps: [
      line(
        `m = ${chain.map((e) => toText(e)).join(' = ')}`,
        `m = ${chain.map((e) => toLatex(e)).join(' = ')}`,
        'Steigung aus zwei Punkten: m = (y₂ - y₁)/(x₂ - x₁).',
      ),
      ...tail.steps,
    ],
  }
}

/** Task "does P lie on the graph of f?"; also used for fixed worked examples. */
export function buildPointTestTask(f: SlopeIntercept, p: Coordinates, variant = 'example'): FunctionTask {
  const fn = linearFunction('f', f[0], f[1])
  const given = point(p[0], p[1])
  const value = valueAt(fn, given.x)
  const onGraph = value.equals(given.y)
  const fnText = functionToText(fn)
  const pointText = pointToText(given)
  const fx = `f(${t(given.x)})`
  return {
    kind: 'point-test',
    topic: POINT_ZERO,
    variant,
    key: `point-test: ${fnText}, ${pointText}`,
    instruction: `Prüfe rechnerisch, ob ${pointText} auf dem Graphen von ${fnText} liegt.`,
    fn,
    point: given,
    value,
    onGraph,
    steps: [
      functionValueLine(fn, given.x, 'Die x-Koordinate von P in f einsetzen.'),
      onGraph
        ? line(
            `${t(value)} = ${t(given.y)}`,
            `${l(value)} = ${l(given.y)}`,
            `${fx} ist gleich der y-Koordinate von P: P liegt auf dem Graphen von f.`,
          )
        : line(
            `${t(value)} ≠ ${t(given.y)}`,
            `${l(value)} \\neq ${l(given.y)}`,
            `${fx} ist nicht gleich der y-Koordinate von P: P liegt nicht auf dem Graphen von f.`,
          ),
    ],
  }
}

/** Task "zero of f"; also used for fixed worked examples. */
export function buildZeroTask(f: SlopeIntercept, variant = 'example'): FunctionTask {
  const fn = linearFunction('f', f[0], f[1])
  const zero = zeroOf(fn)
  const term = functionExpr(fn)
  const equation = buildEquationTask(POINT_ZERO, term, num(0), variant)
  const fnText = functionToText(fn)
  const steps = [equationLine(term, num(0), 'Nullstelle: f(x) = 0 setzen.')]
  const statement = equationToText(lastLine(equation))
  switch (zero.kind) {
    case 'single':
      steps.push(
        valueLine('x', zero.x, 'Die Gleichung nach x auflösen.'),
        pointLine(point(zero.x, 0), 'N', `Der Graph schneidet die x-Achse bei x = ${t(zero.x)}.`),
      )
      break
    case 'none':
      steps.push(
        solutionSetLine(
          equation,
          `${statement} ist eine falsche Aussage: f hat keine Nullstelle. Der Graph verläuft parallel zur x-Achse.`,
        ),
      )
      break
    case 'all':
      steps.push(
        solutionSetLine(equation, `${statement} ist eine wahre Aussage: Jede Zahl ist eine Nullstelle.`),
      )
      break
  }
  return {
    kind: 'zero',
    topic: POINT_ZERO,
    variant,
    key: `zero: ${fnText}`,
    instruction: `Berechne die Nullstelle von ${fnText}.`,
    fn,
    zero,
    equation,
    steps,
  }
}

function isSlopeIntercept(g: SlopeIntercept | Expr): g is SlopeIntercept {
  return Array.isArray(g)
}

/**
 * Task "intersection of the graphs of f and g"; also used for fixed worked
 * examples. `g` is either [m, n] or the right-hand side as it should be shown,
 * e.g. `parse('2(x + 1) - 3')`.
 *
 * @throws RangeError if `g` is not linear in x.
 */
export function buildIntersectionTask(
  f: SlopeIntercept,
  g: SlopeIntercept | Expr,
  variant = 'example',
): FunctionTask {
  const fn = linearFunction('f', f[0], f[1])
  let other: LinearFunction
  let otherExpr: Expr
  if (isSlopeIntercept(g)) {
    other = linearFunction('g', g[0], g[1])
    otherExpr = functionExpr(other)
  } else {
    const parts = linearParts(toPolynomial(g))
    if (!parts || (parts.variable !== undefined && parts.variable !== FUNCTION_VARIABLE)) {
      throw new RangeError(`Not a linear function of x: ${toText(g)}`)
    }
    other = linearFunction('g', parts.slope, parts.constant)
    otherExpr = g
  }
  const term = functionExpr(fn)
  const equation = buildEquationTask(INTERSECTION, term, otherExpr, variant)
  const intersection = intersect(fn, other)
  const fnText = functionToText(fn)
  const otherText = functionEquationToText(other.name, otherExpr)
  const steps = [equationLine(term, otherExpr, 'Gleichsetzen: f(x) = g(x).')]
  const last = equation.steps[equation.steps.length - 1]
  switch (intersection.kind) {
    case 'point':
      steps.push(
        valueLine('x', intersection.point.x, 'Die Gleichung nach x auflösen.'),
        functionValueLine(fn, intersection.point.x, 'x in f einsetzen, um die y-Koordinate zu berechnen.'),
        pointLine(intersection.point, 'S', 'Der Schnittpunkt der beiden Geraden.'),
      )
      break
    case 'parallel':
    case 'identical': {
      if (last) {
        steps.push(line(equationToText(last.equation), equationToLatex(last.equation), 'Die Gleichung umformen.'))
      }
      const statement = equationToText(lastLine(equation))
      steps.push(
        solutionSetLine(
          equation,
          intersection.kind === 'parallel'
            ? `${statement} ist eine falsche Aussage: Die Geraden haben dieselbe Steigung, aber verschiedene ` +
                'y-Achsenabschnitte. Sie sind parallel und haben keinen Schnittpunkt.'
            : `${statement} ist eine wahre Aussage: f und g beschreiben dieselbe Gerade. ` +
                'Jeder Punkt der Geraden ist ein Schnittpunkt.',
        ),
      )
      break
    }
  }
  return {
    kind: 'intersection',
    topic: INTERSECTION,
    variant,
    key: `intersection: ${fnText}; ${otherText}`,
    instruction: `Bestimme den Schnittpunkt der Graphen von ${fnText} und ${otherText}.`,
    fn,
    other,
    otherExpr,
    intersection,
    equation,
    steps,
  }
}

// Generators. All slopes, intercepts and results are integers.

/** Slope with absolute value 1…maxAbs, or 0 in about one case out of ten. */
function rarelyZeroSlope(rng: Rng, maxAbs: number): number {
  return rng() < 0.1 ? 0 : randNonZero(rng, maxAbs)
}

/** Avoids −0, which prints like 0 but is a different number key. */
function int(value: number): number {
  return value === 0 ? 0 : value
}

const GRAPH_KINDS: readonly (readonly ['read-equation' | 'draw-graph', number])[] = [
  ['read-equation', 1],
  ['draw-graph', 1],
]

/** m in −3…3 (0 rarely), n in −5…5: P(0|n) and Q(1|m + n) lie in the window. */
function generateGraphTask(rng: Rng): FunctionTask {
  const kind = pickWeighted(rng, GRAPH_KINDS)
  return buildGraphTask(kind, [rarelyZeroSlope(rng, 3), randInt(rng, -5, 5)], kind)
}

/** x-coordinates in the window whose point on the graph is in the window as well. */
function xsInWindow(m: number, n: number): number[] {
  const xs: number[] = []
  for (let x = -FUNCTION_WINDOW; x <= FUNCTION_WINDOW; x++) {
    if (Math.abs(m * x + n) <= FUNCTION_WINDOW) xs.push(x)
  }
  return xs
}

const SET_UP_KINDS: readonly (readonly ['point-slope' | 'two-points', number])[] = [
  ['point-slope', 1],
  ['two-points', 2],
]

/** m in −4…4 (0 rarely), n in −8…8, all points in the window; P is not on the y-axis for point-slope. */
function generateSetUpTask(rng: Rng): FunctionTask {
  const variant = pickWeighted(rng, SET_UP_KINDS)
  const m = rarelyZeroSlope(rng, 4)
  const n = randInt(rng, -8, 8)
  const xs = xsInWindow(m, n)
  if (variant === 'point-slope') {
    const x = pick(rng, xs.filter((candidate) => candidate !== 0))
    return buildPointSlopeTask(m, [x, int(m * x + n)], variant)
  }
  const a = pick(rng, xs)
  const b = pick(rng, xs.filter((candidate) => candidate !== a))
  return buildTwoPointsTask([a, int(m * a + n)], [b, int(m * b + n)], variant)
}

const POINT_ZERO_KINDS: readonly (readonly ['point-test' | 'zero', number])[] = [
  ['point-test', 1],
  ['zero', 1],
]

/** Share of zero tasks without a zero (f(x) = n with n ≠ 0). */
const NO_ZERO_SHARE = 0.15

/**
 * Punktprobe: m in −5…5 without 0, n in −9…9, x in −6…6; the point lies on
 * the graph in about half of the cases, otherwise 1…3 above or below.
 * Nullstelle: zero in −8…8, m in −5…5 without 0, |n| ≤ 20; sometimes no zero.
 */
function generatePointZeroTask(rng: Rng): FunctionTask {
  if (pickWeighted(rng, POINT_ZERO_KINDS) === 'point-test') {
    const m = randNonZero(rng, 5)
    const n = randInt(rng, -9, 9)
    const x = randInt(rng, -6, 6)
    const onGraph = rng() < 0.5
    const y = int(m * x + n + (onGraph ? 0 : randNonZero(rng, 3)))
    return buildPointTestTask([m, n], [x, y], onGraph ? 'point-on-graph' : 'point-off-graph')
  }
  if (rng() < NO_ZERO_SHARE) return buildZeroTask([0, randNonZero(rng, 9)], 'no-zero')
  for (;;) {
    const zero = randInt(rng, -8, 8)
    const m = randNonZero(rng, 5)
    const n = int(-m * zero)
    if (Math.abs(n) <= 20) return buildZeroTask([m, n], 'zero')
  }
}

type Outcome = 'intersection' | 'parallel' | 'identical'

const OUTCOMES: readonly (readonly [Outcome, number])[] = [
  ['intersection', 3],
  ['parallel', 1],
  ['identical', 1],
]

/**
 * Schnittpunkt: S in −6…6 on both axes, slopes in −4…4 (0 rarely) and
 * different, intercepts in −8…8. Parallel: same slope, different intercepts.
 * Identical: g is shown as m(x + q) + r, so the learner sees two different
 * terms of the same function.
 */
function generateIntersectionTask(rng: Rng): FunctionTask {
  const outcome = pickWeighted(rng, OUTCOMES)
  if (outcome === 'parallel') {
    const m = rarelyZeroSlope(rng, 4)
    const n = randInt(rng, -8, 8)
    let other = randInt(rng, -8, 8)
    while (other === n) other = randInt(rng, -8, 8)
    return buildIntersectionTask([m, n], [m, other], outcome)
  }
  if (outcome === 'identical') {
    const m = pick(rng, [2, 3, 4]) * (rng() < 0.5 ? -1 : 1)
    const n = randInt(rng, -8, 8)
    const q = randNonZero(rng, 4)
    const r = n - m * q
    const inner = polynomialToExpr(Polynomial.variable(FUNCTION_VARIABLE).add(Polynomial.constant(q)))
    const bracket = mul(num(m), inner)
    return buildIntersectionTask([m, n], r === 0 ? bracket : add(bracket, num(r)), outcome)
  }
  for (;;) {
    const x = randInt(rng, -6, 6)
    const y = randInt(rng, -6, 6)
    const m = rarelyZeroSlope(rng, 4)
    const k = rarelyZeroSlope(rng, 4)
    const n = int(y - m * x)
    const d = int(y - k * x)
    if (m !== k && Math.abs(n) <= FUNCTION_WINDOW && Math.abs(d) <= FUNCTION_WINDOW) {
      return buildIntersectionTask([m, n], [k, d], outcome)
    }
  }
}

/**
 * Generators of the topic "Lineare Funktionen", the third register next to
 * the term generators (`generators`) and the equation generators
 * (`equationGenerators`): the answers are function equations, points, drawn
 * graphs and equations solved line by line.
 */
export const functionGenerators = {
  [GRAPH]: generateGraphTask,
  [SET_UP]: generateSetUpTask,
  [POINT_ZERO]: generatePointZeroTask,
  [INTERSECTION]: generateIntersectionTask,
} as const satisfies Record<SubtopicId, FunctionTaskGenerator>

/** All subtopics that have a function generator. */
export const FUNCTION_SUBTOPIC_IDS = Object.keys(functionGenerators) as (keyof typeof functionGenerators)[]

const MAX_ATTEMPTS = 200

/** Generates a function task whose key is not in `exclude` (see `generateTask`). */
export function generateFunctionTask(topic: SubtopicId, rng: Rng, exclude: Iterable<string> = []): FunctionTask {
  const excluded = new Set(exclude)
  if (!Object.hasOwn(functionGenerators, topic)) throw new Error(`No function generator for subtopic "${topic}"`)
  const generate: FunctionTaskGenerator = functionGenerators[topic as keyof typeof functionGenerators]
  let task = generate(rng)
  for (let i = 1; i < MAX_ATTEMPTS && excluded.has(task.key); i++) task = generate(rng)
  return task
}

/** A series of function tasks without repetitions. */
export function generateFunctionSeries(topic: SubtopicId, rng: Rng, length = SERIES_LENGTH): FunctionTask[] {
  const tasks: FunctionTask[] = []
  for (let i = 0; i < length; i++) {
    tasks.push(generateFunctionTask(topic, rng, tasks.map((task) => task.key)))
  }
  return tasks
}
