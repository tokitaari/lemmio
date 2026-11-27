import { useMemo } from 'react'
import type { TaskFigure } from '../../math'
import { layoutShape, PX_PER_UNIT, shapeViewBox, type ShapeBounds } from '../../shapes'
import ShapeDrawing from './ShapeDrawing'

export interface ShapeFigureProps {
  figure: TaskFigure
  /** Accessible name in front of the description, e.g. "Figur zur Aufgabe". */
  label?: string
  /**
   * Fixed frame in cm instead of the figure's own bounds, e.g. one that holds
   * the figure at every slider position, so the page does not jump.
   */
  bounds?: ShapeBounds
}

/**
 * Static figure true to scale: 1 cm is the same size in every figure (25 px
 * at full size), so a small triangle looks small; on narrow screens the
 * figure shrinks to the available width. Sides are labelled outside
 * ("g = 6,5 cm"), the length asked for as "h = ?", the height is dashed with
 * a right angle, and the base is extended when the foot lies outside.
 */
export default function ShapeFigure({ figure, label, bounds }: ShapeFigureProps) {
  const layout = useMemo(() => layoutShape(figure), [figure])
  const box = shapeViewBox(bounds ?? layout.bounds)
  const name = label ? `${label}. ${layout.description}` : layout.description
  return (
    <svg
      className="shape-svg"
      viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`}
      style={{ maxWidth: `${Math.round(box.width * PX_PER_UNIT)}px` }}
      role="img"
      aria-label={name}
    >
      <ShapeDrawing layout={layout} decorative />
    </svg>
  )
}
