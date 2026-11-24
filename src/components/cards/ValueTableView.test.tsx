import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ValueTableWidget } from '../../cards'
import ValueTableView from './ValueTableView'

const widget = (extra: Partial<ValueTableWidget> = {}): ValueTableWidget => ({
  kind: 'value-table',
  m: 2,
  n: -3,
  table: [-1, 0, 1],
  ...extra,
})

function setup(w: ValueTableWidget) {
  const user = userEvent.setup()
  const view = render(<ValueTableView widget={w} />)
  const live = () => view.container.querySelector('.line-widget > [aria-live="polite"]')
  const field = (x: string) => screen.getByRole('textbox', { name: `f(${x}), Funktionswert für x = ${x}` })
  const status = () => view.container.querySelector('.line-status')
  return { user, view, live, field, status }
}

describe('ValueTableView', () => {
  it('shows the equation, the given values as points and a field per open value', () => {
    const { view, field, status } = setup(widget({ given: [0] }))
    expect(screen.getByRole('group', { name: /^Punkte aus der Wertetabelle\. Koordinatensystem/ })).toBeInTheDocument()
    expect(view.container.querySelector('.line-equation annotation')).toHaveTextContent('f(x) = 2x - 3')
    expect(screen.queryByRole('img', { name: /^Gerade/ })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Punkt B: x = 0, y = −3' })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(field('−1')).toHaveValue('')
    expect(field('1')).toBeInTheDocument()
    expect(status()).toHaveTextContent(/^Berechne die y-Werte/)
  })

  it('marks a wrong value, then puts the point in and moves on after the right one', async () => {
    const { user, view, live, field } = setup(widget())
    await user.type(field('−1'), '-1{Enter}')
    expect(field('−1')).toHaveAttribute('aria-invalid', 'true')
    expect(live()).toHaveTextContent('x = −1: −1 stimmt nicht.')
    expect(view.container.querySelector('.value-table-feedback')).toHaveTextContent('x = −1: −1 stimmt nicht.')
    expect(screen.queryByRole('img', { name: /^Punkt A/ })).not.toBeInTheDocument()

    await user.clear(field('−1'))
    await user.type(field('−1'), '−5{Enter}')
    expect(live()).toHaveTextContent('x = −1: richtig, Punkt A(−1|−5) eingetragen.')
    expect(screen.getByRole('img', { name: 'Punkt A: x = −1, y = −5' })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(field('0')).toHaveFocus()
  })

  it('does not check an empty or unchanged field again', async () => {
    const { user, live, field } = setup(widget())
    await user.click(field('0'))
    await user.keyboard('{Enter}')
    expect(live()).toBeEmptyDOMElement()
    await user.type(field('0'), '3{Enter}')
    expect(live()).toHaveTextContent('x = 0: 3 stimmt nicht.')
    await user.tab()
    expect(live()).toHaveTextContent('x = 0: 3 stimmt nicht.')
  })

  it('checks when leaving a field and explains values that are not worked out or unreadable', async () => {
    const { user, view, live, field } = setup(widget())
    await user.type(field('1'), '2·1 - 3')
    await user.tab()
    expect(live()).toHaveTextContent('x = 1: Der Wert stimmt, aber rechne den Term aus.')
    await user.clear(field('1'))
    await user.type(field('1'), '2x')
    await user.tab()
    expect(live()).toHaveTextContent('x = 1: Trage eine Zahl ein, ohne Variable.')
    await user.clear(field('1'))
    await user.type(field('1'), '3 +{Enter}')
    expect(view.container.querySelector('.input-echo')).toBeInTheDocument()
  })

  it('draws the line once every value is right and starts over', async () => {
    const { user, live, field, status } = setup(widget({ table: [0, 1] }))
    await user.type(field('0'), '-3{Enter}')
    await user.type(field('1'), '-1{Enter}')
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x − 3' })).toBeInTheDocument()
    const done = 'Alle Werte richtig. Die Punkte liegen auf der Geraden f(x) = 2x − 3.'
    expect(status()).toHaveTextContent(done)
    expect(status()).toHaveClass('is-done')
    expect(live()).toHaveTextContent(`x = 1: richtig, Punkt B(1|−1) eingetragen. ${done}`)
    const reset = screen.getByRole('button', { name: 'Von vorn' })
    expect(reset).toHaveFocus()
    await user.click(reset)
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(screen.queryByRole('img', { name: /^Gerade/ })).not.toBeInTheDocument()
  })

  it('gives the graph and shows the equation only at the end', async () => {
    const { user, view, field, status } = setup(widget({ table: [1], show: 'graph' }))
    expect(screen.getByRole('group', { name: /^Graph zur Wertetabelle\./ })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Gerade f(x) = 2x − 3' })).toBeInTheDocument()
    expect(view.container.querySelector('.line-equation')).not.toBeInTheDocument()
    expect(status()).toHaveTextContent(/^Lies die y-Werte am Graphen ab/)
    await user.type(field('1'), '-1{Enter}')
    expect(view.container.querySelector('.line-equation annotation')).toHaveTextContent('f(x) = 2x - 3')
  })
})
