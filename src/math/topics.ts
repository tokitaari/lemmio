import { EQUATION_SUBTOPIC_IDS } from './equations'
import { FUNCTION_SUBTOPIC_IDS } from './functions'
import { SUBTOPIC_IDS } from './tasks'

/**
 * All three registers of subtopics: term tasks (`generators`,
 * `SUBTOPIC_IDS`), equation tasks (`equationGenerators`,
 * `EQUATION_SUBTOPIC_IDS`) and function tasks (`functionGenerators`,
 * `FUNCTION_SUBTOPIC_IDS`). They stay apart because their answers differ: a
 * term, an equation solved line by line, or function equations, points and
 * drawn graphs. Everything that covers all subtopics (catalog test, stored
 * progress) uses this list.
 */
export const ALL_SUBTOPIC_IDS = [...SUBTOPIC_IDS, ...EQUATION_SUBTOPIC_IDS, ...FUNCTION_SUBTOPIC_IDS]

export type TermSubtopicId = (typeof SUBTOPIC_IDS)[number]
export type EquationSubtopicId = (typeof EQUATION_SUBTOPIC_IDS)[number]
export type FunctionSubtopicId = (typeof FUNCTION_SUBTOPIC_IDS)[number]
export type AnySubtopicId = TermSubtopicId | EquationSubtopicId | FunctionSubtopicId

/** True for a subtopic whose tasks are terms (see `generators`). */
export function isTermSubtopic(id: string): id is TermSubtopicId {
  return (SUBTOPIC_IDS as readonly string[]).includes(id)
}

/** True for a subtopic whose tasks are linear equations (see `equationGenerators`). */
export function isEquationSubtopic(id: string): id is EquationSubtopicId {
  return (EQUATION_SUBTOPIC_IDS as readonly string[]).includes(id)
}

/** True for a subtopic whose tasks are about linear functions (see `functionGenerators`). */
export function isFunctionSubtopic(id: string): id is FunctionSubtopicId {
  return (FUNCTION_SUBTOPIC_IDS as readonly string[]).includes(id)
}
