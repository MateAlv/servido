import { createBrowserRouter } from 'react-router'

import { AppLayout } from './AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RestaurantRegisterPage } from './pages/RestaurantRegisterPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/ingresar', element: <LoginPage /> },
      { path: '/registrarme', element: <RegisterPage /> },
      { path: '/suma-tu-local', element: <RestaurantRegisterPage /> },
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
        path: '/verificar-email',
        lazy: async () => ({
          Component: (await import('./pages/VerifyEmailPage')).VerifyEmailPage,
        }),
      },
      {
        path: '/privacidad',
        lazy: async () => ({ Component: (await import('./pages/PrivacyPage')).PrivacyPage }),
      },
      {
        path: '/terminos',
        lazy: async () => ({ Component: (await import('./pages/TermsPage')).TermsPage }),
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
