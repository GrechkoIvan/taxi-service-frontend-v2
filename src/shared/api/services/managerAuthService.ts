import type { AxiosError } from 'axios'
import { queryClient } from '../../lib/queryClient'
import { apiClient } from '../apiClient'
import type {
  Manager,
  ManagerAuthResponse,
  ManagerLoginPayload
} from '../types/managerAuthTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function managerLogin(
  payload: ManagerLoginPayload
): Promise<ManagerAuthResponse> {
  try {
    const res = await apiClient.post<ManagerAuthResponse>(
      '/manager/auth/login',
      payload
    )
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка входа менеджера'))
  }
}

export async function managerLogout() {
  try {
    await apiClient.post('/manager/auth/logout')
  } catch {
    // ignore
  }
  await queryClient.invalidateQueries()
}

export async function getCurrentManager(): Promise<Manager> {
  try {
    const res = await apiClient.get<Manager>('/manager/auth/me')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения данных менеджера'))
  }
}
