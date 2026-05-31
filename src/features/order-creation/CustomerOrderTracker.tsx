import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelCustomerOrder,
  getCustomerDriverPublic,
  getCurrentCustomerOrder,
} from '../../shared/api/services/customerOrderService'
import { createReview } from '../../shared/api/services/reviewService'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { useOrderCreationStore } from '../../shared/lib/stores/orderCreationStore'
import type { Order } from '../../shared/api/types/orderTypes'

function getCustomerStatusLabel(status: Order['status']): string {
  if (status === 'searching_driver') return 'Ищем водителя'
  if (status === 'accepted') return 'Водитель в пути'
  if (status === 'arrived') return 'Водитель на месте'
  if (status === 'in_progress') return 'Поездка началась'
  if (status === 'finished') return 'Поездка завершена'
  if (status === 'canceled_by_customer') return 'Отменён'
  return status
}

export function CustomerOrderTracker() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  )

  useEffect(() => {
    const onVisibility = () => {
      setIsPageVisible(document.visibilityState === 'visible')
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const activeOrder = useOrderCreationStore((s) => s.activeOrder)
  const setActiveOrder = useOrderCreationStore((s) => s.setActiveOrder)
  const resetAll = useOrderCreationStore((s) => s.resetAll)

  const shouldPollCurrentOrder =
    Boolean(user) && (activeOrder?.status ?? 'active') !== 'finished' && (activeOrder?.status ?? 'active') !== 'canceled_by_customer'

  const currentOrderQuery = useQuery<Order | null>({
    queryKey: ['customer', 'currentOrder'],
    queryFn: getCurrentCustomerOrder,
    enabled: shouldPollCurrentOrder,
    refetchInterval: isPageVisible ? 3000 : false,
  })

  useEffect(() => {
    if (currentOrderQuery.data) {
      setActiveOrder(currentOrderQuery.data)
      return
    }

    if (currentOrderQuery.data === null) {
      if (activeOrder?.status === 'finished') return
      setActiveOrder(null)
    }
  }, [activeOrder?.status, currentOrderQuery.data, setActiveOrder])

  const cancelMutation = useMutation({
    mutationFn: (orderId: string | number) => cancelCustomerOrder(orderId),
    onSuccess: async () => {
      setActiveOrder(null)
      resetAll()
      queryClient.setQueryData(['customer', 'currentOrder'], null)
      await queryClient.invalidateQueries({ queryKey: ['customer', 'currentOrder'] })
    },
  })

  const createReviewMutation = useMutation({
    mutationFn: (payload: {
      orderId: string | number
      driverId: string
      customerId: string
      rating: number
      text?: string
      createdAt: string
    }) => createReview(payload),
    onSuccess: async () => {
      setActiveOrder(null)
      resetAll()
      queryClient.setQueryData(['customer', 'currentOrder'], null)
      await queryClient.invalidateQueries({ queryKey: ['customer', 'currentOrder'] })
    },
  })

  const orderCandidate = currentOrderQuery.data ?? activeOrder

  const driverPublicQuery = useQuery({
    queryKey: ['customer', 'driverPublic', orderCandidate?.driverId],
    queryFn: () => getCustomerDriverPublic(String(orderCandidate?.driverId ?? '')),
    enabled: Boolean(user && orderCandidate?.driverId),
  })

  if (currentOrderQuery.isLoading && !activeOrder) {
    return (
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-4 shadow">
        <p className="text-gray-600">Загрузка заказа...</p>
      </div>
    )
  }

  const order = orderCandidate

  if (!order) {
    return null
  }

  const safeOrder = order

  const canCancel = safeOrder.status === 'searching_driver'

  const isFinished = safeOrder.status === 'finished'
  const canSendReview = Boolean(user) && Boolean(safeOrder.driverId)

  async function handleSubmitReview() {
    if (!user) return
    if (!safeOrder.driverId) return

    const nextRating = Number(reviewRating)
    if (!Number.isFinite(nextRating) || nextRating < 1 || nextRating > 5) return

    await createReviewMutation.mutateAsync({
      orderId: safeOrder.id,
      driverId: safeOrder.driverId,
      customerId: user.id,
      rating: nextRating,
      text: reviewText.trim() ? reviewText.trim() : undefined,
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] bg-white/95 backdrop-blur rounded-xl border border-gray-200 p-4 shadow">
      {isFinished ? (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Поездка завершена</h2>
              <div className="text-xs text-gray-500 mt-0.5">Оставь отзыв о водителе</div>
            </div>
            <div className="text-xs font-medium text-gray-600">#{safeOrder.id}</div>
          </div>

          {!canSendReview ? (
            <p className="text-sm text-gray-600 mt-3">
              Не удалось отправить отзыв: нет данных о водителе.
            </p>
          ) : (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white p-3">
              <label className="block text-sm font-medium text-gray-700">Оценка</label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                disabled={createReviewMutation.isPending}
              >
                <option value={5}>5</option>
                <option value={4}>4</option>
                <option value={3}>3</option>
                <option value={2}>2</option>
                <option value={1}>1</option>
              </select>

              <label className="block text-sm font-medium text-gray-700 mt-3">Комментарий</label>
              <textarea
                className="mt-1 w-full min-h-[90px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Если есть что сказать — напиши пару слов"
                disabled={createReviewMutation.isPending}
              />

              <button
                className="btn btn-primary w-full px-4 py-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => void handleSubmitReview()}
                disabled={createReviewMutation.isPending}
              >
                {createReviewMutation.isPending ? 'Отправляю…' : 'Отправить отзыв'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Текущий заказ</h2>
              <div className="text-xs text-gray-500 mt-0.5">Отслеживание статуса</div>
            </div>
            <div className="text-xs font-medium text-gray-600">#{safeOrder.id}</div>
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white/70 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Маршрут
            </div>

            <div className="mt-2 grid gap-2 text-sm">
              <div>
                <div className="text-xs text-gray-500">Подача</div>
                <div className="font-semibold text-gray-900 leading-snug">
                  {safeOrder.fromAddress ?? 'Точка A'}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Куда</div>
                <div className="font-semibold text-gray-900 leading-snug">
                  {safeOrder.toAddress ?? 'Точка B'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/70 px-3 py-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Статус
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {getCustomerStatusLabel(safeOrder.status)}
              </div>
            </div>

            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {safeOrder.comfortType === 'business'
                ? 'Бизнес'
                : safeOrder.comfortType === 'comfort'
                  ? 'Комфорт'
                  : 'Эконом'}
            </div>
          </div>

          {safeOrder.driverId ? (
            <div className="mt-3 rounded-xl border border-gray-200 bg-white/70 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Водитель
                </div>

                {driverPublicQuery.data?.comfortLevel ? (
                  <div className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-800">
                    {driverPublicQuery.data.comfortLevel === 'business'
                      ? 'Бизнес'
                      : driverPublicQuery.data.comfortLevel === 'comfort'
                        ? 'Комфорт'
                        : 'Эконом'}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 text-sm font-semibold text-gray-900">
                {driverPublicQuery.isLoading
                  ? 'Загрузка…'
                  : driverPublicQuery.error
                    ? 'Не удалось загрузить'
                    : driverPublicQuery.data?.name ?? '—'}
              </div>

              {driverPublicQuery.data?.phone ? (
                <div className="mt-1 text-xs text-gray-600">
                  Телефон: <span className="font-medium">{driverPublicQuery.data.phone}</span>
                </div>
              ) : null}

              {driverPublicQuery.data?.car ? (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Машина
                  </div>
                  <div className="mt-1 text-sm text-gray-900">
                    <span className="font-semibold">{driverPublicQuery.data.car.make}</span>{' '}
                    {driverPublicQuery.data.car.model}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-600">
                    {driverPublicQuery.data.car.color} ·{' '}
                    <span className="font-semibold text-gray-900">
                      {driverPublicQuery.data.car.plate}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3">
            {canCancel ? (
              <button
                className="btn btn-outline px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => cancelMutation.mutate(safeOrder.id)}
                disabled={cancelMutation.isPending}
              >
                Отменить заказ
              </button>
            ) : null}
          </div>
        </div>
      )}

      {currentOrderQuery.error ? (
        <p className="text-sm text-red-600 mt-3">{String(currentOrderQuery.error)}</p>
      ) : null}
      {cancelMutation.error ? (
        <p className="text-sm text-red-600 mt-3">{String(cancelMutation.error)}</p>
      ) : null}
      {createReviewMutation.error ? (
        <p className="text-sm text-red-600 mt-3">{String(createReviewMutation.error)}</p>
      ) : null}
    </div>
  )
}
