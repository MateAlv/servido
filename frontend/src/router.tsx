import { createBrowserRouter } from 'react-router'

import { AppLayout } from './AppLayout'
import { HomePage } from './pages/HomePage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      {
        path: '/mapa',
        lazy: async () => ({ Component: (await import('./pages/MapPage')).MapPage }),
      },
      {
        path: '/restaurantes/:id',
        lazy: async () => ({
          Component: (await import('./pages/RestaurantDetailPage')).RestaurantDetailPage,
        }),
      },
      {
        path: '/diseno',
        lazy: async () => ({
          Component: (await import('./pages/DesignSystemPage')).DesignSystemPage,
        }),
      },
    ],
  },
])
