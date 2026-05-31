import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Manager } from '../../api/types/managerAuthTypes'
import {
  getCurrentManager,
  managerLogout as apiManagerLogout
} from '../../api/services/managerAuthService'

interface ManagerAuthState {
  manager: Manager | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (manager: Manager) => void
  logout: () => void
  setManager: (manager: Manager | null) => void
  checkAuth: () => Promise<void>
}

export const useManagerAuthStore = create<ManagerAuthState>()(
  persist(
    (set) => ({
      manager: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: (manager) => {
        set({
          manager,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      },

      logout: () => {
        apiManagerLogout().catch(() => {})
        set({
          manager: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        })
      },

      setManager: (manager) => {
        if (!manager) {
          set({ manager: null, isAuthenticated: false })
          return
        }

        set({
          manager,
          isAuthenticated: true,
          isLoading: false
        })
      },

      checkAuth: async () => {
        set({ isLoading: true, error: null })

        try {
          const manager = await getCurrentManager()
          set({
            manager,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({
            manager: null,
            isAuthenticated: false,
            isLoading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Ошибка проверки аутентификации менеджера'
          })
        }
      }
    }),
    {
      name: 'manager-auth-storage',
      partialize: (state) => ({
        manager: state.manager,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
