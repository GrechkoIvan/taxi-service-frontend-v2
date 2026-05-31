import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type { CreateReviewPayload, Review } from '../types/reviewTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function createReview(payload: CreateReviewPayload): Promise<Review> {
  try {
    const res = await apiClient.post<Review>('/reviews', payload)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка создания отзыва'))
  }
}
