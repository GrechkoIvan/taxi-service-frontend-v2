import { createBrowserRouter } from 'react-router-dom'
import { RootLayout } from '../components/RootLayout'
import { ManagerLayout } from '../components/ManagerLayout'
import { HomePage } from '../../pages/auth/HomePage'
import { AuthSelectionPage } from '../../pages/auth/AuthSelectionPage'
import { CustomerLoginPage } from '../../pages/auth/login/CustomerLoginPage'
import { DriverLoginPage } from '../../pages/auth/login/DriverLoginPage'
import { CustomerRegistrationPage } from '../../pages/auth/register/customer/CustomerRegistrationPage'
import { DriverRegistrationPage } from '../../pages/auth/register/driver/DriverRegistrationPage'
import { ManagerLoginPage } from '../../pages/manager/login/ManagerLoginPage'
import { ManagerApplicationsPage } from '../../pages/manager/applications/ManagerApplicationsPage'
import { ProfilePage } from '../../pages/profile/ProfilePage'

export const appRoutes = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'auth',
        element: <AuthSelectionPage />
      },
      {
        path: 'login',
        element: <CustomerLoginPage />
      },
      {
        path: 'driver/login',
        element: <DriverLoginPage />
      },
      {
        path: 'driver/register',
        element: <DriverRegistrationPage />
      },
      {
        path: 'register',
        element: <CustomerRegistrationPage />
      },
      {
        path: 'profile',
        element: <ProfilePage />
      }
    ]
  },
  {
    path: '/manager',
    element: <ManagerLayout />,
    children: [
      {
        path: 'login',
        element: <ManagerLoginPage />
      },
      {
        path: 'applications',
        element: <ManagerApplicationsPage />
      }
    ]
  }
])