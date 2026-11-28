/**
 * Small helper layer for animations in the browser, without an animation
 * library: Web Animations API plus a few conventions.
 *
 * 1. Keyframes always lead *to* the element's resting style (the last
 *    keyframe equals what CSS shows anyway), and no fill mode keeps values
 *    afterwards. Skipping an animation therefore always leaves the correct
 *    final state.
 * 2. Animations are skipped when the system asks for reduced motion, when the
 *    browser has no Web Animations API (e.g. jsdom in tests) or when they are
 *    aborted. Nothing waits for them in that case.
 * 3. Nothing important is conveyed by motion alone; every animated change is
 *    also visible as a final state.
 */

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Durations in milliseconds; short enough to never hold the learner up.
 * `move` is for pieces that travel across a figure (e.g. a triangle moved
 * or turned by 180°), which look hasty at `long`.
 */
export const DURATION = { short: 150, medium: 250, long: 400, move: 700 } as const

export const EASING = { out: 'cubic-bezier(0.2, 0.8, 0.2, 1)', inOut: 'ease-in-out' } as const

/** Entry keyframes, each ending in the resting style (see convention 1). */
export const ENTER = {
  fade: [{ opacity: 0 }, { opacity: 1 }],
  fromRight: [
    { opacity: 0, transform: 'translateX(1.5rem)' },
    { opacity: 1, transform: 'none' },
  ],
  fromLeft: [
    { opacity: 0, transform: 'translateX(-1.5rem)' },
    { opacity: 1, transform: 'none' },
  ],
  fromBelow: [
    { opacity: 0, transform: 'translateY(0.5rem)' },
    { opacity: 1, transform: 'none' },
  ],
} as const satisfies Record<string, readonly Keyframe[]>

/** True if the system asks for reduced motion; false if the browser cannot tell. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(REDUCED_MOTION_QUERY).matches
}

/** Calls `onChange` when the reduced-motion setting changes; returns the unsubscribe function. */
export function subscribeReducedMotion(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener?.('change', onChange)
  return () => query.removeEventListener?.('change', onChange)
}

export interface MotionOptions {
  /** Overrides the system setting, e.g. from `useReducedMotion()`; default: `prefersReducedMotion()`. */
  reducedMotion?: boolean
  signal?: AbortSignal
}

export interface AnimateOptions extends MotionOptions {
  duration: number
  easing?: string
  delay?: number
}

/**
 * Plays `keyframes` on `element`. Resolves when the animation has finished,
 * was skipped or was aborted; never rejects.
 */
export function animate(
  element: Element | null | undefined,
  keyframes: readonly Keyframe[],
  { duration, easing = EASING.out, delay = 0, reducedMotion, signal }: AnimateOptions,
): Promise<void> {
  const reduced = reducedMotion ?? prefersReducedMotion()
  if (!element || reduced || signal?.aborted || typeof element.animate !== 'function') return Promise.resolve()
  const animation = element.animate([...keyframes], { duration, easing, delay, fill: 'none' })
  const cancel = () => animation.cancel()
  signal?.addEventListener('abort', cancel, { once: true })
  return animation.finished.then(
    () => signal?.removeEventListener('abort', cancel),
    () => signal?.removeEventListener('abort', cancel),
  )
}

/** Waits `ms` milliseconds. Resolves with false if aborted before (or while) waiting. */
export function delay(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false)
  return new Promise((resolve) => {
    const done = (finished: boolean) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(finished)
    }
    const onAbort = () => done(false)
    const timer = setTimeout(() => done(true), ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export interface SequenceStep {
  /** Changes the state and may start animations; awaited before the pause. */
  run: () => void | Promise<void>
  /** Pause after this step in milliseconds (not after the last one). */
  pause?: number
}

/**
 * Runs steps one after another with pauses in between, e.g. to reveal the
 * lines of a transformation. With reduced motion all steps run at once
 * (without pauses), so the learner sees the final state immediately.
 * Resolves with true if all steps ran, false if aborted.
 */
export async function runSequence(steps: readonly SequenceStep[], { reducedMotion, signal }: MotionOptions = {}): Promise<boolean> {
  const reduced = reducedMotion ?? prefersReducedMotion()
  for (const [i, step] of steps.entries()) {
    if (signal?.aborted) return false
    await step.run()
    const last = i === steps.length - 1
    if (!last && !reduced && step.pause && !(await delay(step.pause, signal))) return false
  }
  return !signal?.aborted
}
