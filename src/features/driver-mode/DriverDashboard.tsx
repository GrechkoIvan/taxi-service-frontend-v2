import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  acceptDriverOrder,
  driverGoOffline,
  driverGoOnline,
  getDriverCustomerPublic,
  getAvailableDriverOrders,
  getCurrentDriverOrder,
  setDriverOrderStatus,
  updateDriverLocation,
} from '../../shared/api/services/driverService'
import type { Order } from '../../shared/api/types/orderTypes'
import { useDriverModeStore } from '../../shared/lib/stores/driverModeStore'
import { loadYmaps } from '../../shared/lib/ymaps'

type GeoObject = unknown

type Coords = [number, number]

type YMapsMapLike = {
  geoObjects: {
    add: (obj: GeoObject) => void
    remove: (obj: GeoObject) => void
  }
  destroy: () => void
}

type YMapsLike = {
  Map: new (
    container: HTMLElement,
    state: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => YMapsMapLike
  Placemark: new (
    coords: Coords,
    properties?: Record<string, unknown>,
    options?: Record<string, unknown>
  ) => GeoObject
  multiRouter: {
    MultiRoute: new (model: Record<string, unknown>, options?: Record<string, unknown>) => GeoObject
  }
}

function getNextDriverStatus(status: Order['status']): 'arrived' | 'in_progress' | 'finished' | null {
  if (status === 'accepted') return 'arrived'
  if (status === 'arrived') return 'in_progress'
  if (status === 'in_progress') return 'finished'
  return null
}

function getNextDriverStatusLabel(status: Order['status']): string {
  if (status === 'accepted') return 'Приехал'
  if (status === 'arrived') return 'Начал поездку'
  if (status === 'in_progress') return 'Завершил'
  return '—'
}

function getDriverStatusLabel(status: Order['status']): string {
  if (status === 'accepted') return 'Еду к месту подачи'
  if (status === 'arrived') return 'Ожидание клиента'
  if (status === 'in_progress') return 'В пути'
  if (status === 'finished') return 'Завершён'
  if (status === 'searching_driver') return 'Поиск водителя'
  if (status === 'canceled_by_customer') return 'Отменён клиентом'
  return status
}

export function DriverDashboard() {
  const queryClient = useQueryClient()

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

  const isOnline = useDriverModeStore((s) => s.isOnline)
  const setOnline = useDriverModeStore((s) => s.setOnline)

  const [focusedOrderId, setFocusedOrderId] = useState<string | number | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [driverCoords, setDriverCoords] = useState<Coords | null>(null)

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YMapsMapLike | null>(null)
  const ymapsRef = useRef<YMapsLike | null>(null)
  const multiRouteRef = useRef<GeoObject | null>(null)
  const driverToPickupRouteRef = useRef<GeoObject | null>(null)
  const driverToPickupRouteKeyRef = useRef<string | null>(null)
  const pointAPlacemarkRef = useRef<GeoObject | null>(null)
  const pointBPlacemarkRef = useRef<GeoObject | null>(null)
  const driverPlacemarkRef = useRef<GeoObject | null>(null)
  const lastCoordsRef = useRef<Coords | null>(null)

  const currentOrderQuery = useQuery({
    queryKey: ['driver', 'currentOrder'],
    queryFn: getCurrentDriverOrder,
    enabled: isOnline,
    refetchInterval: isPageVisible ? 3000 : false,
  })

  const availableOrdersQuery = useQuery({
    queryKey: ['driver', 'availableOrders'],
    queryFn: getAvailableDriverOrders,
    enabled: isOnline && !currentOrderQuery.data,
    refetchInterval: isPageVisible ? 4000 : false,
  })

  const goOnlineMutation = useMutation({
    mutationFn: driverGoOnline,
    onSuccess: () => {
      setOnline(true)
      queryClient.invalidateQueries({ queryKey: ['driver'] })
    },
  })

  const goOfflineMutation = useMutation({
    mutationFn: driverGoOffline,
    onSuccess: () => {
      setOnline(false)
      queryClient.invalidateQueries({ queryKey: ['driver'] })
    },
  })

  const acceptMutation = useMutation({
    mutationFn: (orderId: string | number) => acceptDriverOrder(orderId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['driver', 'currentOrder'] }),
        queryClient.invalidateQueries({ queryKey: ['driver', 'availableOrders'] }),
      ])
    },
  })

  const setStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string | number
      status: 'arrived' | 'in_progress' | 'finished'
    }) => setDriverOrderStatus(orderId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['driver', 'currentOrder'] })
    },
  })

  const currentOrder = isOnline ? currentOrderQuery.data : null

  const currentOrderCustomerQuery = useQuery({
    queryKey: ['driver', 'currentOrderCustomer', currentOrder?.customerId],
    queryFn: () => getDriverCustomerPublic(String(currentOrder?.customerId ?? '')),
    enabled: Boolean(isOnline && currentOrder?.customerId),
  })

  const effectiveFocusedOrderId = useMemo(() => {
    if (currentOrder) return null

    const list = availableOrdersQuery.data ?? []
    if (list.length === 0) return null

    if (!focusedOrderId) return null
    const stillExists = list.some((o) => String(o.id) === String(focusedOrderId))
    return stillExists ? focusedOrderId : null
  }, [availableOrdersQuery.data, currentOrder, focusedOrderId])

  const focusedOrder = useMemo(() => {
    if (currentOrder) return currentOrder
    if (!isOnline) return null
    const list = availableOrdersQuery.data ?? []
    if (!effectiveFocusedOrderId) return null
    return (
      list.find((o) => String(o.id) === String(effectiveFocusedOrderId)) ?? (list[0] ?? null)
    )
  }, [availableOrdersQuery.data, currentOrder, effectiveFocusedOrderId, isOnline])

  const canGoNextStatus = Boolean(
    currentOrder && getNextDriverStatus(currentOrder.status) && !setStatusMutation.isPending
  )

  useEffect(() => {
    let isCancelled = false

    async function init() {
      try {
        const ymaps = (await loadYmaps()) as unknown as YMapsLike
        ymapsRef.current = ymaps

        if (isCancelled) return
        if (!mapContainerRef.current) return

        if (mapRef.current) return

        const map = new ymaps.Map(
          mapContainerRef.current,
          {
            center: [55.1848, 30.2016],
            zoom: 12,
            controls: [],
          },
          {
            suppressMapOpenBlock: true,
          }
        )

        mapRef.current = map
        setMapReady(true)
      } catch {
        // errors are shown via query errors in panel; ignore
      }
    }

    init()

    return () => {
      isCancelled = true
      setMapReady(false)
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
      ymapsRef.current = null
      multiRouteRef.current = null
      driverToPickupRouteRef.current = null
      driverToPickupRouteKeyRef.current = null
      pointAPlacemarkRef.current = null
      pointBPlacemarkRef.current = null
      driverPlacemarkRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    const orderForRoute = currentOrder ?? focusedOrder
    if (!orderForRoute) {
      if (multiRouteRef.current) {
        map.geoObjects.remove(multiRouteRef.current)
        multiRouteRef.current = null
      }

      if (driverToPickupRouteRef.current) {
        map.geoObjects.remove(driverToPickupRouteRef.current)
        driverToPickupRouteRef.current = null
        driverToPickupRouteKeyRef.current = null
      }

      if (pointAPlacemarkRef.current) {
        map.geoObjects.remove(pointAPlacemarkRef.current)
        pointAPlacemarkRef.current = null
      }
      if (pointBPlacemarkRef.current) {
        map.geoObjects.remove(pointBPlacemarkRef.current)
        pointBPlacemarkRef.current = null
      }

      return
    }

    if (multiRouteRef.current) {
      map.geoObjects.remove(multiRouteRef.current)
      multiRouteRef.current = null
    }

    // If an order is accepted, we don't need a separate driver->pickup route.
    // For focused (not accepted) orders it will be handled in a separate effect below.
    if (driverToPickupRouteRef.current && currentOrder) {
      map.geoObjects.remove(driverToPickupRouteRef.current)
      driverToPickupRouteRef.current = null
      driverToPickupRouteKeyRef.current = null
    }

    if (!pointAPlacemarkRef.current) {
      pointAPlacemarkRef.current = new ymaps.Placemark(
        orderForRoute.fromCoords,
        { iconCaption: 'A' },
        { preset: 'islands#blueStretchyIcon' }
      )
      map.geoObjects.add(pointAPlacemarkRef.current)
    } else {
      ;(
        pointAPlacemarkRef.current as {
          geometry: { setCoordinates: (c: Coords) => void }
        }
      ).geometry.setCoordinates(orderForRoute.fromCoords)
    }

    if (!pointBPlacemarkRef.current) {
      pointBPlacemarkRef.current = new ymaps.Placemark(
        orderForRoute.toCoords,
        { iconCaption: 'B' },
        { preset: 'islands#redStretchyIcon' }
      )
      map.geoObjects.add(pointBPlacemarkRef.current)
    } else {
      ;(
        pointBPlacemarkRef.current as {
          geometry: { setCoordinates: (c: Coords) => void }
        }
      ).geometry.setCoordinates(orderForRoute.toCoords)
    }

    const multiRoute = new ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [orderForRoute.fromCoords, orderForRoute.toCoords],
        params: {
          routingMode: 'auto',
          reverseGeocoding: false,
          results: 1,
        },
      },
      {
        boundsAutoApply: true,
        wayPointVisible: false,
      }
    )

    multiRouteRef.current = multiRoute
    map.geoObjects.add(multiRoute)
  }, [currentOrder, focusedOrder, isOnline])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    // Build driver->pickup route only for focused (not accepted) order
    if (!isOnline) {
      if (driverToPickupRouteRef.current) {
        map.geoObjects.remove(driverToPickupRouteRef.current)
        driverToPickupRouteRef.current = null
      }
      driverToPickupRouteKeyRef.current = null
      return
    }

    if (currentOrder) {
      if (driverToPickupRouteRef.current) {
        map.geoObjects.remove(driverToPickupRouteRef.current)
        driverToPickupRouteRef.current = null
      }
      driverToPickupRouteKeyRef.current = null
      return
    }

    if (!effectiveFocusedOrderId) {
      if (driverToPickupRouteRef.current) {
        map.geoObjects.remove(driverToPickupRouteRef.current)
        driverToPickupRouteRef.current = null
      }
      driverToPickupRouteKeyRef.current = null
      return
    }

    const order = focusedOrder
    if (!order || !driverCoords) {
      return
    }

    const key = String(effectiveFocusedOrderId)
    if (driverToPickupRouteKeyRef.current === key && driverToPickupRouteRef.current) {
      return
    }

    if (driverToPickupRouteRef.current) {
      map.geoObjects.remove(driverToPickupRouteRef.current)
      driverToPickupRouteRef.current = null
    }

    const route = new ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [driverCoords, order.fromCoords],
        params: {
          routingMode: 'auto',
          reverseGeocoding: false,
          results: 1,
        },
      },
      {
        boundsAutoApply: false,
        wayPointVisible: false,
        routeActiveStrokeColor: '22c55eff',
        routeActiveStrokeWidth: 6,
        routeActiveOpacity: 0.85,
        routeActiveLine: {
          strokeColor: '22c55eff',
          lineWidth: 6,
          opacity: 0.85,
        },
      }
    )

    // Some builds of JSAPI don't apply routeActiveLine reliably for MultiRoute,
    // so we also enforce style on the active route paths.
    const routeLike = route as unknown as {
      events?: { add?: (event: string, cb: () => void) => void }
      getActiveRoute?: () => unknown
    }

    if (typeof routeLike.events?.add === 'function') {
      routeLike.events.add('update', () => {
        const activeRoute = routeLike.getActiveRoute?.() as unknown as {
          getPaths?: () => unknown
        }
        const paths = activeRoute?.getPaths?.() as unknown as {
          options?: { set?: (opts: Record<string, unknown>) => void }
        }
        if (!paths) return

        if (typeof paths.options?.set === 'function') {
          paths.options.set({
            strokeColor: '22c55eff',
            strokeWidth: 6,
            opacity: 0.85,
          })
        }
      })
    }

    driverToPickupRouteRef.current = route
    driverToPickupRouteKeyRef.current = key
    map.geoObjects.add(route)
  }, [currentOrder, driverCoords, effectiveFocusedOrderId, focusedOrder, isOnline, mapReady])

  useEffect(() => {
    if (!mapReady) return

    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    if (!('geolocation' in navigator)) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

        lastCoordsRef.current = [lat, lon]
        setDriverCoords([lat, lon])

        if (!driverPlacemarkRef.current) {
          driverPlacemarkRef.current = new ymaps.Placemark(
            [lat, lon],
            { iconCaption: 'Вы' },
            { preset: 'islands#violetCircleDotIcon' }
          )
          map.geoObjects.add(driverPlacemarkRef.current)
        } else {
          ;(driverPlacemarkRef.current as { geometry: { setCoordinates: (c: Coords) => void } }).geometry.setCoordinates([
            lat,
            lon,
          ])
        }

        if (isOnline) {
          updateDriverLocation({ lat, lon }).catch(() => {})
        }
      },
      () => {
        // ignore
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline, mapReady])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-4 shadow">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-gray-900">Экран водителя</h1>
        </div>

        {currentOrder ? null : (
          <div className="mt-3 border rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-gray-900 font-semibold">Режим работы</p>
                <p className="text-sm text-gray-600">
                  {isOnline ? 'Вы на линии. Ищем заказы…' : 'Вы не на линии. Включите режим онлайн.'}
                </p>
              </div>

              {isOnline ? (
                <button
                  onClick={() => {
                    setFocusedOrderId(null)
                    goOfflineMutation.mutate()
                  }}
                  className="btn btn-outline px-3 py-2"
                  disabled={goOfflineMutation.isPending}
                >
                  Оффлайн
                </button>
              ) : (
                <button
                  onClick={() => goOnlineMutation.mutate()}
                  className="btn btn-primary px-3 py-2"
                  disabled={goOnlineMutation.isPending}
                >
                  Онлайн
                </button>
              )}
            </div>
          </div>
        )}

        {!isOnline ? null : currentOrderQuery.isLoading && !currentOrder ? (
          <div className="mt-3 text-gray-600">Загрузка текущего заказа…</div>
        ) : currentOrder ? (
          <div className="mt-3">
            <div className="rounded-xl border border-gray-200 bg-white/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Текущий заказ</h2>
                  <div className="text-xs text-gray-500 mt-0.5">Управление статусом</div>
                </div>
                <div className="text-xs font-medium text-gray-600">#{currentOrder.id}</div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-white/70 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Маршрут
                </div>

                <div className="mt-2 grid gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Подача</div>
                    <div className="font-semibold text-gray-900 leading-snug">
                      {currentOrder.fromAddress ?? 'Точка A'}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500">Куда</div>
                    <div className="font-semibold text-gray-900 leading-snug">
                      {currentOrder.toAddress ?? 'Точка B'}
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
                    {getDriverStatusLabel(currentOrder.status)}
                  </div>
                </div>

                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {currentOrder.comfortType === 'business'
                    ? 'Бизнес'
                    : currentOrder.comfortType === 'comfort'
                      ? 'Комфорт'
                      : 'Эконом'}
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-white/70 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Клиент
                </div>

                <div className="mt-2 text-sm font-semibold text-gray-900">
                  {currentOrderCustomerQuery.isLoading
                    ? 'Загрузка…'
                    : currentOrderCustomerQuery.error
                      ? 'Не удалось загрузить'
                      : currentOrderCustomerQuery.data?.name ?? '—'}
                </div>

                {currentOrderCustomerQuery.data?.phone ? (
                  <div className="mt-1 text-xs text-gray-600">
                    Телефон:{' '}
                    <span className="font-medium">{currentOrderCustomerQuery.data.phone}</span>
                  </div>
                ) : null}

                {currentOrderCustomerQuery.error ? (
                  <div className="text-xs text-red-600 mt-1">
                    {String(currentOrderCustomerQuery.error)}
                  </div>
                ) : null}
              </div>

              <div className="mt-3">
                <button
                  className="btn btn-primary w-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    const next = getNextDriverStatus(currentOrder.status)
                    if (!next) return
                    setStatusMutation.mutate({ orderId: currentOrder.id, status: next })
                  }}
                  disabled={!canGoNextStatus}
                >
                  {getNextDriverStatusLabel(currentOrder.status)}
                </button>
              </div>
            </div>

            {currentOrderQuery.error ? (
              <p className="text-sm text-red-600 mt-3">{String(currentOrderQuery.error)}</p>
            ) : null}
            {setStatusMutation.error ? (
              <p className="text-sm text-red-600 mt-3">{String(setStatusMutation.error)}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-3">
            <h2 className="text-base font-semibold">Доступные заказы</h2>

            {availableOrdersQuery.isLoading ? (
              <div className="text-gray-600 mt-2">Загрузка заказов…</div>
            ) : availableOrdersQuery.error ? (
              <div className="text-red-600 mt-2">{String(availableOrdersQuery.error)}</div>
            ) : (availableOrdersQuery.data?.length ?? 0) === 0 ? (
              <div className="text-gray-600 mt-2">Пока нет заказов.</div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                <div className="text-xs text-gray-500">Нажми на заказ, чтобы показать маршрут</div>
                {availableOrdersQuery.data?.map((order) => {
                  const isFocused = String(order.id) === String(effectiveFocusedOrderId)
                  return (
                    <button
                      key={order.id}
                      className={
                        (isFocused
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300') +
                        ' text-left border rounded-lg p-3 bg-white'
                      }
                      onClick={() =>
                        setFocusedOrderId((prev) =>
                          String(prev) === String(order.id) ? null : order.id
                        )
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-xs text-gray-500">Заказ #{order.id}</div>
                            <div className="text-xs font-semibold text-gray-900">
                              {order.priceByN} BYN
                            </div>
                          </div>

                          <div className="mt-2">
                            <div className="text-xs text-gray-500">Подача</div>
                            <div className="font-semibold text-gray-900 truncate">
                              {order.fromAddress ?? 'Точка A'}
                            </div>
                          </div>

                          <div className="mt-2">
                            <div className="text-xs text-gray-500">Куда</div>
                            <div className="font-semibold text-gray-900 truncate">
                              {order.toAddress ?? 'Точка B'}
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 mt-2">
                            {Math.round(order.distanceMeters)} м · {Math.round(order.durationSeconds)} сек
                          </div>
                        </div>
                        {isFocused ? (
                          <div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                acceptMutation.mutate(order.id)
                              }}
                              className="btn btn-primary px-3 py-2"
                              disabled={acceptMutation.isPending}
                            >
                              Принять
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {acceptMutation.error ? (
              <p className="text-sm text-red-600 mt-3">{String(acceptMutation.error)}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
