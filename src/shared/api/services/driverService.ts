import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type { Order, OrderStatus } from '../types/orderTypes'
import type { Review } from '../types/reviewTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function driverGoOnline() {
  try {
    const res = await apiClient.patch('/drivers/me', {
      isOnline: true
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка перехода в режим онлайн'))
  }
}

export type DriverReviewWithCustomer = Review & {
  customerName: string | null
}

export async function getDriverMeReviews(): Promise<{
  averageRating: number
  totalReviews: number
  reviews: DriverReviewWithCustomer[]
}> {
  try {
    const res = await apiClient.get('/drivers/me/reviews')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения отзывов'))
  }
}

export async function getDriverMeProfile(): Promise<{
  id: string
  userId: string
  comfortLevel: 'economy' | 'comfort' | 'business' | null
  car: {
    make: string
    model: string
    color: string
    plate: string
  } | null
  isOnline: boolean
  updatedAt: string
}> {
  try {
    const res = await apiClient.get('/drivers/me/profile')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения профиля водителя'))
  }
}

export type DriverOrderHistoryItem = {
  order: Order
  review: Review | null
}

export async function getDriverOrdersHistory(): Promise<DriverOrderHistoryItem[]> {
  try {
    const res = await apiClient.get<DriverOrderHistoryItem[]>('/drivers/orders/history')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения истории поездок'))
  }
}

export async function driverGoOffline() {
  try {
    const res = await apiClient.patch('/drivers/me', {
      isOnline: false,
      coords: null
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка выхода из режима онлайн'))
  }
}

export async function updateDriverLocation(coords: {
  lat: number
  lon: number
}): Promise<{ id: string; userId: string; isOnline: boolean; coords: [number, number] | null; updatedAt: string }> {
  try {
    const res = await apiClient.patch('/drivers/me', {
      coords: [coords.lat, coords.lon]
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка отправки геолокации'))
  }
}

export async function getDriverCustomerPublic(customerId: string): Promise<{
  id: string
  name: string
  phone: string
}> {
  try {
    const res = await apiClient.get(`/drivers/customers/${customerId}/public`)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения данных клиента'))
  }
}

export async function getAvailableDriverOrders(): Promise<Order[]> {
  try {
    const res = await apiClient.get<Order[]>('/drivers/orders/available')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения доступных заказов'))
  }
}

export async function getCurrentDriverOrder(): Promise<Order | null> {
  try {
    const res = await apiClient.get<Order | null>('/drivers/orders/current')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения текущего заказа'))
  }
}

export async function acceptDriverOrder(orderId: string | number): Promise<Order> {
  try {
    const res = await apiClient.patch<Order>(`/orders/${orderId}`, {
      status: 'accepted'
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка принятия заказа'))
  }
}

export async function setDriverOrderStatus(
  orderId: string | number,
  status: Exclude<OrderStatus, 'searching_driver'>
): Promise<Order> {
  try {
    const res = await apiClient.patch<Order>(`/orders/${orderId}`, {
      status
    })
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка изменения статуса заказа'))
  }
}
