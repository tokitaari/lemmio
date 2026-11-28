import type { Markup } from '../content/types'
import { areEquivalent, checkAnswer, parse, type Expr } from '../math'
import { areaModelProblems, areaModelTerms, buildAreaModel } from './areaModel'
import { balanceProblems, balanceTerms, buildBalance } from './balance'
import { termQuestionKey } from './deck'
import { buildEquationSteps, equationStepsLatex, equationStepsProblems, equationStepsTerms } from './equationSteps'
import { buildLinePoints, linePointsLatex, linePointsProblems } from './linePoints'
import { buildLineSliders, lineSlidersLatex, lineSlidersProblems } from './lineSliders'
import { buildValueTable, valueTableLatex, valueTableProblems } from './valueTable'
import { buildSlopeTriangle, slopeTriangleLatex, slopeTriangleProblems } from './slopeTriangle'
import { buildShapePoints, shapePointsLatex, shapePointsProblems } from './shapePoints'
import { buildShapeSliders, shapeSlidersLatex, shapeSlidersProblems } from './shapeSliders'
import { CARD_ID, DECK_ID } from './storage'
import { buildTwoLines, twoLinesLatex, twoLinesProblems } from './twoLines'
import type { Card, CardQuestion, CardWidget, Deck } from './types'

/**
 * Checks the structure of a deck and returns the problems found (empty if
 * the deck is fine). Content tests call it for every deck, so a broken deck
 * fails the CI. Markup claims (`$a = b$`) are checked separately with the
 * texts from `deckMarkup`, like all other content texts.
 */
export function validateDeck(deck: Deck): string[] {
  const problems: string[] = []
  if (!DECK_ID.test(deck.id)) problems.push(`deck id "${deck.id}" must be lower-case segments joined by "/"`)
  if (deck.cards.length === 0) problems.push('deck has no cards')

  const seen = new Set<string>()
  for (const card of deck.cards) {
    const at = `card "${card.id}"`
    if (!CARD_ID.test(card.id)) problems.push(`${at}: id must be lower case with hyphens`)
    if (seen.has(card.id)) problems.push(`${at}: duplicate id`)
    seen.add(card.id)
    if (card.title.trim() === '') problems.push(`${at}: empty title`)
    if (card.body.length === 0) problems.push(`${at}: no text`)
    if (card.widget) problems.push(...widgetProblems(card.widget).map((p) => `${at}: ${p}`))
    if (card.question) problems.push(...questionProblems(card.question).map((p) => `${at}: ${p}`))
  }
  return problems
}

function tryParse(term: string): Expr | null {
  try {
    return parse(term)
  } catch {
    return null
  }
}

function widgetProblems(widget: CardWidget): string[] {
  switch (widget.kind) {
    case 'term-steps': {
      const start = tryParse(widget.start)
      if (!start) return [`term-steps: start "${widget.start}" does not parse`]
      if (widget.steps.length === 0) return ['term-steps: no steps']
      return widget.steps.flatMap((step) => {
        const expr = tryParse(step.term)
        if (!expr) return [`term-steps: "${step.term}" does not parse`]
        return areEquivalent(start, expr) ? [] : [`term-steps: "${step.term}" is not equivalent to "${widget.start}"`]
      })
    }
    case 'area-model':
      return areaModelProblems(widget)
    case 'balance':
      return balanceProblems(widget)
    case 'equation-steps':
      return equationStepsProblems(widget)
    case 'line-sliders':
      return lineSlidersProblems(widget)
    case 'slope-triangle':
      return slopeTriangleProblems(widget)
    case 'line-points':
      return linePointsProblems(widget)
    case 'value-table':
      return valueTableProblems(widget)
    case 'two-lines':
      return twoLinesProblems(widget)
    case 'shape-sliders':
      return shapeSlidersProblems(widget)
    case 'shape-points':
      return shapePointsProblems(widget)
  }
}

