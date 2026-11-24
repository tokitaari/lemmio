import { initialDeckState, lastReachable, type DeckState, type QuestionState, type Resolution } from './deck'
import type { Card, Deck } from './types'

/**
 * localStorage entry for the card decks of all subtopics. Separate from the
 * practice progress (`lemmio:progress`) and the theme (`lemmio:theme`), so
 * resetting one never touches the others. Stays on the device.
 */
export const CARDS_STORAGE_KEY = 'lemmio:cards'

const STORAGE_VERSION = 1

/**
 * What is kept per deck: the visible card and the resolved questions, both by
 * card id (not by position), so a deck can be edited without breaking the
 * stored state. Answers and feedback are not stored.
 */
export interface StoredDeck {
  current: string
  resolved: Record<string, Resolution>
}

/** Card ids: lower case, digits, hyphens (checked for every deck in validateDeck). */
export const CARD_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Deck ids: card-id segments joined by "/", e.g. a SubtopicId. Also keeps keys like "__proto__" out. */
export const DECK_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isResolution(value: unknown): value is Resolution {
  return value === 'correct' || value === 'revealed'
}

/** Structural check only; whether the ids exist is decided against the deck in `restoreDeckState`. */
function parseStoredDeck(value: unknown): StoredDeck | null {
  if (!isRecord(value) || typeof value.current !== 'string' || !CARD_ID.test(value.current)) return null
  if (!isRecord(value.resolved)) return null
  const resolved: Record<string, Resolution> = {}
  for (const [id, resolution] of Object.entries(value.resolved)) {
    if (CARD_ID.test(id) && isResolution(resolution)) resolved[id] = resolution
  }
  return { current: value.current, resolved }
}

/** Rebuilds the state of a deck from stored data; unknown cards are ignored and the position is kept reachable. */
export function restoreDeckState(cards: readonly Card[], stored: StoredDeck | null): DeckState {
  if (!stored) return initialDeckState()
  const questions: Record<string, QuestionState> = {}
  for (const card of cards) {
    const resolution = Object.hasOwn(stored.resolved, card.id) ? stored.resolved[card.id] : undefined
    if (card.question && resolution) questions[card.id] = { resolved: resolution, misses: 0, feedback: null }
  }
  const state: DeckState = { index: 0, questions }
  const found = cards.findIndex((card) => card.id === stored.current)
  return { ...state, index: found === -1 ? 0 : Math.min(found, lastReachable(cards, state)) }
}

/** The part of a state worth storing; null at the very start (first card, nothing resolved). */
export function toStoredDeck(cards: readonly Card[], state: DeckState): StoredDeck | null {
  const resolved: Record<string, Resolution> = {}
  for (const card of cards) {
    const resolution = Object.hasOwn(state.questions, card.id) ? state.questions[card.id]?.resolved : null
    if (resolution) resolved[card.id] = resolution
  }
  const current = cards[state.index]?.id
  if (current === undefined || (state.index === 0 && Object.keys(resolved).length === 0)) return null
  return { current, resolved }
}

/** localStorage can be missing or throw (private mode, blocked cookies); never let that break the page. */
function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readAll(storage: Storage | null): Record<string, StoredDeck> {
  if (!storage) return {}
  try {
    const raw = storage.getItem(CARDS_STORAGE_KEY)
    if (!raw) return {}
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== STORAGE_VERSION || !isRecord(data.decks)) return {}
    const decks: Record<string, StoredDeck> = {}
    for (const [id, value] of Object.entries(data.decks)) {
      const parsed = DECK_ID.test(id) ? parseStoredDeck(value) : null
      if (parsed) decks[id] = parsed
    }
    return decks
  } catch {
    return {}
  }
}

export function loadDeckState(deck: Deck): DeckState {
  const decks = readAll(getStorage())
  return restoreDeckState(deck.cards, Object.hasOwn(decks, deck.id) ? (decks[deck.id] ?? null) : null)
}

/**
 * Stores the state of one deck and leaves the others untouched; the start
 * state removes the entry. Returns false if the browser refused to save.
 */
export function saveDeckState(deck: Deck, state: DeckState): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    const decks = readAll(storage)
    const stored = toStoredDeck(deck.cards, state)
    if (stored) decks[deck.id] = stored
    else delete decks[deck.id]
    if (Object.keys(decks).length === 0) storage.removeItem(CARDS_STORAGE_KEY)
    else storage.setItem(CARDS_STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, decks }))
    return true
  } catch {
    return false
  }
}
