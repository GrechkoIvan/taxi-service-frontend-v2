import type { AxiosError } from 'axios'
import { queryClient } from '../../lib/queryClient'
import { apiClient } from '../apiClient'
import type {
  AuthResponse,
  CustomerRegistrationData,
  DriverApplicationData,
  DriverApplicationResponse,
  LoginPayload
} from '../types/authTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function registerCustomer(
  data: CustomerRegistrationData
): Promise<AuthResponse> {
  try {
    const res = await apiClient.post<AuthResponse>('/auth/register/customer', data)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка регистрации клиента'))
  }
}

export async function submitDriverApplication(
  data: DriverApplicationData
): Promise<DriverApplicationResponse> {
  try {
    const res = await apiClient.post<DriverApplicationResponse>(
      '/auth/driver-applications',
      data
    )
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка отправки заявки'))
  }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  try {
    const res = await apiClient.post<AuthResponse>('/auth/login', payload)
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка входа'))
  }
}

export async function logout() {
  try {
    await apiClient.delete('/auth/session')
  } catch {
    // ignore
  }
  await queryClient.invalidateQueries()
}

export async function getCurrentUser(): Promise<AuthResponse['user']> {
  try {
    const res = await apiClient.get<AuthResponse['user']>('/auth/me')
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения данных пользователя'))
  }
}
