import { useState } from 'react'
import type { SubtopicId } from '../math'
import { applyAnswer, EMPTY_PROGRESS, loadProgress, saveProgress, type SeriesResult, type TopicProgress } from './progress'

/** Progress of one subtopic, kept in React state and mirrored to localStorage. */
export function useSubtopicProgress(topic: SubtopicId) {
  const [progress, setProgress] = useState<TopicProgress>(() => loadProgress(topic))
  const [saveFailed, setSaveFailed] = useState(false)

  const update = (next: TopicProgress) => {
    setProgress(next)
    setSaveFailed(!saveProgress(topic, next))
  }

  return {
    progress,
    /** True if the browser refused to store the progress (it is then lost on reload). */
    saveFailed,
    record: (correct: boolean, series?: SeriesResult) => update(applyAnswer(progress, correct, series)),
    reset: () => update(EMPTY_PROGRESS),
  }
}
