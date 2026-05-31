import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useManagerAuthStore } from '../../../shared/lib/stores/managerAuthStore'
import {
  approveDriverApplication,
  getManagerDriverApplicationById,
  getManagerDriverApplications,
  rejectDriverApplication
} from '../../../shared/api/services/managerDriverApplicationsService'
import type {
  ApproveDriverApplicationPayload,
  ComfortLevel,
  DriverApplicationPublic
} from '../../../shared/api/types/driverApplicationTypes'
import { FormInput } from '../../../shared/ui/form/FormInput'
import { FormSelect } from '../../../shared/ui/form/FormSelect'
import { FormSubmitButton } from '../../../shared/ui/form/FormSubmitButton'
import { FormError } from '../../../shared/ui/form/FormError'
import { formatBelarusCarPlate } from '../../../shared/lib/formatters/formatBelarusCarPlate'

const approveSchema = z
  .object({
    driverLicenseNumber: z
      .string()
      .trim()
      .min(3, { message: 'Введите номер водительского удостоверения' }),
    carMake: z.string().trim().min(2, { message: 'Введите марку' }),
    carModel: z.string().trim().min(1, { message: 'Введите модель' }),
    carColor: z.string().trim().min(2, { message: 'Введите цвет' }),
    carPlate: z.string().trim().min(5, { message: 'Введите номер авто' }),
    comfortLevel: z.enum(['economy', 'comfort', 'business'])
  })
  .strict()

type ApproveFormValues = z.infer<typeof approveSchema>

