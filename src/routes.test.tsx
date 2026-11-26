import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { allSubtopics, subtopicPath } from './catalog'
import { demoDeck } from './pages/dev/demoDeck'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

const subtopics = allSubtopics()

describe('Routing and layout', () => {
  it('shows all subtopics on the home page', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: /Willkommen bei Lemmio/ })).toBeInTheDocument()
    expect(subtopics).toHaveLength(10)
    const main = within(screen.getByRole('main'))
    for (const { subtopic } of subtopics) {
      expect(main.getByRole('link', { name: new RegExp(subtopic.title) })).toBeInTheDocument()
    }
  })

  it.each(subtopics.map((s) => [s.id, s] as const))('shows the sections of "%s"', (id, { subtopic }) => {
    expect(subtopicPath(id)).toBe(`/${id}`)
    renderAt(`/${id}`)
    expect(screen.getByRole('heading', { level: 1, name: subtopic.title })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Erklärung' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Übung' })).toBeInTheDocument()
  })

  it('serves the subtopics under area/topic/subtopic', () => {
    expect(subtopics.map((s) => subtopicPath(s.id))).toEqual([
      '/algebra/terme/ausmultiplizieren',
      '/algebra/terme/binomische-formeln',
      '/algebra/terme/faktorisieren',
      '/algebra/lineare-gleichungen/umformen',
      '/algebra/lineare-gleichungen/klammern',
      '/algebra/lineare-gleichungen/sonderfaelle',
      '/funktionen/lineare-funktionen/steigung-und-graph',
      '/funktionen/lineare-funktionen/gleichung-aufstellen',
      '/funktionen/lineare-funktionen/punktprobe-nullstelle',
      '/funktionen/lineare-funktionen/schnittpunkt',
    ])
  })

  it('navigates from the home page to a subtopic on click', async () => {
    const router = renderAt('/')
    await userEvent.click(within(screen.getByRole('main')).getByRole('link', { name: /Faktorisieren/ }))
    expect(router.state.location.pathname).toBe('/algebra/terme/faktorisieren')
  })

  it('shows the navigation with all subtopics in the layout', () => {
    renderAt('/')
    const nav = within(screen.getByRole('navigation', { name: 'Teilthemen' }))
    expect(nav.getAllByRole('link')).toHaveLength(subtopics.length)
  })

  it('shows the path from the catalog above a subtopic', () => {
    renderAt('/algebra/terme/binomische-formeln')
    const crumbs = screen.getByRole('navigation', { name: 'Pfad' })
    expect(crumbs).toHaveTextContent('start/algebra/terme/binomische_formeln')
    expect(within(crumbs).getByRole('link', { name: 'start' })).toHaveAttribute('href', '/')
    expect(within(crumbs).getByText('binomische_formeln')).toHaveAttribute('aria-current', 'page')
  })

  it('names the areas of the catalog in the footer', () => {
    renderAt('/')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Lemmio · Algebra · Funktionen · Dein Fortschritt bleibt in deinem Browser.')
  })

  it.each([
    '/',
    '/formelsatz',
    '/algebra/terme/ausmultiplizieren',
    '/algebra/lineare-gleichungen/umformen',
    '/funktionen/lineare-funktionen/schnittpunkt',
  ])('does not mention "Einheit" on %s', (path) => {
    renderAt(path)
    expect(document.body).not.toHaveTextContent(/einheit/i)
  })

  it('shows "not found" for an unknown subtopic', () => {
    renderAt('/algebra/terme/gibt-es-nicht')
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })

  it.each(['/algebra/gibt-es-nicht/faktorisieren', '/gibt-es-nicht/terme/faktorisieren'])(
    'shows "not found" for the wrong area or topic in %s',
    (path) => {
      renderAt(path)
      expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
    },
  )

  it('has no redirects for the former flat routes', () => {
    renderAt('/faktorisieren')
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })

  it('serves the card demo in the dev server (the route is not part of the build)', async () => {
    renderAt('/dev/karten')
    expect(await screen.findByRole('heading', { level: 1, name: 'Karten-Demo' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Worum geht es?' })).toBeInTheDocument()
    // The demo deck grows with every new widget, so the count is taken from the deck.
    expect(screen.getByText(`Karte 1 von ${demoDeck.cards.length}`)).toBeInTheDocument()
  })

  it('serves the coordinate plane demo in the dev server', async () => {
    renderAt('/dev/koordinaten')
    expect(await screen.findByRole('heading', { level: 1, name: 'Koordinatensystem-Demo' })).toBeInTheDocument()
    expect(screen.getAllByRole('group', { name: /Koordinatensystem, x von/ })).toHaveLength(4)
    expect(screen.getAllByRole('slider', { name: /^Punkt / })).toHaveLength(6)
  })

  it('serves the figure demo in the dev server', async () => {
    renderAt('/dev/figuren')
    expect(await screen.findByRole('heading', { level: 1, name: 'Figuren-Demo' })).toBeInTheDocument()
    expect(screen.getAllByRole('img', { name: /^(Parallelogramm|Dreieck|Raute|Trapez) [A-D]+:/ })).toHaveLength(21)
    expect(screen.getAllByRole('group', { name: /Gitter, 12 mal 10 Kästchen/ })).toHaveLength(2)
    expect(screen.getByRole('slider', { name: 'Punkt F' })).toBeInTheDocument()
  })

  it('shows "not found" for nested unknown paths', () => {
    renderAt('/a/b/c/d')
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })
})
