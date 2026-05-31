import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Car, Clock, MapPin, MessageSquare, Navigation, Phone, Ruler, Star, UserRound, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  cancelCustomerOrder,
  getCustomerDriverPublic,
  getCurrentCustomerOrder,
} from '../../shared/api/services/customerOrderService'
import { createReview } from '../../shared/api/services/reviewService'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { useOrderCreationStore } from '../../shared/lib/stores/orderCreationStore'
import type { Order } from '../../shared/api/types/orderTypes'
import { StepPanelBody, StepPanelCard, StepPanelHeader, StepPanelSection } from './components/StepPanel'
import { StarRating } from '../../shared/ui/StarRating'

const comfortMeta = {
  economy: { label: 'Эконом', pill: 'bg-emerald-50 text-emerald-700' },
  comfort: { label: 'Комфорт', pill: 'bg-sky-50 text-sky-700' },
  business: { label: 'Бизнес', pill: 'bg-amber-50 text-amber-700' },
} as const

function formatDistance(distanceMeters?: number) {
  if (!distanceMeters && distanceMeters !== 0) return '—'
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} км`
  }
  return `${Math.round(distanceMeters)} м`
}

function formatDriverRating(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(1)
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed.toFixed(1)
    }
  }
  return '0.0'
}

function normalizeReviewsCount(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function formatDuration(durationSeconds?: number) {
  if (!durationSeconds && durationSeconds !== 0) return '—'
  const minutes = Math.max(1, Math.round(durationSeconds / 60))
  if (minutes < 60) {
    return `${minutes} мин`
  }
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  return `${hours} ч ${restMinutes || 0} мин`
}

type RouteMetricConfig = {
  icon: LucideIcon
  label: string
  value: string
}

function RouteMetric({ icon: Icon, label, value }: RouteMetricConfig) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-900">
      <span className="rounded-xl bg-gray-900/90 p-1 text-white">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="leading-tight">
        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

function getCustomerStatusLabel(status: Order['status']): string {
  if (status === 'searching_driver') return 'Ищем водителя'
  if (status === 'accepted') return 'Водитель в пути'
  if (status === 'arrived') return 'Водитель на месте'
  if (status === 'in_progress') return 'Поездка началась'
  if (status === 'finished') return 'Поездка завершена'
  if (status === 'canceled_by_customer') return 'Отменён'
  return status
}

function RoutePoint({
  label,
  value,
  accent,
}: {
  label: string
  value: string | null | undefined
  accent: 'emerald' | 'rose'
}) {
  const accentClasses =
    accent === 'emerald'
      ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
      : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100'

  return (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 rounded-2xl p-2 shadow-sm ${accentClasses}`}>
        <MapPin className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value ?? '—'}</p>
      </div>
    </div>
  )
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
  const setActivePoint = useOrderCreationStore((s) => s.setActivePoint)

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

  useEffect(() => {
    setActivePoint(null)
  }, [setActivePoint])

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
      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px]">
        <StepPanelCard>
          <StepPanelHeader
            stepBadge="Шаг 2 · Отслеживание"
            statusText="Готовим данные"
            title="Загружаем текущий заказ…"
          />
          <StepPanelBody>
            <p className="text-sm text-gray-600">Загрузка заказа...</p>
          </StepPanelBody>
        </StepPanelCard>
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

  const comfortBadge = comfortMeta[safeOrder.comfortType] ?? comfortMeta.economy
  const headerMeta = (
    <div className="flex w-full flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-700 md:flex-nowrap">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="text-gray-600">Номер заказа</span>
        <span className="text-base font-bold tracking-widest text-gray-900">#{safeOrder.id}</span>
      </div>
      <span className={`rounded-full px-3 py-1 text-[10px] ${comfortBadge.pill}`}>{comfortBadge.label}</span>
    </div>
  )

  const routeMetrics: RouteMetricConfig[] = [
    { icon: Ruler, label: 'Дистанция', value: formatDistance(safeOrder.distanceMeters) },
    { icon: Clock, label: 'В пути', value: formatDuration(safeOrder.durationSeconds) },
    { icon: Wallet, label: 'Стоимость', value: safeOrder.priceByN ? `${safeOrder.priceByN} BYN` : '—' },
  ]

  const showDriverSection =
    Boolean(safeOrder.driverId) &&
    Boolean(driverPublicQuery.data) &&
    !driverPublicQuery.isLoading &&
    !driverPublicQuery.error

  const trackingContent = (
    <div className="space-y-4">
      <StepPanelSection label="Маршрут" muted>
        <div className="space-y-4">
          <RoutePoint label="Подача" value={safeOrder.fromAddress ?? 'Точка A'} accent="emerald" />
          <RoutePoint label="Назначение" value={safeOrder.toAddress ?? 'Точка B'} accent="rose" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {routeMetrics.map((metric) => (
              <RouteMetric key={metric.label} {...metric} />
            ))}
          </div>
        </div>
      </StepPanelSection>

      <StepPanelSection label="Статус" muted>
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Navigation className="h-4 w-4 text-gray-500" />
          <span>{getCustomerStatusLabel(safeOrder.status)}</span>
        </div>
        {canCancel ? (
          <button
            className="mt-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => cancelMutation.mutate(safeOrder.id)}
            disabled={cancelMutation.isPending}
          >
            Отменить заказ
          </button>
        ) : null}
      </StepPanelSection>

      {showDriverSection ? (
        <StepPanelSection label="Водитель" muted>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <UserRound className="h-4 w-4 text-gray-500" />
              <span className="truncate">{driverPublicQuery.data!.name}</span>
            </div>
            {driverPublicQuery.data!.phone ? (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">{driverPublicQuery.data!.phone}</span>
              </div>
            ) : null}
            {driverPublicQuery.data!.car ? (
              <div className="flex items-start gap-3 text-sm text-gray-900">
                <Car className="h-10 w-5 text-gray-500" />
                <div>
                  <p className="font-semibold">
                    {driverPublicQuery.data!.car.make} {driverPublicQuery.data!.car.model}
                  </p>
                  <p className="text-xs text-gray-500">
                    {driverPublicQuery.data!.car.color} ·{' '}
                    <span className="font-semibold tracking-widest text-gray-900">
                      {driverPublicQuery.data!.car.plate}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2 text-sm">
              <div className="flex items-center gap-1 text-gray-900">
                <Star className="h-4 w-4 text-amber-500" />
                <span className="font-semibold">
                  {formatDriverRating(driverPublicQuery.data!.averageRating)} / 5
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {normalizeReviewsCount(driverPublicQuery.data!.totalReviews)} отзывов
              </span>
            </div>
          </div>
        </StepPanelSection>
      ) : null}
    </div>
  )

  const reviewContent = !canSendReview ? (
    <StepPanelSection muted>
      <p className="text-sm text-gray-600">Нет данных о водителе — отзыв недоступен.</p>
    </StepPanelSection>
  ) : (
    <StepPanelSection>
      <div className="space-y-5">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-gray-700">Оцени поездку</p>
          <StarRating
            value={reviewRating}
            onChange={(next) => setReviewRating(next)}
            className="justify-center"
            ariaLabel="Оценка поездки"
          />
          <p className="text-xs text-gray-500">{reviewRating} из 5</p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <MessageSquare className="h-4 w-4 text-gray-500" />
            Комментарий
          </label>
          <textarea
            className="mt-2 w-full min-h-[90px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Расскажи, как прошла поездка"
            disabled={createReviewMutation.isPending}
          />
        </div>

        <button
          className="w-full rounded-2xl border border-transparent bg-gradient-to-r from-primary to-primary-dark px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/40 transition disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void handleSubmitReview()}
          disabled={createReviewMutation.isPending}
        >
          {createReviewMutation.isPending ? 'Отправляю…' : 'Отправить отзыв'}
        </button>
      </div>
    </StepPanelSection>
  )

  const baseWrapperClasses = 'absolute top-4 left-4 right-4 md:right-auto md:w-[420px]'

  return (
    <div className={baseWrapperClasses}>
      <StepPanelCard>
        <StepPanelHeader
          stepBadge={isFinished ? 'Шаг 3 · Отзыв' : 'Шаг 2 · Отслеживание'}
          meta={headerMeta}
        />

        <StepPanelBody>
          {isFinished ? reviewContent : trackingContent}

          {currentOrderQuery.error ? (
            <p className="text-sm text-red-600 mt-3">{String(currentOrderQuery.error)}</p>
          ) : null}
          {cancelMutation.error ? (
            <p className="text-sm text-red-600 mt-3">{String(cancelMutation.error)}</p>
          ) : null}
          {createReviewMutation.error ? (
            <p className="text-sm text-red-600 mt-3">{String(createReviewMutation.error)}</p>
          ) : null}
        </StepPanelBody>
      </StepPanelCard>
    </div>
  )
}
