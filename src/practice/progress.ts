import { ALL_SUBTOPIC_IDS, type SubtopicId } from '../math'

/** Result of one completed series, e.g. 8 of 10. */
export interface SeriesResult {
  correct: number
  total: number
}

/** Practice progress of one subtopic. */
export interface TopicProgress {
  /** Tasks finished so far (a revealed solution counts as wrong). */
  answered: number
  correct: number
  /** Result of the last completed series, if any. */
  lastSeries: SeriesResult | null
}

export const EMPTY_PROGRESS: TopicProgress = { answered: 0, correct: 0, lastSeries: null }

/** Single localStorage entry for all subtopics; stays on the device, nothing is sent anywhere. */
export const STORAGE_KEY = 'lemmio:progress'

const STORAGE_VERSION = 1
const MAX_COUNT = 1_000_000

type StoredTopics = Partial<Record<SubtopicId, TopicProgress>>

/** Progress after one finished task; `series` is set when that task completed a series. */
export function applyAnswer(progress: TopicProgress, correct: boolean, series?: SeriesResult): TopicProgress {
  return {
    answered: Math.min(progress.answered + 1, MAX_COUNT),
    correct: Math.min(progress.correct + (correct ? 1 : 0), MAX_COUNT),
    lastSeries: series ?? progress.lastSeries,
  }
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_COUNT
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSeries(value: unknown): SeriesResult | null {
  if (!isRecord(value) || !isCount(value.correct) || !isCount(value.total)) return null
  if (value.total === 0 || value.correct > value.total) return null
  return { correct: value.correct, total: value.total }
}

/** Accepts only well-formed entries; anything else counts as "no progress". */
function parseTopicProgress(value: unknown): TopicProgress | null {
  if (!isRecord(value) || !isCount(value.answered) || !isCount(value.correct)) return null
  if (value.correct > value.answered) return null
  return { answered: value.answered, correct: value.correct, lastSeries: parseSeries(value.lastSeries) }
}

/** localStorage can be missing or throw (private mode, blocked cookies); never let that break the page. */
function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readAll(storage: Storage | null): StoredTopics {
  if (!storage) return {}
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== STORAGE_VERSION || !isRecord(data.topics)) return {}
    const topics: StoredTopics = {}
    for (const id of ALL_SUBTOPIC_IDS) {
      const parsed = parseTopicProgress(data.topics[id])
      if (parsed) topics[id] = parsed
    }
    return topics
  } catch {
    return {}
  }
}

export function loadProgress(topic: SubtopicId): TopicProgress {
  return readAll(getStorage())[topic] ?? EMPTY_PROGRESS
}

/**
 * Stores the progress of one subtopic and leaves the others untouched.
 * `EMPTY_PROGRESS` removes the entry. Returns false if the browser refused to save.
 */
export function saveProgress(topic: SubtopicId, progress: TopicProgress): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    const topics = readAll(storage)
    if (progress.answered === 0 && progress.lastSeries === null) delete topics[topic]
    else topics[topic] = progress
    if (Object.keys(topics).length === 0) storage.removeItem(STORAGE_KEY)
    else storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, topics }))
    return true
  } catch {
    return false
  }
}
