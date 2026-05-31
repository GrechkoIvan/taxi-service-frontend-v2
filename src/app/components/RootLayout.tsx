import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../shared/lib/stores/authStore'

export function RootLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="h-16 shrink-0 border-b border-primary-dark bg-primary">
        <div className="h-full w-full pl-10 pr-2 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-900 select-none"
          >
            <span className="px-2 py-1 rounded-md bg-gray-900 text-primary font-extrabold tracking-wide text-lg leading-none">
              TAXI
            </span>
            <span className="font-extrabold tracking-wide text-lg leading-none">
              Service
            </span>
          </Link>

          <div className="h-full flex items-stretch">
            {!isAuthenticated ? (
              <Link
                to="/auth"
                className="h-full px-4 flex items-center text-base font-medium text-gray-900 hover:bg-primary-light"
              >
                Войти
              </Link>
            ) : (
              <>
                <span className="h-full w-px bg-primary-dark/30" />
                <Link
                  to="/profile"
                  className="h-full px-4 flex items-center text-base font-medium text-gray-900 hover:bg-primary-light"
                >
                  {user?.name ? user.name : 'Профиль'}
                </Link>
                <span className="h-full w-px bg-primary-dark/30" />
                <button
                  type="button"
                  className="h-full px-4 flex items-center text-base font-medium text-gray-900 hover:bg-primary-light"
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                >
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