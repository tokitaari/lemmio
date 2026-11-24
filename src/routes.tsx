import type { RouteObject } from 'react-router-dom'
import Layout from './components/Layout'
import FormulaSheet from './pages/FormulaSheet'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import SubtopicPage from './pages/SubtopicPage'

/**
 * Pages for development only (e.g. the card demo). `import.meta.env.DEV` is
 * false in the production build, so Vite drops these routes and their lazily
 * loaded modules entirely.
 */
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: 'dev/karten',
        HydrateFallback: () => null,
        lazy: async () => ({ Component: (await import('./pages/dev/CardsDemo')).default }),
      },
    ]
  : []

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'formelsatz', element: <FormulaSheet /> },
      { path: ':area/:topic/:subtopic', element: <SubtopicPage /> },
      ...devRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
]