function questionProblems(question: CardQuestion): string[] {
  switch (question.kind) {
    case 'choice': {
      const problems: string[] = []
      if (question.options.length < 2) problems.push('choice: needs at least two options')
      const correct = question.options.filter((o) => o.correct === true).length
      if (correct !== 1) problems.push(`choice: needs exactly one correct option, has ${correct}`)
      return problems
    }
    case 'term': {
      const problems: string[] = []
      if (question.term !== undefined && !tryParse(question.term)) problems.push(`term: "${question.term}" does not parse`)
      if (!tryParse(question.answer)) return [...problems, `term: answer "${question.answer}" does not parse`]
      const result = checkAnswer(termQuestionKey(question), question.answer)
      if (result.kind !== 'correct') problems.push(`term: answer "${question.answer}" fails its own check (${result.kind})`)
      for (const v of question.variables ?? []) {
        if (!/^[a-z]$/.test(v)) problems.push(`term: variable key "${v}" must be a single lower-case letter`)
      }
      return problems
    }
  }
}

/**
 * Every term a deck typesets outside its markup: the lines of its widgets and
 * the terms shown with term questions. Content tests render them with KaTeX
 * in strict mode. Widgets with problems are skipped (`validateDeck` reports them).
 */
export function deckTerms(deck: Deck): string[] {
  return deck.cards.flatMap(cardTerms)
}

function cardTerms(card: Card): string[] {
  const terms: string[] = []
  const widget = card.widget
  if (widget?.kind === 'term-steps') terms.push(widget.start, ...widget.steps.map((s) => s.term))
  if (widget?.kind === 'area-model' && areaModelProblems(widget).length === 0) {
    terms.push(...areaModelTerms(buildAreaModel(widget)))
  }
  if (widget?.kind === 'balance' && balanceProblems(widget).length === 0) terms.push(...balanceTerms(buildBalance(widget)))
  if (widget?.kind === 'equation-steps' && equationStepsProblems(widget).length === 0) {
    terms.push(...equationStepsTerms(widget))
  }
  if (card.question?.kind === 'term' && card.question.term !== undefined) terms.push(card.question.term)
  return terms
}

/**
 * LaTeX that a deck shows besides terms and markup, e.g. operations,
 * intermediate lines and solution sets of equation steps, or the start
 * equations of the line widgets, including a term given for g in
 * `two-lines`, or the start calculation of the geometry widgets (their
 * other states are covered by the unit tests of the widgets). Content tests render it with KaTeX in strict
 * mode. Widgets with problems are skipped.
 */
export function deckLatex(deck: Deck): string[] {
  return deck.cards.flatMap((card) => {
    const widget = card.widget
    if (!widget || widgetProblems(widget).length > 0) return []
    switch (widget.kind) {
      case 'equation-steps':
        return equationStepsLatex(buildEquationSteps(widget))
      case 'line-sliders':
        return lineSlidersLatex(buildLineSliders(widget))
      case 'slope-triangle':
        return slopeTriangleLatex(buildSlopeTriangle(widget))
      case 'line-points':
        return linePointsLatex(buildLinePoints(widget))
      case 'value-table':
        return valueTableLatex(buildValueTable(widget))
      case 'two-lines':
        return twoLinesLatex(buildTwoLines(widget))
      case 'shape-sliders':
        return shapeSlidersLatex(buildShapeSliders(widget))
      case 'shape-points':
        return shapePointsLatex(buildShapePoints(widget))
      default:
        return []
    }
  })
}

/** Every markup text of a deck: card texts, step notes, prompts, options, option feedback, explanations. */
export function deckMarkup(deck: Deck): Markup[] {
  return deck.cards.flatMap(cardMarkup)
}

function cardMarkup(card: Card): Markup[] {
  const texts = [...card.body]
  const widget = card.widget
  if (widget?.kind === 'term-steps') texts.push(...widget.steps.flatMap((s) => (s.note ? [s.note] : [])))
  if (widget?.kind === 'equation-steps') texts.push(...widget.steps.flatMap((s) => (s.note ? [s.note] : [])))
  const q = card.question
  if (q) {
    texts.push(q.prompt)
    if (q.explanation) texts.push(q.explanation)
    if (q.kind === 'choice') texts.push(...q.options.flatMap((o) => [o.text, ...(o.feedback ? [o.feedback] : [])]))
  }
  return texts
}
