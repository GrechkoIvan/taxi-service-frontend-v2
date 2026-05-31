import type { OrderComfortType } from '../api/types/orderTypes'

export function calculatePriceByN(distanceMeters: number, comfortType: OrderComfortType) {
  const km = distanceMeters / 1000

  const base =
    comfortType === 'business' ? 5.5 : comfortType === 'comfort' ? 3.5 : 2.5
  const perKm =
    comfortType === 'business' ? 2.1 : comfortType === 'comfort' ? 1.35 : 0.95

  const raw = base + km * perKm
  return Math.round(raw * 100) / 100
}
