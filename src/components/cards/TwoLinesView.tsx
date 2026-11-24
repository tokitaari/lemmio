import { useId, useMemo, useState } from 'react'
import {
  buildTwoLines,
  equateLatex,
  fLatex,
  functionLine,
  gFunction,
  gLatex,
  gSliderLabel,
  initialTwoLinesValues,
  INTERSECTION_LABEL,
  intersectionLatex,
  intersectionPointText,
  pointInWindow,
  resultText,
  twoLinesResult,
  twoLinesValueText,
  type LineParameter,
  type TwoLinesValues,
  type TwoLinesWidget,
} from '../../cards'
import { clipLine, formatNumber, type PlaneWindow } from '../../plane'
import CoordinatePlane, { type PlaneGeometry, type PlaneLineItem } from '../plane/CoordinatePlane'
import Tex from '../Tex'

/** Radius of the intersection point, like a fixed point of the plane. */
const POINT_RADIUS = 6

/**
 * Two lines f and g and their intersection: the point S (also with
 * fractional coordinates), parallel lines or identical lines. With `vary`
 * native range inputs move g; each slider's value text carries the new
 * equation of g and the result, so there is no extra live region. Identical
 * lines are drawn as one line named "f = g" with g dashed on top. Nothing is
 * animated.
 */
export default function TwoLinesView({ widget }: { widget: TwoLinesWidget }) {
  const model = useMemo(() => buildTwoLines(widget), [widget])
  const [values, setValues] = useState<TwoLinesValues>(() => initialTwoLinesValues(model))
  const ids = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const [fName, gName] = model.names
  const g = gFunction(model, values)
  const fLine = functionLine(model.f)
  const gLine = functionLine(g)
  const result = twoLinesResult(model, values)
  const identical = result.kind === 'identical'
  const point = result.kind === 'point' && pointInWindow(model.window, result.point) ? result.point : null
  const pointLatex = intersectionLatex(result)
  const status = resultText(model, result)

  const lines: PlaneLineItem[] = identical
    ? [{ id: 'f', line: fLine, label: `${fName} = ${gName}` }]
    : [
        { id: 'f', line: fLine, label: fName },
        { id: 'g', line: gLine, label: gName, tone: 'pink' },
      ]

  const overlay = (geometry: PlaneGeometry) => {
    const segment = identical ? clipLine(gLine, geometry.window) : null
    const from = segment && geometry.toView(segment.from)
    const to = segment && geometry.toView(segment.to)
    const at = point && geometry.toView({ x: point.x.toNumber(), y: point.y.toNumber() })
    return (
      <>
        {from && to && (
          <g className="plane-line plane-tone-pink is-dashed" aria-hidden="true">
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
          </g>
        )}
        {point && at && (
          <g
            className="plane-point plane-tone-text two-lines-point"
            transform={`translate(${at.x} ${at.y})`}
            role="img"
            aria-label={`Schnittpunkt ${intersectionPointText(point)}`}
          >
            <circle className="plane-point-dot" r={POINT_RADIUS} />
            <IntersectionLabel window={geometry.window} x={point.x.toNumber()} y={point.y.toNumber()} />
          </g>
        )}
      </>
    )
  }

  const sliders = [model.m, model.n].filter((s) => s.varies)
  const fixed = sliders.length > 0 ? [model.m, model.n].filter((s) => !s.varies) : []
  const equate = model.equate ? equateLatex(model, values) : null

  const onChange = (parameter: LineParameter, value: number) => {
    setValues((current) => ({ ...current, [parameter]: value }))
  }

  return (
    <div className="widget line-widget">
      <CoordinatePlane
        window={model.window}
        label={widget.label ?? `Geraden ${fName} und ${gName}`}
        lines={lines}
        overlay={overlay}
      />
      <div className="two-lines-equations">
        <p className="line-equation">
          <Tex latex={fLatex(model)} />
        </p>
        <p className="line-equation">
          <Tex latex={gLatex(model, values)} />
        </p>
      </div>
      {equate && (
        <p className="two-lines-equate">
          <span className="two-lines-equate-label">Gleichsetzen:</span> <Tex latex={equate.equation} />
          <span className="two-lines-equate-set">
            <Tex latex={equate.solution} />
          </span>
        </p>
      )}
      <p className="line-status two-lines-status">
        {pointLatex && (
          <>
            Schnittpunkt: <Tex latex={pointLatex} />
            {status && ' '}
          </>
        )}
        {status}
      </p>
      {sliders.length > 0 && (
        <div className="line-sliders">
          {fixed.map((slider) => (
            <p key={slider.parameter} className="line-slider-fixed">
              {gSliderLabel(slider.parameter, gName)} = {formatNumber(values[slider.parameter])} (fest)
            </p>
          ))}
          {sliders.map((slider) => {
            const id = `${ids}-${slider.parameter}`
            const value = values[slider.parameter]
            return (
              <div key={slider.parameter} className="line-slider">
                <label htmlFor={id} className="line-slider-name">
                  {gSliderLabel(slider.parameter, gName)}
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
                  aria-valuetext={twoLinesValueText(slider.parameter, values, model)}
                  onChange={(e) => onChange(slider.parameter, Number(e.currentTarget.value))}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** "S" to the upper right of the point, or to the left/below near the right/top edge (like the plane's points). */
function IntersectionLabel({ window, x, y }: { window: PlaneWindow; x: number; y: number }) {
  const leftSide = x >= window.x[1] - 1
  const below = y >= window.y[1] - 0.5
  return (
    <text
      className="plane-point-label"
      x={leftSide ? -10 : 10}
      y={below ? 16 : -12}
      textAnchor={leftSide ? 'end' : 'start'}
      dominantBaseline="central"
    >
      {INTERSECTION_LABEL}
    </text>
  )
}
