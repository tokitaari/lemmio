import { useId, useMemo, useState } from 'react'
import {
  buildLineSliders,
  initialValues,
  lineLatex,
  matchesTarget,
  SLIDER_LABELS,
  sliderValueText,
  TARGET_HINT,
  TARGET_REACHED,
  targetLine,
  valuesLine,
  type LineParameter,
  type LineSlidersWidget,
  type LineValues,
} from '../../cards'
import { formatNumber } from '../../plane'
import CoordinatePlane, { type PlaneLineItem } from '../plane/CoordinatePlane'
import Tex from '../Tex'

/**
 * The graph of f(x) = mx + n with sliders for m and n (native range inputs:
 * mouse, touch, arrow keys, Pos1/Ende, Bild↑/Bild↓). The point (0|n) on the
 * y-axis is marked; the equation below follows the sliders. Each slider's
 * value text carries the new equation, so screen readers hear it with the
 * value; the live region only announces that the target was reached.
 * Nothing is animated.
 */
export default function LineSlidersView({ widget }: { widget: LineSlidersWidget }) {
  const model = useMemo(() => buildLineSliders(widget), [widget])
  const [values, setValues] = useState<LineValues>(() => initialValues(model))
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const line = valuesLine(values)
  const target = model.target
  const reached = target ? matchesTarget(line, target) : false

  const lines: PlaneLineItem[] = [
    ...(target ? [{ id: 'target', line: targetLine(target), tone: 'muted' as const, dashed: true }] : []),
    { id: 'f', line, label: model.name },
  ]

  const onChange = (parameter: LineParameter, value: number) => {
    setValues((current) => ({ ...current, [parameter]: value }))
  }

  const sliders = [model.m, model.n]

  return (
    <div className="widget line-widget">
      <CoordinatePlane
        window={model.window}
        label={widget.label ?? 'Gerade mit Schiebereglern'}
        lines={lines}
        points={[{ id: 'n', label: 'n', x: 0, y: values.n, tone: 'pink' }]}
      />
      <p className="line-equation">
        <Tex latex={lineLatex(line, model.name)} />
      </p>
      <div className="line-sliders">
        {sliders.map((slider) => {
          const id = `${ids}-${slider.parameter}`
          const value = values[slider.parameter]
          if (!slider.varies) {
            return (
              <p key={slider.parameter} className="line-slider-fixed">
                {SLIDER_LABELS[slider.parameter]} = {formatNumber(value)} (fest)
              </p>
            )
          }
          return (
            <div key={slider.parameter} className="line-slider">
              <label htmlFor={id} className="line-slider-name">
                {SLIDER_LABELS[slider.parameter]}
              </label>
              <output htmlFor={id} className="line-slider-value">
                {formatNumber(value)}
              </output>
              <input
                id={id}
                type="range"
                min={slider.min}
                max={slider.max}
                step={1}
                value={value}
                aria-valuetext={sliderValueText(slider.parameter, values, model.name)}
                onChange={(e) => onChange(slider.parameter, Number(e.currentTarget.value))}
              />
            </div>
          )
        })}
      </div>
      {target && <p className={reached ? 'line-status is-done' : 'line-status'}>{reached ? TARGET_REACHED : TARGET_HINT}</p>}
      {target && (
        <p className="visually-hidden" aria-live="polite">
          {reached ? TARGET_REACHED : ''}
        </p>
      )}
    </div>
  )
}
