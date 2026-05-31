import { Link, Outlet, useNavigate } from 'react-router-dom'
import { UserRound, LogOut } from 'lucide-react'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { AuthDropdown } from '../../features/auth/header/AuthDropdown'


export function RootLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()


  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-primary-dark bg-primary">
        <div className="h-full w-full pl-10 pr-2 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-gray-900 select-none">
            <img
              src="/taxi-service-logo.png"
              alt="Crazy Taxi"
              className="h-10 w-auto object-contain drop-shadow-sm"
            />
          </Link>

          <div className="h-full flex items-stretch">
            {!isAuthenticated ? (
              <AuthDropdown />
            ) : (
              <>
                <span className="h-full w-px bg-primary-dark/30" />
                <Link
                  to="/profile"
                  className="h-full px-4 flex items-center gap-2 text-base font-medium text-gray-900 hover:bg-primary-light"
                >
                  <UserRound className="w-5 h-5 text-gray-800" strokeWidth={2.2} />
                  {user?.name ? user.name : 'Профиль'}
                </Link>

                <span className="h-full w-px bg-primary-dark/30" />
                <button
                  type="button"
                  className="h-full px-4 flex items-center gap-2 text-base font-medium text-gray-900 hover:bg-primary-light"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
                  <LogOut className="w-5 h-5 text-gray-800" strokeWidth={2.2} />
                  Выйти
                </button>

              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}