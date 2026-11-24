import { EQUATION_SUBTOPIC_IDS } from './equations'
import { FUNCTION_SUBTOPIC_IDS } from './functions'
import { SUBTOPIC_IDS } from './tasks'

/**
 * Both registers of subtopics: term tasks (`generators`, `SUBTOPIC_IDS`) and
 * equation tasks (`equationGenerators`, `EQUATION_SUBTOPIC_IDS`). They stay
 * apart because an equation is solved line by line and has no single term as
 * its answer; everything that covers all subtopics (catalog test, stored
 * progress) uses this list.
 *
 * Function tasks (`functionGenerators`, `FUNCTION_SUBTOPIC_IDS`) are the third
 * register. They join this list together with their catalog entries and
 * contents (unit 3, sub-task 6); until then they have no page.
 */
export const ALL_SUBTOPIC_IDS = [...SUBTOPIC_IDS, ...EQUATION_SUBTOPIC_IDS]

export type TermSubtopicId = (typeof SUBTOPIC_IDS)[number]
export type EquationSubtopicId = (typeof EQUATION_SUBTOPIC_IDS)[number]
export type AnySubtopicId = TermSubtopicId | EquationSubtopicId
export type FunctionSubtopicId = (typeof FUNCTION_SUBTOPIC_IDS)[number]

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
