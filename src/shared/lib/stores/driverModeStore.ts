import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DriverModeState {
  isOnline: boolean
  setOnline: (next: boolean) => void
}

export const useDriverModeStore = create<DriverModeState>()(
  persist(
    (set) => ({
      isOnline: false,
      setOnline: (next) => set({ isOnline: next }),
    }),
    {
      name: 'driver-mode-storage',
      partialize: (state) => ({ isOnline: state.isOnline }),
    }
  )
)
