import { createBrowserRouter } from 'react-router'

import { AppLayout } from './AppLayout'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { RestaurantRegisterPage } from './pages/RestaurantRegisterPage'
import { RestaurantProfilePage } from './pages/RestaurantProfilePage'
import { OpeningHoursPage } from './pages/OpeningHoursPage'
import { TableInventoryPage } from './pages/TableInventoryPage'
import { RestaurantOrdersPage } from './pages/RestaurantOrdersPage'
import { RestaurantReservationsPage } from './pages/RestaurantReservationsPage'
import { RestaurantCancellationsPage } from './pages/RestaurantCancellationsPage'
import { RestaurantReservationDinerPage } from './pages/RestaurantReservationDinerPage'

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
      { path: '/restaurante/pedidos', element: <RestaurantOrdersPage /> },
      {
        path: '/restaurante/reservas',
        element: <RestaurantReservationsPage />,
      },
      {
        path: '/restaurante/cancelaciones',
        element: <RestaurantCancellationsPage />,
      },
      {
        path: '/restaurante/reservas/:reservationId/comensal',
        element: <RestaurantReservationDinerPage />,
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
