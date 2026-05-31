export interface CreateReviewPayload {
  orderId: string | number
  driverId: string
  customerId: string
  rating: number
  text?: string
  createdAt: string
}

export interface Review extends CreateReviewPayload {
  id: string | number
}
