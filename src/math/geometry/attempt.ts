import { TermError, toErrorInfo, type TermErrorInfo } from '../errors'

export type Attempt<T> = { ok: true; value: T } | { ok: false; error: TermErrorInfo }

/** Runs `read` and turns a TermError into a result; other errors are rethrown. */
export function attempt<T>(read: () => T): Attempt<T> {
  try {
    return { ok: true, value: read() }
  } catch (e) {
    if (e instanceof TermError) return { ok: false, error: toErrorInfo(e) }
    throw e
  }
}
