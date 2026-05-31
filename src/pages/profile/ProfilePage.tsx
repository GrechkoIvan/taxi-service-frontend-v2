import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Car as CarIcon,
  Clock,
  History,
  Mail,
  MapPin,
  Phone,
  Ruler,
  Shield,
  Star,
  User as UserIcon,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { USER_ROLES } from '../../shared/lib/constants/authConstants'
import { getCustomerOrdersHistory } from '../../shared/api/services/customerOrderService'
import {
  getDriverMeProfile,
  getDriverMeReviews,
  getDriverOrdersHistory,
} from '../../shared/api/services/driverService'
import { createReview } from '../../shared/api/services/reviewService'
import { StarRating } from '../../shared/ui/StarRating'

const ORDERS_PER_PAGE = 6
const REVIEWS_PER_PAGE = 5

function formatDate(date: string | undefined) {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getOrderStatusLabel(status: string) {
  if (status === 'searching_driver') return 'Поиск водителя'
  if (status === 'accepted') return 'Принят'
  if (status === 'arrived') return 'Водитель приехал'
  if (status === 'in_progress') return 'В пути'
  if (status === 'finished') return 'Завершён'
  if (status === 'canceled_by_customer') return 'Отменён'
  return status
}

function getRoleLabel(role: string | undefined) {
  if (role === USER_ROLES.CUSTOMER) return 'Клиент'
  if (role === USER_ROLES.DRIVER) return 'Водитель'
  return role ?? '—'
}

function getComfortLabel(level: string | null | undefined) {
  if (level === 'economy') return 'Эконом'
  if (level === 'comfort') return 'Комфорт'
  if (level === 'business') return 'Бизнес'
  return '—'
}

function formatRating(value: number | undefined) {
  const v = typeof value === 'number' ? value : 0
  return v.toFixed(1)
}

type InfoRowProps = {
  icon: LucideIcon
  label: string
  value: string
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
      <span className="rounded-2xl bg-white p-2 text-gray-900 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

type MetricProps = {
  icon: LucideIcon
  label: string
  value: string
}

function MetricPill({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
      <Icon className="h-4 w-4 text-gray-500" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user, userRole } = useAuthStore()

  const [reviewOrderId, setReviewOrderId] = useState<string | number | null>(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  const [customerOrdersPage, setCustomerOrdersPage] = useState(1)
  const [driverOrdersPage, setDriverOrdersPage] = useState(1)
  const [driverReviewsPage, setDriverReviewsPage] = useState(1)

  if (!isAuthenticated) {
    return (
      <div className="container py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Профиль</h1>
          <p className="text-gray-600 mb-6">Нужно войти в аккаунт, чтобы открыть профиль.</p>
          <button className="btn btn-primary px-6 py-3" onClick={() => navigate('/login')}>
            Войти
          </button>
        </div>
      </div>
    )
  }

  const isCustomer = userRole === USER_ROLES.CUSTOMER
  const isDriver = userRole === USER_ROLES.DRIVER

  const customerHistoryQuery = useQuery({
    queryKey: ['profile', 'customerOrdersHistory'],
    queryFn: getCustomerOrdersHistory,
    enabled: Boolean(isCustomer),
  })

  const driverHistoryQuery = useQuery({
    queryKey: ['profile', 'driverOrdersHistory'],
    queryFn: getDriverOrdersHistory,
    enabled: Boolean(isDriver),
  })

  const driverMeProfileQuery = useQuery({
    queryKey: ['profile', 'driverMeProfile'],
    queryFn: getDriverMeProfile,
    enabled: Boolean(isDriver),
  })

  const driverMeReviewsQuery = useQuery({
    queryKey: ['profile', 'driverMeReviews'],
    queryFn: getDriverMeReviews,
    enabled: Boolean(isDriver),
  })

  const createReviewMutation = useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      setReviewOrderId(null)
      setReviewRating(5)
      setReviewText('')
      setCustomerOrdersPage(1)
      await queryClient.invalidateQueries({ queryKey: ['profile', 'customerOrdersHistory'] })
    },
  })

  const customerOrdersTotal = customerHistoryQuery.data?.length ?? 0
  const customerOrdersTotalPages = Math.max(1, Math.ceil(customerOrdersTotal / ORDERS_PER_PAGE))
  const customerOrdersPageSafe = Math.min(customerOrdersPage, customerOrdersTotalPages)
  const customerOrdersSliceStart = (customerOrdersPageSafe - 1) * ORDERS_PER_PAGE
  const customerOrdersItems = customerHistoryQuery.data?.slice(
    customerOrdersSliceStart,
    customerOrdersSliceStart + ORDERS_PER_PAGE
  )

  const driverOrdersTotal = driverHistoryQuery.data?.length ?? 0
  const driverOrdersTotalPages = Math.max(1, Math.ceil(driverOrdersTotal / ORDERS_PER_PAGE))
  const driverOrdersPageSafe = Math.min(driverOrdersPage, driverOrdersTotalPages)
  const driverOrdersSliceStart = (driverOrdersPageSafe - 1) * ORDERS_PER_PAGE
  const driverOrdersItems = driverHistoryQuery.data?.slice(
    driverOrdersSliceStart,
    driverOrdersSliceStart + ORDERS_PER_PAGE
  )

  const driverReviewsTotal = driverMeReviewsQuery.data?.reviews?.length ?? 0
  const driverReviewsTotalPages = Math.max(1, Math.ceil(driverReviewsTotal / REVIEWS_PER_PAGE))
  const driverReviewsPageSafe = Math.min(driverReviewsPage, driverReviewsTotalPages)
  const driverReviewsSliceStart = (driverReviewsPageSafe - 1) * REVIEWS_PER_PAGE
  const driverReviewsItems = driverMeReviewsQuery.data?.reviews?.slice(
    driverReviewsSliceStart,
    driverReviewsSliceStart + REVIEWS_PER_PAGE
  )

  return (
    <div className="w-full h-full overflow-auto">
      <div className="w-full max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900">Профиль</h1>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 items-start">
          <div className="self-start space-y-4">
            <div className="rounded-3xl border border-gray-100 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gray-900 text-white p-3">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">Профиль</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.name ?? '—'}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <InfoRow icon={Phone} label="Телефон" value={user?.phone ?? '—'} />
                <InfoRow icon={Mail} label="Email" value={user?.email ?? '—'} />
                <InfoRow icon={Shield} label="Роль" value={getRoleLabel(user?.role)} />
              </div>
            </div>

            {isDriver ? (
              <div className="rounded-3xl border border-gray-100 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-gray-900 text-white p-3">
                    <CarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500">Автомобиль</p>
                    <p className="text-base font-semibold text-gray-900">
                      {driverMeProfileQuery.data?.car
                        ? `${driverMeProfileQuery.data.car.make} ${driverMeProfileQuery.data.car.model}`
                        : 'Данные не заполнены'}
                    </p>
                  </div>
                </div>

                {driverMeProfileQuery.isLoading ? (
                  <div className="mt-3 text-sm text-gray-600">Загрузка…</div>
                ) : driverMeProfileQuery.error ? (
                  <div className="mt-3 text-sm text-red-600">{String(driverMeProfileQuery.error)}</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <MetricPill
                      icon={Star}
                      label="Уровень комфорта"
                      value={getComfortLabel(driverMeProfileQuery.data?.comfortLevel)}
                    />
                    {driverMeProfileQuery.data?.car ? (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          {driverMeProfileQuery.data.car.make} {driverMeProfileQuery.data.car.model}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {driverMeProfileQuery.data.car.color} ·{' '}
                          <span className="font-semibold tracking-widest text-gray-900">
                            {driverMeProfileQuery.data.car.plate}
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Данные автомобиля не заполнены.</div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="self-start flex flex-col gap-4">
            {isDriver ? (
              <div className="rounded-3xl border border-gray-100 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-gray-900" />
                  <h2 className="text-lg font-semibold text-gray-900">Рейтинг и отзывы</h2>
                </div>

                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Средний рейтинг</div>
                  {driverMeReviewsQuery.isLoading ? (
                    <div className="mt-2 text-sm text-gray-600">Загрузка…</div>
                  ) : driverMeReviewsQuery.error ? (
                    <div className="mt-2 text-sm text-red-600">{String(driverMeReviewsQuery.error)}</div>
                  ) : (
                    <div className="mt-3">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatRating(driverMeReviewsQuery.data?.averageRating)}
                        <span className="ml-1 text-base font-semibold text-gray-500">/ 5</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        На основе {driverMeReviewsQuery.data?.totalReviews ?? 0} отзывов
                      </p>
                    </div>
                  )}
                </div>

                {!driverMeReviewsQuery.isLoading && !driverMeReviewsQuery.error ? (
                  (driverMeReviewsQuery.data?.reviews?.length ?? 0) === 0 ? (
                    <div className="mt-4 text-sm text-gray-600">Отзывов пока нет.</div>
                  ) : (
                    <>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          Страница {driverReviewsPageSafe} из {driverReviewsTotalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                            onClick={() => setDriverReviewsPage((p) => Math.max(1, p - 1))}
                            disabled={driverReviewsPageSafe <= 1}
                          >
                            Назад
                          </button>
                          <span className="self-center text-gray-300">|</span>
                          <button
                            type="button"
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                            onClick={() =>
                              setDriverReviewsPage((p) => Math.min(driverReviewsTotalPages, p + 1))
                            }
                            disabled={driverReviewsPageSafe >= driverReviewsTotalPages}
                          >
                            Вперед
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-3">
                        {driverReviewsItems?.map((r) => (
                          <div key={String(r.id)} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{r.customerName ?? 'Клиент'}</p>
                                <p className="text-xs text-gray-500">{formatDate(r.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <StarRating value={r.rating ?? 0} readOnly size="sm" className="justify-start" />
                                <span className="text-sm font-semibold text-gray-900">{r.rating} / 5</span>
                              </div>
                            </div>
                            {r.text ? <p className="mt-2 text-sm text-gray-800">{r.text}</p> : null}
                          </div>
                        ))}
                      </div>
                    </>
                  )
                ) : null}
              </div>
            ) : null}

            <div className="rounded-3xl border border-gray-100 bg-white/90 p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-gray-900" />
                <h2 className="text-lg font-semibold text-gray-900">История поездок</h2>
              </div>

              {isCustomer ? (
                <div className="mt-4">
                  {customerHistoryQuery.isLoading ? (
                    <div className="text-gray-600">Загрузка…</div>
                  ) : customerHistoryQuery.error ? (
                    <div className="text-red-600">{String(customerHistoryQuery.error)}</div>
                  ) : (customerHistoryQuery.data?.length ?? 0) === 0 ? (
                    <div className="text-gray-600">Пока нет поездок.</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
                        <span>
                          Страница {customerOrdersPageSafe} из {customerOrdersTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                            onClick={() => setCustomerOrdersPage((p) => Math.max(1, p - 1))}
                            disabled={customerOrdersPageSafe <= 1}
                          >
                            Назад
                          </button>
                          <span className="self-center text-gray-300">|</span>
                          <button
                            type="button"
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                            onClick={() =>
                              setCustomerOrdersPage((p) => Math.min(customerOrdersTotalPages, p + 1))
                            }
                            disabled={customerOrdersPageSafe >= customerOrdersTotalPages}
                          >
                            Вперед
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        {customerOrdersItems?.map((item) => {
                          const o = item.order
                          const hasReview = Boolean(item.review)
                          const canReview = o.status === 'finished' && !hasReview
                          const durationMinutes = Math.max(1, Math.round((o.durationSeconds ?? 0) / 60))

                          return (
                            <div key={String(o.id)} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    Заказ{' '}
                                    <span className="rounded-full bg-gray-900/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                      #{o.id}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">{formatDate(o.createdAt)}</div>
                                </div>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  {getOrderStatusLabel(o.status)}
                                </span>
                              </div>

                              <div className="mt-3 space-y-3 text-sm text-gray-900">
                                <div className="flex items-start gap-3">
                                  <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-600 shadow-sm">
                                    <MapPin className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Подача</p>
                                    <p className="font-semibold">{o.fromAddress ?? '—'}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="rounded-2xl bg-rose-50 p-2 text-rose-600 shadow-sm">
                                    <MapPin className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Назначение</p>
                                    <p className="font-semibold">{o.toAddress ?? '—'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <MetricPill icon={Ruler} label="Дистанция" value={`${Math.round(o.distanceMeters ?? 0)} м`} />
                                <MetricPill icon={Clock} label="Время" value={`${durationMinutes} мин`} />
                                <MetricPill icon={Wallet} label="Стоимость" value={`${o.priceByN ?? '—'} BYN`} />
                              </div>

                              {hasReview ? (
                                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                      Отзыв оставлен
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StarRating value={item.review?.rating ?? 0} readOnly size="sm" className="justify-start" />
                                      <span className="text-sm font-semibold text-gray-900">
                                        {item.review?.rating} / 5
                                      </span>
                                    </div>
                                  </div>
                                  {item.review?.text ? (
                                    <p className="mt-2 text-sm text-gray-800">{item.review.text}</p>
                                  ) : null}
                                </div>
                              ) : null}

                              {canReview ? (
                                <div className="mt-4 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                                  {reviewOrderId !== o.id ? (
                                    <button
                                      className="w-full rounded-2xl border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:translate-y-0.5 transition"
                                      onClick={() => setReviewOrderId(o.id)}
                                    >
                                      Оставить отзыв
                                    </button>
                                  ) : (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm font-semibold text-gray-900">Отзыв</div>
                                        <button
                                          className="text-sm text-gray-500 hover:text-gray-700"
                                          onClick={() => setReviewOrderId(null)}
                                          type="button"
                                        >
                                          Закрыть
                                        </button>
                                      </div>

                                      <div>
                                        <label className="block text-sm text-gray-700">Оценка</label>
                                        <select
                                          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
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
                                      </div>

                                      <div>
                                        <label className="block text-sm text-gray-700">Комментарий</label>
                                        <textarea
                                          className="mt-1 w-full min-h-[80px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
                                          value={reviewText}
                                          onChange={(e) => setReviewText(e.target.value)}
                                          placeholder="Пару слов о поездке"
                                          disabled={createReviewMutation.isPending}
                                        />
                                      </div>

                                      <button
                                        className="btn btn-primary w-full px-4 py-2 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={createReviewMutation.isPending}
                                        onClick={() => {
                                          if (!user?.id) return
                                          if (!o.driverId) return
                                          createReviewMutation.mutate({
                                            orderId: o.id,
                                            driverId: o.driverId,
                                            customerId: user.id,
                                            rating: reviewRating,
                                            text: reviewText.trim() ? reviewText.trim() : undefined,
                                            createdAt: new Date().toISOString(),
                                          })
                                        }}
                                        type="button"
                                      >
                                        {createReviewMutation.isPending ? 'Отправляю…' : 'Отправить отзыв'}
                                      </button>

                                      {createReviewMutation.error ? (
                                        <div className="text-sm text-red-600">
                                          {String(createReviewMutation.error)}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {isDriver ? (
                <div className="mt-8 border-t border-gray-100 pt-5">
                  {driverHistoryQuery.isLoading ? (
                    <div className="text-gray-600">Загрузка…</div>
                  ) : driverHistoryQuery.error ? (
                    <div className="text-red-600">{String(driverHistoryQuery.error)}</div>
                  ) : (driverHistoryQuery.data?.length ?? 0) === 0 ? (
                    <div className="text-gray-600">Пока нет выполненных поездок.</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
                        <span>
                          Страница {driverOrdersPageSafe} из {driverOrdersTotalPages}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                            onClick={() => setDriverOrdersPage((p) => Math.max(1, p - 1))}
                            disabled={driverOrdersPageSafe <= 1}
                          >
                            Назад
                          </button>
                          <span className="self-center text-gray-300">|</span>
                          <button
                            type="button"
                            className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-300"
                            onClick={() =>
                              setDriverOrdersPage((p) => Math.min(driverOrdersTotalPages, p + 1))
                            }
                            disabled={driverOrdersPageSafe >= driverOrdersTotalPages}
                          >
                            Вперед
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3">
                        {driverOrdersItems?.map((item) => {
                          const o = item.order
                          const review = item.review
                          const durationMinutes = Math.max(1, Math.round((o.durationSeconds ?? 0) / 60))

                          return (
                            <div key={String(o.id)} className="rounded-2xl border border-gray-100 bg-white px-4 py-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    Заказ{' '}
                                    <span className="rounded-full bg-gray-900/90 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                                      #{o.id}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">{formatDate(o.createdAt)}</div>
                                </div>
                                <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                                  {getOrderStatusLabel(o.status)}
                                </span>
                              </div>

                              <div className="mt-3 space-y-3 text-sm text-gray-900">
                                <div className="flex items-start gap-3">
                                  <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-600 shadow-sm">
                                    <MapPin className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Подача</p>
                                    <p className="font-semibold">{o.fromAddress ?? '—'}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3">
                                  <span className="rounded-2xl bg-rose-50 p-2 text-rose-600 shadow-sm">
                                    <MapPin className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-gray-500">Назначение</p>
                                    <p className="font-semibold">{o.toAddress ?? '—'}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <MetricPill icon={Ruler} label="Дистанция" value={`${Math.round(o.distanceMeters ?? 0)} м`} />
                                <MetricPill icon={Clock} label="Время" value={`${durationMinutes} мин`} />
                                <MetricPill icon={Wallet} label="Стоимость" value={`${o.priceByN ?? '—'} BYN`} />
                              </div>

                              {review ? (
                                <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                      Отзыв клиента
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <StarRating value={review.rating ?? 0} readOnly size="sm" className="justify-start" />
                                      <span className="text-sm font-semibold text-gray-900">{review.rating} / 5</span>
                                    </div>
                                  </div>
                                  {review.text ? (
                                    <p className="mt-2 text-sm text-gray-800">{review.text}</p>
                                  ) : (
                                    <p className="mt-2 text-xs text-gray-500">Клиент не оставил комментарий.</p>
                                  )}
                                </div>
                              ) : (
                                <div className="mt-4 text-sm text-gray-600">Отзыва пока нет.</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {!isCustomer && !isDriver ? (
                <div className="mt-4 text-gray-600">Профиль для этой роли пока не реализован.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
