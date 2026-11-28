import type { CardWidget } from '../../cards'
import AreaModelView from './AreaModelView'
import BalanceView from './BalanceView'
import DecomposeView from './DecomposeView'
import EquationStepsView from './EquationStepsView'
import LinePointsView from './LinePointsView'
import LineSlidersView from './LineSlidersView'
import ShapePointsView from './ShapePointsView'
import ShapeSlidersView from './ShapeSlidersView'
import ShearView from './ShearView'
import SlopeTriangleView from './SlopeTriangleView'
import TermStepsView from './TermStepsView'
import TwoLinesView from './TwoLinesView'
import ValueTableView from './ValueTableView'

/**
 * Renders the interactive element of a card. New widget kinds get a case
 * here; the switch is exhaustive, so TypeScript reports a missing one.
 *
 * Widgets that use arrow keys themselves must call `preventDefault()` on
 * those key events, otherwise the deck also turns the card.
 */
export default function CardWidgetView({ widget }: { widget: CardWidget }) {
  switch (widget.kind) {
    case 'term-steps':
      return <TermStepsView widget={widget} />
    case 'area-model':
      return <AreaModelView widget={widget} />
    case 'balance':
      return <BalanceView widget={widget} />
    case 'equation-steps':
      return <EquationStepsView widget={widget} />
    case 'line-sliders':
      return <LineSlidersView widget={widget} />
    case 'slope-triangle':
      return <SlopeTriangleView widget={widget} />
    case 'line-points':
      return <LinePointsView widget={widget} />
    case 'value-table':
      return <ValueTableView widget={widget} />
    case 'two-lines':
      return <TwoLinesView widget={widget} />
    case 'shape-sliders':
      return <ShapeSlidersView widget={widget} />
    case 'shape-points':
      return <ShapePointsView widget={widget} />
    case 'shear':
      return <ShearView widget={widget} />
    case 'decompose':
      return <DecomposeView widget={widget} />
  }
}
