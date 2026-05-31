export type OrderComfortType = 'economy' | 'comfort' | 'business'

export type OrderStatus =
  | 'searching_driver'
  | 'accepted'
  | 'arrived'
  | 'in_progress'
  | 'finished'
  | 'canceled_by_customer'

export interface CreateOrderPayload {
  customerId: string
  fromAddress?: string
  toAddress?: string
  fromCoords: [number, number]
  toCoords: [number, number]
  comfortType: OrderComfortType
  distanceMeters: number
  durationSeconds: number
  priceByN: number
  status: 'searching_driver'
  createdAt: string
}

export interface Order extends Omit<CreateOrderPayload, 'status'> {
  id: string | number

  status: OrderStatus

  driverId?: string
  acceptedAt?: string
}
