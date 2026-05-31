import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type { Order } from '../types/orderTypes'
import type { Review } from '../types/reviewTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function getCurrentCustomerOrder(): Promise<Order | null> {
  try {
    const res = await apiClient.get<Order | null>('/customers/orders/current')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения текущего заказа'))
  }
}

export type CustomerOrderHistoryItem = {
  order: Order
  review: Review | null
}

export async function getCustomerOrdersHistory(): Promise<CustomerOrderHistoryItem[]> {
  try {
    const res = await apiClient.get<CustomerOrderHistoryItem[]>('/customers/orders/history')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения истории заказов'))
  }
}

export async function cancelCustomerOrder(orderId: string | number): Promise<Order> {
  try {
    const res = await apiClient.patch<Order>(`/orders/${orderId}`, {
      status: 'canceled_by_customer',
      canceledAt: new Date().toISOString()
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка отмены заказа'))
  }
}

export async function getCustomerDriverPublic(driverId: string): Promise<{
  id: string
  name: string
  phone: string
  comfortLevel: 'economy' | 'comfort' | 'business' | null
  averageRating: number
  totalReviews: number
  car: {
    make: string
    model: string
    color: string
    plate: string
  } | null
}> {
  try {
    const res = await apiClient.get(`/customers/drivers/${driverId}/public`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения данных водителя'))
  }
}

export async function getCustomerDriverReviewsSummary(
  driverId: string
): Promise<{ averageRating: number; totalReviews: number }> {
  try {
    const res = await apiClient.get(`/customers/drivers/${driverId}/reviews-summary`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения рейтинга водителя'))
  }
}
