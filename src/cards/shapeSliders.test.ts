// @vitest-environment node
import katex from 'katex'
import { describe, expect, it } from 'vitest'
import { layoutShape } from '../shapes'
import {
  buildShapeSliders,
  fixedLengthText,
  initialShapeValues,
  lengthText,
  shapeCalculation,
  shapeLetters,
  shapeSlidersLatex,
  shapeSlidersProblems,
  shapeSliderValueText,
} from './shapeSliders'
import type { ShapeSlidersWidget } from './types'

const widget = (extra: Omit<ShapeSlidersWidget, 'kind'>): ShapeSlidersWidget => ({
  kind: 'shape-sliders',
  ...extra,
})

const parallelogram = widget({ shape: 'parallelogram', measures: { g: { value: 6, min: 2, max: 10 }, h: { value: 4, min: 1, max: 8 } } })

describe('shape-sliders checks', () => {
  it('needs exactly the letters of the formula', () => {
    expect(shapeLetters('trapezoid', 'area')).toEqual(['a', 'c', 'h'])
    expect(shapeLetters('trapezoid', 'perimeter')).toEqual(['a', 'b', 'c', 'd'])
    expect(shapeSlidersProblems(widget({ shape: 'triangle', measures: { g: 6 } }))).toEqual(['shape-sliders: missing length h'])
    expect(shapeSlidersProblems(widget({ shape: 'rhombus', measures: { e: 4, f: 6, a: 3 } }))).toEqual([
      'shape-sliders: the area formula of a rhombus has no length a',
    ])
    expect(shapeSlidersProblems(widget({ shape: 'rhombus', quantity: 'perimeter', measures: { a: 3 } }))).toEqual([])
  })

  it('needs lengths that are whole or end in ,5 within 1…12 cm, and sensible ranges', () => {
    expect(shapeSlidersProblems(widget({ shape: 'parallelogram', measures: { g: 6.25, h: { value: 4, min: 1, max: 13 } } }))).toEqual([
      'shape-sliders: g must be whole or end in ,5',
      'shape-sliders: h must stay within 1…12 cm',
    ])
    expect(shapeSlidersProblems(widget({ shape: 'parallelogram', measures: { g: 6, h: { value: 4, min: 4, max: 4 } } }))).toEqual([
      'shape-sliders: range of h is empty (4…4)',
    ])
    expect(shapeSlidersProblems(widget({ shape: 'parallelogram', measures: { g: 6, h: { value: 9, min: 1, max: 8 } } }))).toEqual([
      'shape-sliders: h = 9 lies outside its range 1…8',
    ])
    expect(shapeSlidersProblems(parallelogram)).toEqual([])
    // Default range 1…10.
    expect(buildShapeSliders(widget({ shape: 'rhombus', measures: { e: { value: 4 }, f: 6 } })).sliders).toEqual([
      { letter: 'e', value: 4, min: 1, max: 10, varies: true },
      { letter: 'f', value: 6, min: 6, max: 6, varies: false },
    ])
  })

  it('allows an offset only for the area of a parallelogram, triangle or trapezoid', () => {
    expect(shapeSlidersProblems(widget({ shape: 'rhombus', measures: { e: 4, f: 6 }, offset: 1 }))).toEqual([
      'shape-sliders: offset is only for the area of a parallelogram, triangle or trapezoid',
    ])
    expect(shapeSlidersProblems(widget({ shape: 'triangle', quantity: 'perimeter', measures: { a: 3, b: 4, c: 5 }, offset: 1 }))).toEqual([
      'shape-sliders: offset is only for the area of a parallelogram, triangle or trapezoid',
    ])
    expect(shapeSlidersProblems(widget({ shape: 'triangle', measures: { g: 4, h: 3 }, offset: 0.3 }))).toEqual([
      'shape-sliders: offset must be a multiple of 0,5 in -6…12',
    ])
    expect(shapeSlidersProblems(widget({ shape: 'triangle', measures: { g: 4, h: 3 }, offset: -2.5 }))).toEqual([])
  })

  it('needs a figure at every slider position', () => {
    expect(
      shapeSlidersProblems(widget({ shape: 'trapezoid', measures: { a: { value: 6, min: 4, max: 8 }, c: { value: 3, min: 2, max: 4 }, h: 3 } })),
    ).toEqual(['shape-sliders: c must stay shorter than a for every slider position'])
    expect(
      shapeSlidersProblems(widget({ shape: 'trapezoid', measures: { a: { value: 6, min: 5, max: 8 }, c: { value: 3, min: 2, max: 4.5 }, h: 3 } })),
    ).toEqual([])
    expect(
      shapeSlidersProblems(widget({ shape: 'triangle', quantity: 'perimeter', measures: { a: { value: 5, min: 2, max: 9 }, b: 4, c: 3 } })),
    ).toEqual(['shape-sliders: a must stay shorter than the other two sides together for every slider position'])
    expect(
      shapeSlidersProblems(widget({ shape: 'triangle', quantity: 'perimeter', measures: { a: { value: 5, min: 4, max: 6 }, b: 4, c: 6 } })),
    ).toEqual([])
    expect(shapeSlidersProblems(widget({ shape: 'trapezoid', quantity: 'perimeter', measures: { a: 8, b: 3, c: 4, d: 3 } }))).toEqual([])
    expect(
      shapeSlidersProblems(widget({ shape: 'trapezoid', quantity: 'perimeter', measures: { a: 8, b: { value: 3, min: 1, max: 3 }, c: 4, d: 3 } })),
    ).toEqual(['shape-sliders: there is no trapezoid for every slider position (need |b − d| < a − c < b + d)'])
  })
})

