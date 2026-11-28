// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { buildAreaTask, buildPerimeterTask, buildReverseTask, type GeometryTask, type TaskFigure, type Vec } from '../math'
import {
  describeShape,
  distanceToBoundary,
  EXTENSION_OVERSHOOT,
  labelText,
  layoutShape,
  RIGHT_ANGLE_SIZE,
  SHAPE_UNIT,
  shapeViewBox,
  type ShapeLabelLayout,
  type ShapeLayout,
  vertexLabelDirections,
} from '.'

function figureOf(task: GeometryTask): TaskFigure {
  if (task.kind === 'area' || task.kind === 'perimeter' || task.kind === 'reverse') return task.figure
  throw new Error(`no figure for ${task.kind}`)
}

const layout = (task: GeometryTask) => layoutShape(figureOf(task))

function label(l: ShapeLayout, id: string, kind?: ShapeLabelLayout['kind']): ShapeLabelLayout {
  const found = l.labels.find((x) => x.id === id && (!kind || x.kind === kind))
  if (!found) throw new Error(`missing label ${id}`)
  return found
}

/** Point strictly inside a convex polygon given counterclockwise. */
function inside(vertices: readonly Vec[], p: Vec): boolean {
  return vertices.every((a, i) => {
    const b = vertices[(i + 1) % vertices.length] ?? a
    return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) > 1e-9
  })
}

const close = (a: Vec, b: Vec) => {
  expect(a[0]).toBeCloseTo(b[0], 6)
  expect(a[1]).toBeCloseTo(b[1], 6)
}

const ALL: [string, GeometryTask][] = [
  ['parallelogram', buildAreaTask('parallelogram', { g: 6, h: 4 })],
  ['parallelogram with b', buildAreaTask('parallelogram', { g: 6, h: 4, b: 5 })],
  ['parallelogram, height outside', buildAreaTask('parallelogram', { g: 3, h: 2, b: 6 })],
  ['triangle', buildAreaTask('triangle', { g: 6, h: 4 })],
  ['right triangle', buildAreaTask('triangle', { g: 6, h: 4 }, { offset: 0 })],
  ['obtuse triangle', buildAreaTask('triangle', { g: 5, h: 3 }, { offset: -2 })],
  ['rhombus', buildAreaTask('rhombus', { e: 8, f: 6 })],
  ['trapezoid', buildAreaTask('trapezoid', { a: 8, c: 4, h: 3 })],
  ['triangle perimeter', buildPerimeterTask('triangle', { a: 5, b: 4, c: 3 })],
  ['trapezoid perimeter', buildPerimeterTask('trapezoid', { a: 8, b: 3, c: 4, d: 3 })],
  ['rhombus perimeter', buildPerimeterTask('rhombus', { a: 5 })],
  ['reverse', buildReverseTask('triangle', { g: 6, h: 4 }, 'h')],
]

