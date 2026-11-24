import type { Expr } from '../ast'
import type { AnswerKey } from '../check'
import type { Rng } from '../random'

/**
 * Identifies a subtopic (Teilthema) as `area/topic/subtopic`, e.g.
 * "algebra/terme/ausmultiplizieren". It is the route path without the leading
 * slash and the key for task generators, contents and stored progress.
 * Which ids exist is decided by the generator registry (`SUBTOPIC_IDS`) and the
 * catalog (src/catalog.ts), not by this type.
 */
export type SubtopicId = `${string}/${string}/${string}`

/** One line of a worked solution: `previous = expr`, optionally explained by `note` (German). */
export interface SolutionStep {
  expr: Expr
  note?: string
}

export interface Task extends AnswerKey {
  topic: SubtopicId
  /** Generator variant, e.g. "square-plus"; useful for tests and later statistics. */
  variant: string
  /** Identity of the exercise (the printed prompt); used to avoid repetitions. */
  key: string
  /** German instruction, e.g. "Multipliziere aus und fasse zusammen." */
  instruction: string
  /** The term to transform. */
  prompt: Expr
  /** Worked solution from the prompt to `solution`; every step is equivalent to the prompt. */
  steps: SolutionStep[]
  /** Model answer (the last step). */
  solution: Expr
}

export type TaskGenerator = (rng: Rng) => Task
