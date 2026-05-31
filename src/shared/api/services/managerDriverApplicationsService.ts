import type { AxiosError } from 'axios'
import { apiClient } from '../apiClient'
import type {
  ApproveDriverApplicationPayload,
  ApproveDriverApplicationResponse,
  DriverApplicationPublic,
  DriverApplicationStatus,
  RejectDriverApplicationPayload,
  RejectDriverApplicationResponse
} from '../types/driverApplicationTypes'

function toErrorMessage(error: unknown, defaultMessage: string) {
  const axiosError = error as AxiosError<{ message?: string }>

  const messageFromServer = axiosError?.response?.data?.message
  if (messageFromServer) return messageFromServer

  if (error instanceof Error) return error.message
  return defaultMessage
}

export async function getManagerDriverApplications(
  status?: DriverApplicationStatus
): Promise<DriverApplicationPublic[]> {
  try {
    const res = await apiClient.get<DriverApplicationPublic[]>(
      '/manager/driver-applications',
      {
        params: status ? { status } : undefined
      }
    )
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения заявок'))
  }
}

export async function getManagerDriverApplicationById(
  id: string
): Promise<DriverApplicationPublic> {
  try {
    const res = await apiClient.get<DriverApplicationPublic>(
      `/manager/driver-applications/${id}`
    )
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка получения заявки'))
  }
}

export async function approveDriverApplication(params: {
  id: string
  payload: ApproveDriverApplicationPayload
}): Promise<ApproveDriverApplicationResponse> {
  try {
    const res = await apiClient.patch<ApproveDriverApplicationResponse>(
      `/manager/driver-applications/${params.id}`,
      {
        action: 'approve',
        ...params.payload
      }
    )
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка подтверждения заявки'))
  }
}

export async function rejectDriverApplication(params: {
  id: string
  payload: RejectDriverApplicationPayload
}): Promise<RejectDriverApplicationResponse> {
  try {
    const res = await apiClient.patch<RejectDriverApplicationResponse>(
      `/manager/driver-applications/${params.id}`,
      {
        action: 'reject',
        ...params.payload
      }
    )
    return res.data
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Ошибка отказа по заявке'))
  }
}
