import { createBrowserRouter } from 'react-router'

import { AppLayout } from './AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/ingresar', element: <LoginPage /> },
      { path: '/registrarme', element: <RegisterPage /> },
      {
        path: '/diseno',
        lazy: async () => ({
          Component: (await import('./pages/DesignSystemPage')).DesignSystemPage,
        }),
      },
    ],
  },
])
