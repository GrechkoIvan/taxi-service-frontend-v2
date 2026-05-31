import { useAuthStore } from '../../shared/lib/stores/authStore'
import { USER_ROLES } from '../../shared/lib/constants/authConstants'
import { CustomerOrderMap } from '../../features/order-creation/CustomerOrderMap'
import { DriverDashboard } from '../../features/driver-mode/DriverDashboard'

export function HomePage() {
  const { isAuthenticated, userRole, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xl text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      {!isAuthenticated ? <CustomerOrderMap /> : null}

      {isAuthenticated && userRole === USER_ROLES.CUSTOMER ? <CustomerOrderMap /> : null}
      {isAuthenticated && userRole === USER_ROLES.DRIVER ? <DriverDashboard /> : null}

      {isAuthenticated && userRole !== USER_ROLES.CUSTOMER && userRole !== USER_ROLES.DRIVER ? (
        <div className="container py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Главная</h1>
            <p className="text-gray-600 mb-8">Неизвестная роль</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}