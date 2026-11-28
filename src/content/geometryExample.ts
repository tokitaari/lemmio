import type { GeometryTask } from '../math'
import type { GeometryExampleTask } from './types'

/**
 * Narrows a task of the geometry builders to a worked example with a figure:
 * `buildAreaTask`, `buildPerimeterTask` and `buildReverseTask` are typed as
 * `GeometryTask`, drawing tasks are no examples.
 *
 * @throws RangeError for a drawing task.
 */
export function exampleTask(task: GeometryTask): GeometryExampleTask {
  if (task.kind !== 'area' && task.kind !== 'perimeter' && task.kind !== 'reverse') {
    throw new RangeError(`No worked example for ${task.kind}`)
  }
  return task
}
