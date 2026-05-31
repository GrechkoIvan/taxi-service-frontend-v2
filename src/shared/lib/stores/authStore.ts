import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser, UserRole } from '../../api/types/authTypes'
import { getCurrentUser, logout as apiLogout } from '../../api/services/authService'

interface AuthState {
  user: AuthUser | null
  userRole: UserRole | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (user: AuthUser) => void
  logout: () => void
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userRole: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: (user) => {
        set({
          user,
          userRole: user.role,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      },

      logout: () => {
        apiLogout().catch(() => {})
        set({
          user: null,
          userRole: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
      },

      setUser: (user) => {
        if (!user) {
          set({ user: null, userRole: null, isAuthenticated: false })
          return
        }

        set({
          user,
          userRole: user.role,
          isAuthenticated: true,
          isLoading: false
        })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      setError: (error) => {
        set({ error })
      },

      checkAuth: async () => {
        set({ isLoading: true, error: null })

        try {
          const user = await getCurrentUser()

          set({
            user,
            userRole: user.role,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({
            user: null,
            userRole: null,
            isAuthenticated: false,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Ошибка проверки аутентификации'
          })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        userRole: state.userRole,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)