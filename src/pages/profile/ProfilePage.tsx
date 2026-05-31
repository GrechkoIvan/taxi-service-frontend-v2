import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { USER_ROLES } from '../../shared/lib/constants/authConstants'
import { getCustomerOrdersHistory } from '../../shared/api/services/customerOrderService'
import {
  getDriverMeProfile,
  getDriverMeReviews,
  getDriverOrdersHistory,
} from '../../shared/api/services/driverService'
import { createReview } from '../../shared/api/services/reviewService'

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
          <button className="btn btn-primary px-6 py-3" onClick={() => navigate('/auth')}>
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
          <div className="self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm text-gray-500">Имя</div>
              <div className="text-lg font-semibold text-gray-900">{user?.name ?? '—'}</div>

              <div className="mt-4 text-sm text-gray-500">Телефон</div>
              <div className="text-base font-semibold text-gray-900">{user?.phone ?? '—'}</div>

              <div className="mt-4 text-sm text-gray-500">Email</div>
              <div className="text-base font-semibold text-gray-900">{user?.email ?? '—'}</div>

              <div className="mt-4 text-sm text-gray-500">Роль</div>
              <div className="text-base font-semibold text-gray-900">{getRoleLabel(user?.role)}</div>
            </div>

            {isDriver ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <div className="text-base font-semibold text-gray-900">Машина</div>

                {driverMeProfileQuery.isLoading ? (
                  <div className="mt-2 text-sm text-gray-600">Загрузка...</div>
                ) : driverMeProfileQuery.error ? (
                  <div className="mt-2 text-sm text-red-600">{String(driverMeProfileQuery.error)}</div>
                ) : (
                  <>
                    <div className="mt-3 text-sm text-gray-500">Уровень</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {getComfortLabel(driverMeProfileQuery.data?.comfortLevel)}
                    </div>

                    <div className="mt-3 text-sm text-gray-500">Авто</div>
                    {driverMeProfileQuery.data?.car ? (
                      <div className="text-sm font-semibold text-gray-900">
                        {driverMeProfileQuery.data.car.make} {driverMeProfileQuery.data.car.model}
                        <div className="mt-1 text-xs font-medium text-gray-600">
                          {driverMeProfileQuery.data.car.color} ·{' '}
                          <span className="font-semibold text-gray-900">
                            {driverMeProfileQuery.data.car.plate}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600">Не заполнено</div>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </div>

          <div className="self-start flex flex-col gap-4">
            {isDriver ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">Рейтинг и отзывы</h2>
                </div>

                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Рейтинг</div>
                  {driverMeReviewsQuery.isLoading ? (
                    <div className="mt-1 text-sm text-gray-600">Загрузка...</div>
                  ) : driverMeReviewsQuery.error ? (
                    <div className="mt-1 text-sm text-red-600">{String(driverMeReviewsQuery.error)}</div>
                  ) : (
                    <div className="mt-1 text-lg font-semibold text-gray-900">
                      {formatRating(driverMeReviewsQuery.data?.averageRating)} / 5
                      <span className="ml-2 text-sm font-medium text-gray-600">
                        ({driverMeReviewsQuery.data?.totalReviews ?? 0})
                      </span>
                    </div>
                  )}
                </div>

                {!driverMeReviewsQuery.isLoading && !driverMeReviewsQuery.error ? (
                  (driverMeReviewsQuery.data?.reviews?.length ?? 0) === 0 ? (
                    <div className="mt-3 text-sm text-gray-600">Отзывов пока нет.</div>
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

                      <div className="mt-3 flex flex-col gap-2">
                        {driverReviewsItems?.map((r) => (
                          <div key={String(r.id)} className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-sm font-semibold text-gray-900">
                                {r.customerName ?? 'Клиент'}
                              </div>
                              <div className="text-xs font-semibold text-gray-700">{r.rating} / 5</div>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{formatDate(r.createdAt)}</div>
                            {r.text ? <div className="text-sm text-gray-800 mt-2">{r.text}</div> : null}
                          </div>
                        ))}
                      </div>
                    </>
                  )
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">История поездок</h2>
              </div>

              {isCustomer ? (
                <div className="mt-3">
                  {customerHistoryQuery.isLoading ? (
                    <div className="text-gray-600">Загрузка...</div>
                  ) : customerHistoryQuery.error ? (
                    <div className="text-red-600">{String(customerHistoryQuery.error)}</div>
                  ) : (customerHistoryQuery.data?.length ?? 0) === 0 ? (
                    <div className="text-gray-600">Пока нет поездок.</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          Страница {customerOrdersPageSafe} из {customerOrdersTotalPages}
                        </div>
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

                      <div className="mt-3 flex flex-col gap-3">
                        {customerOrdersItems?.map((item) => {
                          const o = item.order
                          const hasReview = Boolean(item.review)
                          const canReview = o.status === 'finished' && !hasReview

                          return (
                            <div key={String(o.id)} className="rounded-xl border border-gray-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">Заказ #{o.id}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{formatDate(o.createdAt)}</div>
                                </div>
                                <div className="text-xs font-semibold text-gray-700">
                                  {getOrderStatusLabel(o.status)}
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-gray-800">
                                <div className="truncate">
                                  <span className="text-gray-500">A:</span> {o.fromAddress ?? '—'}
                                </div>
                                <div className="truncate">
                                  <span className="text-gray-500">B:</span> {o.toAddress ?? '—'}
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-gray-600">
                                {Math.round(o.distanceMeters)} м · {Math.round(o.durationSeconds)} сек ·{' '}
                                {o.priceByN} BYN
                              </div>

                              {hasReview ? (
                                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                  <div className="text-xs text-gray-500">Отзыв оставлен</div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    Оценка: {item.review?.rating}
                                  </div>
                                  {item.review?.text ? (
                                    <div className="text-sm text-gray-800 mt-1">{item.review.text}</div>
                                  ) : null}
                                </div>
                              ) : null}

                              {canReview ? (
                                <div className="mt-3">
                                  {reviewOrderId !== o.id ? (
                                    <button
                                      className="btn btn-primary px-4 py-2"
                                      onClick={() => setReviewOrderId(o.id)}
                                    >
                                      Оставить отзыв
                                    </button>
                                  ) : (
                                    <div className="rounded-lg border border-gray-200 bg-white p-3">
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

                                      <div className="mt-2">
                                        <label className="block text-sm text-gray-700">Оценка</label>
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
                                      </div>

                                      <div className="mt-2">
                                        <label className="block text-sm text-gray-700">Комментарий</label>
                                        <textarea
                                          className="mt-1 w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                          value={reviewText}
                                          onChange={(e) => setReviewText(e.target.value)}
                                          placeholder="Пару слов о поездке"
                                          disabled={createReviewMutation.isPending}
                                        />
                                      </div>

                                      <button
                                        className="btn btn-primary w-full px-4 py-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        <div className="text-sm text-red-600 mt-2">
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
                <div className="mt-3">
                  {driverHistoryQuery.isLoading ? (
                    <div className="text-gray-600">Загрузка...</div>
                  ) : driverHistoryQuery.error ? (
                    <div className="text-red-600">{String(driverHistoryQuery.error)}</div>
                  ) : (driverHistoryQuery.data?.length ?? 0) === 0 ? (
                    <div className="text-gray-600">Пока нет выполненных поездок.</div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          Страница {driverOrdersPageSafe} из {driverOrdersTotalPages}
                        </div>
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

                      <div className="mt-3 flex flex-col gap-3">
                        {driverOrdersItems?.map((item) => {
                          const o = item.order
                          const review = item.review

                          return (
                            <div key={String(o.id)} className="rounded-xl border border-gray-200 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">Заказ #{o.id}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{formatDate(o.createdAt)}</div>
                                </div>
                                <div className="text-xs font-semibold text-gray-700">
                                  {getOrderStatusLabel(o.status)}
                                </div>
                              </div>

                              <div className="mt-2 text-sm text-gray-800">
                                <div className="truncate">
                                  <span className="text-gray-500">A:</span> {o.fromAddress ?? '—'}
                                </div>
                                <div className="truncate">
                                  <span className="text-gray-500">B:</span> {o.toAddress ?? '—'}
                                </div>
                              </div>

                              <div className="mt-2 text-xs text-gray-600">
                                {Math.round(o.distanceMeters)} м · {Math.round(o.durationSeconds)} сек ·{' '}
                                {o.priceByN} BYN
                              </div>

                              {review ? (
                                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                                  <div className="text-xs text-gray-500">Отзыв клиента</div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    Оценка: {review.rating}
                                  </div>
                                  {review.text ? (
                                    <div className="text-sm text-gray-800 mt-1">{review.text}</div>
                                  ) : null}
                                </div>
                              ) : (
                                <div className="mt-3 text-sm text-gray-600">Отзыва пока нет.</div>
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
                <div className="mt-3 text-gray-600">Профиль для этой роли пока не реализован.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
