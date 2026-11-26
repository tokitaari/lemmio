import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildAreaTask, buildReverseTask, type GeometryTask, type TaskFigure } from '../../math'
import { layoutShape } from '../../shapes'
import ShapeDrawing from './ShapeDrawing'
import ShapeFigure from './ShapeFigure'

function figureOf(task: GeometryTask): TaskFigure {
  if (task.kind === 'area' || task.kind === 'perimeter' || task.kind === 'reverse') return task.figure
  throw new Error(`no figure for ${task.kind}`)
}

const texts = (container: HTMLElement) => [...container.querySelectorAll('.shape-text')].map((t) => t.textContent)

describe('ShapeFigure', () => {
  it('is one image described by its lengths, with labels and a dashed height', () => {
    const { container } = render(<ShapeFigure figure={figureOf(buildAreaTask('triangle', { g: 6, h: 4 }))} label="Figur zur Aufgabe" />)
    const svg = screen.getByRole('img', { name: 'Figur zur Aufgabe. Dreieck ABC: Grundseite g = 6 cm, Höhe h = 4 cm.' })
    // The drawing inside is hidden, so the figure is announced once.
    expect(svg.querySelector('.shape-drawing')).toHaveAttribute('aria-hidden', 'true')
    expect(texts(container)).toEqual(['A', 'B', 'C', 'g = 6 cm', 'h = 4 cm'])
    expect(container.querySelector('.shape-letter')?.textContent).toBe('g')
    expect(container.querySelector('.shape-height-line')).not.toBeNull()
    expect(container.querySelector('.shape-right-angle')).not.toBeNull()
    expect(container.querySelector('.shape-extension')).toBeNull()
  })

  it('keeps 1 cm at the same size: the maximum width follows the viewBox', () => {
    const { container } = render(<ShapeFigure figure={figureOf(buildAreaTask('triangle', { g: 6, h: 4 }))} />)
    const svg = container.querySelector('svg')
    const width = Number(svg?.getAttribute('viewBox')?.split(' ')[2])
    expect(svg?.style.maxWidth).toBe(`${Math.round(width * 1.25)}px`)
  })

  it('extends the base for a height outside and marks the length asked for', () => {
    const { container } = render(<ShapeFigure figure={figureOf(buildReverseTask('triangle', { g: 5, h: 3 }, 'h', { offset: -2 }))} />)
    expect(screen.getByRole('img', { name: /Höhe h gesucht\. Die Höhe liegt außerhalb, auf der Verlängerung von AB\.$/ })).toBeInTheDocument()
    expect(container.querySelector('.shape-extension')).not.toBeNull()
    const unknown = container.querySelector('.shape-text.is-unknown')
    expect(unknown?.textContent).toBe('h = ?')
  })

  it('draws the diagonals of a rhombus without a height', () => {
    const { container } = render(<ShapeFigure figure={figureOf(buildAreaTask('rhombus', { e: 8, f: 6 }))} />)
    expect(container.querySelectorAll('.shape-diagonal')).toHaveLength(2)
    expect(container.querySelector('.shape-height')).toBeNull()
    expect(texts(container)).toContain('e = 8 cm')
  })

  it('draws a right triangle without a second line for the height', () => {
    const { container } = render(<ShapeFigure figure={figureOf(buildAreaTask('triangle', { g: 6, h: 4 }, { offset: 0 }))} />)
    expect(container.querySelector('.shape-height-line')).toBeNull()
    expect(container.querySelector('.shape-right-angle')).not.toBeNull()
  })
})

describe('ShapeDrawing', () => {
  const layout = layoutShape(figureOf(buildAreaTask('parallelogram', { g: 6, h: 4 })))

  it('is an image of its own outside ShapeFigure, e.g. as an overlay', () => {
    render(
      <svg>
        <ShapeDrawing layout={layout} />
      </svg>,
    )
    expect(screen.getByRole('img', { name: 'Parallelogramm ABCD: Grundseite g = 6 cm, Höhe h = 4 cm.' })).toBeInTheDocument()
  })

  it('leaves out outline and vertex names above a polygon and dashes an attempt', () => {
    const { container, rerender } = render(
      <svg>
        <ShapeDrawing layout={layout} outline={false} decorative />
      </svg>,
    )
    expect(container.querySelector('.shape-outline')).toBeNull()
    expect(texts(container)).toEqual(['g = 6 cm', 'h = 4 cm'])
    rerender(
      <svg>
        <ShapeDrawing layout={layout} variant="attempt" decorative />
      </svg>,
    )
    expect(container.querySelector('.shape-drawing')).toHaveClass('is-attempt')
    expect(container.querySelector('.shape-outline')).not.toBeNull()
  })
})
