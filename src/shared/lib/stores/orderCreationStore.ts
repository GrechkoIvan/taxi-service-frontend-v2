import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Order } from '../../api/types/orderTypes'

export type ActivePoint = 'A' | 'B'
export type Coords = [number, number]

export type RouteInfo = {
  distanceText: string
  durationText: string
  distanceMeters: number
  durationSeconds: number
}

interface OrderCreationState {
  activeOrder: Order | null

  activePoint: ActivePoint

  fromAddress: string
  toAddress: string

  pointACoords: Coords | null
  pointBCoords: Coords | null

  routeInfo: RouteInfo | null
  isRouteLoading: boolean

  error: string | null
  successMessage: string | null

  routeBuildRequestId: number

  setActiveOrder: (order: Order | null) => void

  setActivePoint: (next: ActivePoint) => void
  setFromAddress: (next: string) => void
  setToAddress: (next: string) => void
  setPointACoords: (coords: Coords | null) => void
  setPointBCoords: (coords: Coords | null) => void

  setRouteInfo: (info: RouteInfo | null) => void
  setIsRouteLoading: (loading: boolean) => void

  setError: (message: string | null) => void
  setSuccessMessage: (message: string | null) => void

  requestBuildRoute: () => void
  resetMessages: () => void
  resetAll: () => void
}

const initialState = {
  activeOrder: null as Order | null,

  activePoint: 'A' as ActivePoint,

  fromAddress: '',
  toAddress: '',

  pointACoords: null as Coords | null,
  pointBCoords: null as Coords | null,

  routeInfo: null as RouteInfo | null,
  isRouteLoading: false,

  error: null as string | null,
  successMessage: null as string | null,

  routeBuildRequestId: 0,
}

export const useOrderCreationStore = create<OrderCreationState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setActiveOrder: (order) => set({ activeOrder: order }),

      setActivePoint: (next) => set({ activePoint: next }),
      setFromAddress: (next) => set({ fromAddress: next }),
      setToAddress: (next) => set({ toAddress: next }),
      setPointACoords: (coords) => set({ pointACoords: coords, routeInfo: null }),
      setPointBCoords: (coords) => set({ pointBCoords: coords, routeInfo: null }),

      setRouteInfo: (info) => set({ routeInfo: info }),
      setIsRouteLoading: (loading) => set({ isRouteLoading: loading }),

      setError: (message) => set({ error: message }),
      setSuccessMessage: (message) => set({ successMessage: message }),

      requestBuildRoute: () =>
        set({ routeBuildRequestId: get().routeBuildRequestId + 1 }),

      resetMessages: () => set({ error: null, successMessage: null }),

      resetAll: () => set({ ...initialState }),
    }),
    {
      name: 'order-creation-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        activeOrder: state.activeOrder,
        activePoint: state.activePoint,
        fromAddress: state.fromAddress,
        toAddress: state.toAddress,
        pointACoords: state.pointACoords,
        pointBCoords: state.pointBCoords,
        routeInfo: state.routeInfo,
      }),
    }
  )
)

export function canBuildRoute(state: Pick<OrderCreationState, 'pointACoords' | 'pointBCoords'>) {
  return Boolean(state.pointACoords && state.pointBCoords)
}

export function canCreateOrder(state: Pick<OrderCreationState, 'pointACoords' | 'pointBCoords' | 'routeInfo'>) {
  return Boolean(state.pointACoords && state.pointBCoords && state.routeInfo)
}
