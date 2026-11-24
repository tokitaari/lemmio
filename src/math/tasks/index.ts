import type { Rng } from '../random'
import { generateBinomialTask } from './binomial'
import { generateExpandTask } from './expand'
import { generateFactorTask } from './factor'
import type { Task, TaskGenerator, SubtopicId } from './types'

export { buildBinomialTask, FORMULA_NOTES, type BinomialKind, type BinomialParts } from './binomial'
export { buildExpandTask } from './expand'
export { buildBinomialFactorTask, buildCommonFactorTask, buildCommonThenBinomialTask } from './factor'
export { type SolutionStep, type Task, type TaskGenerator, type SubtopicId } from './types'

export const generators = {
  'algebra/terme/ausmultiplizieren': generateExpandTask,
  'algebra/terme/binomische-formeln': generateBinomialTask,
  'algebra/terme/faktorisieren': generateFactorTask,
} as const satisfies Record<SubtopicId, TaskGenerator>

/** All subtopics that have a task generator. */
export const SUBTOPIC_IDS = Object.keys(generators) as (keyof typeof generators)[]

/** Default length of a practice series. */
export const SERIES_LENGTH = 10

const MAX_ATTEMPTS = 200

/**
 * Generates a task whose key is not in `exclude` (e.g. the keys of the
 * current series). Falls back to a repeat only if the generator keeps
 * producing excluded tasks, which does not happen for realistic sizes.
 */
export function generateTask(topic: SubtopicId, rng: Rng, exclude: Iterable<string> = []): Task {
  const excluded = new Set(exclude)
  if (!Object.hasOwn(generators, topic)) throw new Error(`No task generator for subtopic "${topic}"`)
  const generate: TaskGenerator = generators[topic as keyof typeof generators]
  let task = generate(rng)
  for (let i = 1; i < MAX_ATTEMPTS && excluded.has(task.key); i++) task = generate(rng)
  return task
}

/** A series of tasks without repetitions. */
export function generateSeries(topic: SubtopicId, rng: Rng, length = SERIES_LENGTH): Task[] {
  const tasks: Task[] = []
  for (let i = 0; i < length; i++) {
    tasks.push(generateTask(topic, rng, tasks.map((t) => t.key)))
  }
  return tasks
}