describe('shape-sliders model', () => {
  const model = buildShapeSliders(parallelogram)

  it('starts with the given lengths and inserts them into the formula', () => {
    const values = initialShapeValues(model)
    expect(values).toEqual({ g: 6, h: 4 })
    const calc = shapeCalculation(model, values)
    expect(calc.text).toBe('A = g·h = 6·4 = 24 cm²')
    expect(calc.result).toBe('A = 24 cm²')
    expect(shapeCalculation(model, { g: 6.5, h: 4 }).text).toBe('A = g·h = 6,5·4 = 26 cm²')
  })

  it('writes value texts with a decimal comma', () => {
    const calc = shapeCalculation(model, { g: 6.5, h: 4 })
    expect(lengthText(6.5)).toBe('6,5 cm')
    expect(shapeSliderValueText('g', 6.5, calc)).toBe('g = 6,5 cm, A = 26 cm²')
    expect(fixedLengthText('h', 4)).toBe('Höhe h = 4 cm (fest)')
  })

  it('shows the exact area, also with three decimals', () => {
    const triangle = buildShapeSliders(widget({ shape: 'triangle', measures: { g: { value: 6.5 }, h: { value: 3.5 } } }))
    expect(shapeCalculation(triangle, { g: 6.5, h: 3.5 }).result).toBe('A = 11,375 cm²')
  })

  it('has a frame that holds the figure at every slider position', () => {
    const inside = (values: { g: number; h: number }) => {
      const bounds = layoutShape(shapeCalculation(model, values).figure).bounds
      return (
        bounds.minX >= model.frame.minX - 1e-9 &&
        bounds.minY >= model.frame.minY - 1e-9 &&
        bounds.maxX <= model.frame.maxX + 1e-9 &&
        bounds.maxY <= model.frame.maxY + 1e-9
      )
    }
    for (const g of [2, 3.5, 6, 10]) {
      for (const h of [1, 4.5, 8]) expect(inside({ g, h }), `g = ${g}, h = ${h}`).toBe(true)
    }
  })

  it('keeps a fixed apex, so a shorter base puts the height outside', () => {
    const obtuse = buildShapeSliders(widget({ shape: 'triangle', measures: { g: { value: 4, min: 2, max: 8 }, h: 3 }, offset: 6 }))
    expect(layoutShape(shapeCalculation(obtuse, { g: 4, h: 3 }).figure).height?.outside).toBe(true)
    expect(layoutShape(shapeCalculation(obtuse, { g: 8, h: 3 }).figure).height?.outside).toBe(false)
  })

  it('computes perimeters and typesets the start calculation', () => {
    const triangle = buildShapeSliders(
      widget({ shape: 'triangle', quantity: 'perimeter', measures: { a: { value: 5, min: 4, max: 6 }, b: { value: 4, min: 3, max: 5 }, c: 6 } }),
    )
    expect(shapeCalculation(triangle, { a: 5.5, b: 4, c: 6 }).result).toBe('u = 15,5 cm')
    const trapezoid = buildShapeSliders(widget({ shape: 'trapezoid', quantity: 'perimeter', measures: { a: 8, b: 3, c: 4, d: 3 } }))
    expect(shapeCalculation(trapezoid, initialShapeValues(trapezoid)).text).toBe('u = a + b + c + d = 8 + 3 + 4 + 3 = 18 cm')
    for (const m of [model, triangle, trapezoid]) {
      for (const latex of shapeSlidersLatex(m)) {
        expect(() => katex.renderToString(latex, { throwOnError: true, strict: 'error' }), latex).not.toThrow()
      }
    }
  })
})