describe('layoutShape: height', () => {
  it('draws a height inside the parallelogram with its right angle and no extension', () => {
    const l = layout(buildAreaTask('parallelogram', { g: 6, h: 4 }))
    const h = l.height
    if (!h) throw new Error('missing height')
    close(h.top, [2, 4])
    close(h.foot, [2, 0])
    expect(h.outside).toBe(false)
    expect(h.onVertex).toBe(false)
    expect(h.extension).toBeNull()
    // Up along the height and towards B, the farther end of AB.
    close(h.rightAngle[0], [2, RIGHT_ANGLE_SIZE])
    close(h.rightAngle[1], [2 + RIGHT_ANGLE_SIZE, RIGHT_ANGLE_SIZE])
    close(h.rightAngle[2], [2 + RIGHT_ANGLE_SIZE, 0])
    // The label fits inside, towards the centre.
    const text = label(l, 'h', 'height')
    expect(text.at[0]).toBeGreaterThan(2)
    expect(inside(l.vertices, text.at)).toBe(true)
  })

  it('extends AB beyond B when the foot lies to the right of the parallelogram', () => {
    const l = layout(buildAreaTask('parallelogram', { g: 3, h: 2, b: 6 }))
    const h = l.height
    if (!h?.extension) throw new Error('missing extension')
    const footX = Math.sqrt(32)
    close(h.foot, [footX, 0])
    expect(h.outside).toBe(true)
    close(h.extension[0], [3, 0])
    close(h.extension[1], [footX + EXTENSION_OVERSHOOT, 0])
    // The right angle opens towards the base, the label goes away from the figure.
    expect(h.rightAngle[2][0]).toBeCloseTo(footX - RIGHT_ANGLE_SIZE)
    expect(label(l, 'h', 'height').at[0]).toBeGreaterThan(footX)
    expect(l.description).toContain('Die Höhe liegt außerhalb, auf der Verlängerung von AB.')
  })

  it('extends AB beyond A for an obtuse triangle with the apex on the left', () => {
    const l = layout(buildAreaTask('triangle', { g: 5, h: 3 }, { offset: -2 }))
    const h = l.height
    if (!h?.extension) throw new Error('missing extension')
    close(h.foot, [-2, 0])
    close(h.extension[0], [0, 0])
    close(h.extension[1], [-2 - EXTENSION_OVERSHOOT, 0])
    expect(h.rightAngle[2][0]).toBeCloseTo(-2 + RIGHT_ANGLE_SIZE)
    expect(label(l, 'h', 'height').at[0]).toBeLessThan(-2)
    // The extension lies within the frame.
    expect(l.bounds.minX).toBeLessThan(-2 - EXTENSION_OVERSHOOT)
  })

  it('treats the height of a right triangle as a side', () => {
    const l = layout(buildAreaTask('triangle', { g: 6, h: 4 }, { offset: 0 }))
    expect(l.height?.onVertex).toBe(true)
    expect(l.height?.outside).toBe(false)
    expect(l.height?.extension).toBeNull()
    expect(label(l, 'h', 'height').at[0]).toBeLessThan(0)
    expect(l.description).toContain('Die Höhe ist zugleich eine Seite.')
  })

  it('draws no height for perimeter figures', () => {
    expect(layout(buildPerimeterTask('triangle', { a: 5, b: 4, c: 3 })).height).toBeNull()
  })
})

describe('layoutShape: labels', () => {
  it('labels the base below AB with letter, number and unit', () => {
    const l = layout(buildAreaTask('triangle', { g: 6, h: 4 }))
    const g = label(l, 'g', 'side')
    expect(g.letter).toBe('g')
    expect(g.text).toBe(' = 6 cm')
    expect(labelText(g)).toBe('g = 6 cm')
    expect(g.at[0]).toBeCloseTo(3)
    expect(g.at[1] + g.height / 2).toBeLessThan(0)
  })

  it('prints halves with a decimal comma', () => {
    const l = layout(buildAreaTask('parallelogram', { g: 6.5, h: 3.5 }))
    expect(labelText(label(l, 'g', 'side'))).toBe('g = 6,5 cm')
    expect(labelText(label(l, 'h', 'height'))).toBe('h = 3,5 cm')
  })

  it('shows the length asked for as "h = ?"', () => {
    const l = layout(buildReverseTask('triangle', { g: 6, h: 4 }, 'h'))
    const h = label(l, 'h', 'height')
    expect(labelText(h)).toBe('h = ?')
    expect(h.given).toBe(false)
    expect(l.description).toBe('Dreieck ABC: Grundseite g = 6 cm, Höhe h gesucht.')
  })

  it('names the vertices counterclockwise, each outside its corner', () => {
    const l = layout(buildAreaTask('trapezoid', { a: 8, c: 4, h: 3 }))
    const names = l.labels.filter((x) => x.kind === 'vertex').map((x) => x.text)
    expect(names).toEqual(['A', 'B', 'C', 'D'])
    const a = label(l, 'A', 'vertex')
    expect(a.at[0]).toBeLessThan(0)
    expect(a.at[1]).toBeLessThan(0)
    const c = label(l, 'C', 'vertex')
    expect(c.at[0]).toBeGreaterThan(6)
    expect(c.at[1]).toBeGreaterThan(3)
  })

  it.each(ALL)('keeps side and vertex labels outside the %s and inside the frame', (_, task) => {
    const l = layout(task)
    for (const x of l.labels) {
      if (x.kind === 'side' || x.kind === 'vertex') expect(inside(l.vertices, x.at)).toBe(false)
      expect(x.at[0] - x.width / 2).toBeGreaterThanOrEqual(l.bounds.minX)
      expect(x.at[0] + x.width / 2).toBeLessThanOrEqual(l.bounds.maxX)
      expect(x.at[1] - x.height / 2).toBeGreaterThanOrEqual(l.bounds.minY)
      expect(x.at[1] + x.height / 2).toBeLessThanOrEqual(l.bounds.maxY)
    }
    for (const v of l.vertices) {
      expect(v[0]).toBeGreaterThan(l.bounds.minX)
      expect(v[1]).toBeLessThan(l.bounds.maxY)
    }
  })
})

