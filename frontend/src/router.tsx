import { createBrowserRouter } from 'react-router'

import { AppLayout } from './AppLayout'
import { HomePage } from './pages/HomePage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        path: '/diseno',
        lazy: async () => ({
          Component: (await import('./pages/DesignSystemPage')).DesignSystemPage,
        }),
      },
    ],
  },
])
