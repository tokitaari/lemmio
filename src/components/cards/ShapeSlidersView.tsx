import { useId, useMemo, useState } from 'react'
import {
  buildShapeSliders,
  fixedLengthText,
  initialShapeValues,
  lengthText,
  SHAPE_LENGTH_NAMES,
  SHAPE_STEP,
  shapeCalculation,
  shapeSliderValueText,
  type ShapeSlidersWidget,
  type ShapeValues,
} from '../../cards'
import type { Letter } from '../../math'
import ShapeFigure from '../shapes/ShapeFigure'
import Tex from '../Tex'

/**
 * A figure true to scale with sliders for its lengths (native range inputs,
 * step 0,5 cm: mouse, touch, arrow keys, Pos1/Ende, Bild↑/Bild↓). The figure
 * and the formula with the numbers inserted follow the sliders; the figure
 * keeps a fixed frame, so the sliders below do not move while one is
 * dragged. Each slider's value text carries the new result, so there is no
 * extra live region. Nothing is animated.
 */
export default function ShapeSlidersView({ widget }: { widget: ShapeSlidersWidget }) {
  const model = useMemo(() => buildShapeSliders(widget), [widget])
  const [values, setValues] = useState<ShapeValues>(() => initialShapeValues(model))
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const calculation = useMemo(() => shapeCalculation(model, values), [model, values])

  const onChange = (letter: Letter, value: number) => {
    setValues((current) => ({ ...current, [letter]: value }))
  }

  return (
    <div className="widget shape-widget">
      <ShapeFigure figure={calculation.figure} label={widget.label ?? 'Figur mit Schiebereglern'} bounds={model.frame} />
      <p className="shape-formula">
        <Tex latex={calculation.latex} />
      </p>
      <div className="line-sliders">
        {model.sliders.map((slider) => {
          const value = values[slider.letter] ?? slider.value
          if (!slider.varies) {
            return (
              <p key={slider.letter} className="line-slider-fixed">
                {fixedLengthText(slider.letter, value)}
              </p>
            )
          }
          const id = `${ids}-${slider.letter}`
          return (
            <div key={slider.letter} className="line-slider">
              <label htmlFor={id} className="line-slider-name">
                {SHAPE_LENGTH_NAMES[slider.letter]}
              </label>
              <output htmlFor={id} className="line-slider-value">
                {lengthText(value)}
              </output>
              <input
                id={id}
                type="range"
                min={slider.min}
                max={slider.max}
                step={SHAPE_STEP}
                value={value}
                aria-valuetext={shapeSliderValueText(slider.letter, value, calculation)}
                onChange={(e) => onChange(slider.letter, Number(e.currentTarget.value))}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