describe('layoutShape: rhombus', () => {
  it('draws both diagonals with a right angle and labels them away from the centre', () => {
    const l = layout(buildAreaTask('rhombus', { e: 8, f: 6 }))
    const d = l.diagonals
    if (!d) throw new Error('missing diagonals')
    close(d.center, [4, 0])
    expect(d.lines).toHaveLength(2)
    close(d.rightAngle[1], [4 + RIGHT_ANGLE_SIZE, RIGHT_ANGLE_SIZE])
    const e = label(l, 'e', 'diagonal')
    expect(e.at[0]).toBeCloseTo(2)
    expect(e.at[1]).toBeGreaterThan(0)
    const f = label(l, 'f', 'diagonal')
    expect(f.at[1]).toBeCloseTo(1.5)
    expect(f.at[0]).toBeGreaterThan(4)
    expect(l.height).toBeNull()
    expect(l.description).toBe('Raute ABCD: Diagonale e = 8 cm, Diagonale f = 6 cm.')
  })

  it('has no diagonals for a rhombus given by its side', () => {
    expect(layout(buildPerimeterTask('rhombus', { a: 5 })).diagonals).toBeNull()
  })
})

describe('frame and helpers', () => {
  it('turns the bounds into a viewBox in SVG units with y down', () => {
    expect(shapeViewBox({ minX: -1, minY: -0.5, maxX: 6, maxY: 4 })).toEqual({
      x: -1 * SHAPE_UNIT,
      y: -4 * SHAPE_UNIT,
      width: 7 * SHAPE_UNIT,
      height: 4.5 * SHAPE_UNIT,
    })
  })

  it('measures the distance to the boundary along a direction', () => {
    const square: Vec[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ]
    expect(distanceToBoundary(square, [1, 2], [1, 0])).toBeCloseTo(3)
    expect(distanceToBoundary(square, [1, 2], [-1, 0])).toBeCloseTo(1)
    expect(distanceToBoundary(square, [5, 2], [1, 0])).toBe(Infinity)
  })

  it('describes a figure with its lengths', () => {
    expect(describeShape(figureOf(buildAreaTask('triangle', { g: 6, h: 4 })))).toBe(
      'Dreieck ABC: Grundseite g = 6 cm, Höhe h = 4 cm.',
    )
    expect(describeShape(figureOf(buildPerimeterTask('parallelogram', { a: 6, b: 4 })))).toBe(
      'Parallelogramm ABCD: Seite a = 6 cm, Seite b = 4 cm.',
    )
  })
})

describe('vertex label directions', () => {
  it('points outside along the bisector, like the vertex names of layoutShape', () => {
    // Trapezoid with a short top side CD: the names of C and D lean away from the side label c above CD.
    const vertices: Vec[] = [
      [0, 0],
      [8, 0],
      [6, 3],
      [2, 3],
    ]
    const [a, b, c, d] = vertexLabelDirections(vertices)
    for (const dir of [a, b, c, d]) expect(Math.hypot(dir![0], dir![1])).toBeCloseTo(1)
    expect(a![0]).toBeLessThan(0)
    expect(a![1]).toBeLessThan(0)
    expect(b![0]).toBeGreaterThan(0)
    expect(c![0]).toBeGreaterThan(0)
    expect(c![1]).toBeGreaterThan(0)
    expect(d![0]).toBeLessThan(0)
    expect(d![1]).toBeGreaterThan(0)
  })

  it('matches the side of the vertex names in layoutShape', () => {
    const task = buildAreaTask('trapezoid', { a: 8, c: 4, h: 3 })
    const layout = layoutShape(figureOf(task))
    const directions = vertexLabelDirections(layout.vertices)
    layout.labels
      .filter((label) => label.kind === 'vertex')
      .forEach((label, i) => {
        const v = layout.vertices[i]!
        const dir = directions[i]!
        const away = (label.at[0] - v[0]) * dir[0] + (label.at[1] - v[1]) * dir[1]
        expect(away).toBeGreaterThan(0)
      })
  })
})