export function ManagerApplicationsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, isLoading, manager, logout } = useManagerAuthStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejectComment, setRejectComment] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate('/manager/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  const applicationsQuery = useQuery({
    queryKey: ['manager-driver-applications', 'pending'],
    queryFn: () => getManagerDriverApplications('pending')
  })

  const selectedQuery = useQuery({
    queryKey: ['manager-driver-application', selectedId],
    queryFn: () => getManagerDriverApplicationById(String(selectedId)),
    enabled: Boolean(selectedId)
  })

  const selectedApplication: DriverApplicationPublic | null =
    selectedQuery.data ?? null

  const defaultApproveValues = useMemo<ApproveFormValues>(() => {
    if (!selectedApplication) {
      return {
        driverLicenseNumber: '',
        carMake: '',
        carModel: '',
        carColor: '',
        carPlate: '',
        comfortLevel: 'economy'
      }
    }

    return {
      driverLicenseNumber: selectedApplication.driverLicenseNumber ?? '',
      carMake: selectedApplication.car?.make ?? '',
      carModel: selectedApplication.car?.model ?? '',
      carColor: selectedApplication.car?.color ?? '',
      carPlate: selectedApplication.car?.plate ?? '',
      comfortLevel: (selectedApplication.comfortLevel ?? 'economy') as ComfortLevel
    }
  }, [selectedApplication])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ApproveFormValues>({
    resolver: zodResolver(approveSchema),
    defaultValues: defaultApproveValues
  })

  useEffect(() => {
    reset(defaultApproveValues)
    setRejectComment('')
    setServerError(null)
  }, [defaultApproveValues, reset])

  const approveMutation = useMutation({
    mutationFn: approveDriverApplication,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['manager-driver-applications', 'pending']
      })
      await queryClient.invalidateQueries({
        queryKey: ['manager-driver-application', selectedId]
      })
      setSelectedId(null)
    }
  })

  const rejectMutation = useMutation({
    mutationFn: rejectDriverApplication,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['manager-driver-applications', 'pending']
      })
      await queryClient.invalidateQueries({
        queryKey: ['manager-driver-application', selectedId]
      })
      setSelectedId(null)
    }
  })

  const onApprove = handleSubmit(async (values) => {
    if (!selectedId) return
    setServerError(null)

    try {
      await approveMutation.mutateAsync({
        id: selectedId,
        payload: {
          driverLicenseNumber: values.driverLicenseNumber,
          carMake: values.carMake,
          carModel: values.carModel,
          carColor: values.carColor,
          carPlate: values.carPlate,
          comfortLevel: values.comfortLevel
        } satisfies ApproveDriverApplicationPayload
      })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Ошибка подтверждения')
    }
  })

  const onReject = async () => {
    if (!selectedId) return
    setServerError(null)

    const comment = rejectComment.trim()
    if (comment.length < 3) {
      setServerError('Укажи причину отказа (минимум 3 символа)')
      return
    }

    try {
      await rejectMutation.mutateAsync({
        id: selectedId,
        payload: { comment }
      })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Ошибка отказа')
    }
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xl text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Заявки водителей</h1>
          <p className="text-sm text-gray-600">Менеджер: {manager?.name}</p>
        </div>

        <button onClick={logout} className="btn btn-outline px-4 py-2">
          Выйти
        </button>
      </div>

      <div className="mt-6">
        <FormError message={serverError ?? undefined} />
      </div>

      {!selectedId ? (
        <div className="mt-6 rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <p className="text-sm text-gray-600">Статус: ожидают рассмотрения</p>
          </div>

          {applicationsQuery.isLoading ? (
            <div className="p-4 text-gray-600">Загрузка...</div>
          ) : applicationsQuery.isError ? (
            <div className="p-4 text-danger">
              {applicationsQuery.error instanceof Error
                ? applicationsQuery.error.message
                : 'Ошибка загрузки'}
            </div>
          ) : applicationsQuery.data && applicationsQuery.data.length ? (
            <div className="divide-y">
              {applicationsQuery.data.map((app, index) => (
                <div
                  key={app.id}
                  className="flex items-center justify-between gap-4 px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">#{index + 1}</p>
                    <p className="font-medium text-gray-900 truncate">{app.name}</p>
                    <p className="text-sm text-gray-600">{app.phone}</p>
                    <p className="text-sm text-gray-500">{app.email}</p>
                  </div>

                  <button
                    className="btn btn-primary px-4 py-2"
                    onClick={() => setSelectedId(app.id)}
                  >
                    Рассмотреть
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-gray-600">Пока нет заявок</div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Рассмотрение заявки</p>
              <p className="font-semibold text-gray-900">
                {selectedApplication?.name ?? '...'}
              </p>
              <p className="text-sm text-gray-600">{selectedApplication?.phone}</p>
              <p className="text-sm text-gray-500">{selectedApplication?.email}</p>
            </div>

            <button
              className="btn btn-outline px-4 py-2"
              onClick={() => setSelectedId(null)}
            >
              Назад
            </button>
          </div>

          {selectedQuery.isLoading ? (
            <div className="mt-4 text-gray-600">Загрузка заявки...</div>
          ) : selectedQuery.isError ? (
            <div className="mt-4 text-danger">
              {selectedQuery.error instanceof Error
                ? selectedQuery.error.message
                : 'Ошибка загрузки заявки'}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Данные водителя</h2>

                <FormInput
                  label="Номер водительского удостоверения"
                  type="text"
                  error={errors.driverLicenseNumber?.message}
                  {...register('driverLicenseNumber')}
                />

                <FormSelect
                  label="Уровень комфорта"
                  error={errors.comfortLevel?.message}
                  options={[
                    { value: 'economy', label: 'Эконом' },
                    { value: 'comfort', label: 'Комфорт' },
                    { value: 'business', label: 'Бизнес' }
                  ]}
                  {...register('comfortLevel')}
                />

                <FormSubmitButton
                  loading={approveMutation.isPending}
                  onClick={onApprove}
                >
                  Подтвердить (Approve)
                </FormSubmitButton>

                <div className="mt-6 rounded-xl border border-gray-200 p-4">
                  <p className="font-medium text-gray-900">Отказать</p>
                  <p className="text-sm text-gray-600">
                    Если отказ — укажи причину (она сохранится в заявке).
                  </p>

                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Причина отказа
                    </label>
                    <textarea
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                      rows={3}
                      value={rejectComment}
                      onChange={(e) => setRejectComment(e.target.value)}
                    />
                  </div>

                  <div className="mt-3">
                    <button
                      className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
                      disabled={rejectMutation.isPending}
                      onClick={onReject}
                    >
                      {rejectMutation.isPending
                        ? 'Отказываю...'
                        : 'Отказать (Reject)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Машина</h2>

                <FormInput
                  label="Марка"
                  type="text"
                  error={errors.carMake?.message}
                  {...register('carMake')}
                />
                <FormInput
                  label="Модель"
                  type="text"
                  error={errors.carModel?.message}
                  {...register('carModel')}
                />
                <FormInput
                  label="Цвет"
                  type="text"
                  error={errors.carColor?.message}
                  {...register('carColor')}
                />
                <FormInput
                  label="Номер авто"
                  type="text"
                  helperText="Пример: 1234 AB-7"
                  error={errors.carPlate?.message}
                  {...register('carPlate', {
                    onChange: (e) => {
                      e.target.value = formatBelarusCarPlate(e.target.value)
                    }
                  })}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
