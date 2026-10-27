import { createBrowserRouter } from 'react-router'

import { AppLayout } from './AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RestaurantRegisterPage } from './pages/RestaurantRegisterPage'
import { RestaurantProfilePage } from './pages/RestaurantProfilePage'
import { OpeningHoursPage } from './pages/OpeningHoursPage'
import { TableInventoryPage } from './pages/TableInventoryPage'
import { RestaurantAreaPage } from './pages/RestaurantAreaPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/ingresar', element: <LoginPage /> },
      { path: '/registrarme', element: <RegisterPage /> },
      { path: '/suma-tu-local', element: <RestaurantRegisterPage /> },
      { path: '/restaurante/perfil', element: <RestaurantProfilePage /> },
      { path: '/restaurante/horarios', element: <OpeningHoursPage /> },
      { path: '/restaurante/mesas', element: <TableInventoryPage /> },
      {
        path: '/restaurante/reservas',
        element: (
          <RestaurantAreaPage
            title="Reservas"
            description="La gestión de reservas estará disponible próximamente."
          />
        ),
      },
      {
        path: '/restaurante/menu/nuevo-plato',
        lazy: async () => ({ Component: (await import('./pages/AddDishPage')).AddDishPage }),
      },
      {
        path: '/restaurante/menu',
        lazy: async () => ({ Component: (await import('./pages/MenuPage')).MenuPage }),
      },
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
        path: '/reservar/:restauranteId',
        lazy: async () => ({
          Component: (await import('./pages/ReservationPage')).ReservationPage,
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
