import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type { CreateOrderPayload, Order } from '../types/orderTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  try {
    const res = await apiClient.post<Order>('/orders', payload)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка создания заказа'))
  }
}
