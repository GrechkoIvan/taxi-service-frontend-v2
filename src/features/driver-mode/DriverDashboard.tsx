import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, MapPin, Navigation, Phone, Power, Ruler, Search, User } from 'lucide-react'
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
import { StepPanelBody, StepPanelCard, StepPanelSection } from '../order-creation/components/StepPanel'

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

function formatDistance(distanceMeters?: number) {
  if (!distanceMeters && distanceMeters !== 0) return '—'
  if (distanceMeters >= 1000) {
    return `${(distanceMeters / 1000).toFixed(1)} км`
  }
  return `${Math.round(distanceMeters)} м`
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

const comfortBadgeMeta = {
  economy: { label: 'Эконом', pill: 'bg-emerald-50 text-emerald-700' },
  comfort: { label: 'Комфорт', pill: 'bg-sky-50 text-sky-700' },
  business: { label: 'Бизнес', pill: 'bg-amber-50 text-amber-700' },
} as const

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

  const isCurrentOrderLocked = Boolean(
    currentOrder && !['finished', 'canceled_by_customer'].includes(currentOrder.status)
  )

  const currentComfortBadge = currentOrder
    ? comfortBadgeMeta[currentOrder.comfortType] ?? comfortBadgeMeta.economy
    : null

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
        { preset: 'islands#darkGreenStretchyIcon' }
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
    <div className="relative h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />

      <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-col gap-4 md:right-auto md:w-[480px]">
        <StepPanelCard className="pointer-events-auto">
          <StepPanelBody className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <Power className="h-4 w-4" />
                  Режим работы
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {isOnline ? 'Вы на линии — ловим новые заказы' : 'Вы не на линии — включите онлайн'}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <span
                  className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isOnline ? 'Онлайн' : 'Оффлайн'}
                </span>

                {isOnline ? (
                  <button
                    onClick={() => {
                      setFocusedOrderId(null)
                      goOfflineMutation.mutate()
                    }}
                    className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={goOfflineMutation.isPending || isCurrentOrderLocked}
                    title={isCurrentOrderLocked ? 'Завершите заказ, чтобы выйти оффлайн' : undefined}
                  >
                    Выключить
                  </button>
                ) : (
                  <button
                    onClick={() => goOnlineMutation.mutate()}
                    className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 transition hover:translate-y-0.5 disabled:opacity-60"
                    disabled={goOnlineMutation.isPending}
                  >
                    Выйти на линию
                  </button>
                )}
              </div>
            </div>
            {isCurrentOrderLocked ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Активный заказ — нельзя выходить оффлайн.
              </p>
            ) : null}
          </StepPanelBody>
        </StepPanelCard>

        {!isOnline ? null : currentOrderQuery.isLoading && !currentOrder ? (
          <StepPanelCard className="pointer-events-auto">
            <StepPanelBody>
              <p className="text-sm text-gray-600">Подгружаем ваш активный заказ…</p>
            </StepPanelBody>
          </StepPanelCard>
        ) : currentOrder ? (
          <StepPanelCard className="pointer-events-auto">
            <StepPanelBody className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>
                    Текущий заказ # {currentOrder.id}
                  </span>
                </div>
                {currentComfortBadge ? (
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${currentComfortBadge.pill}`}
                  >
                    {currentComfortBadge.label}
                  </span>
                ) : null}
              </div>

              <StepPanelSection label="Маршрут" muted>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-2xl bg-emerald-50 p-2 text-emerald-600 shadow-sm">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Подача</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentOrder.fromAddress ?? 'Точка A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-2xl bg-rose-50 p-2 text-rose-600 shadow-sm">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Назначение</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {currentOrder.toAddress ?? 'Точка B'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <span className="rounded-xl bg-gray-900/90 p-1.5 text-white">
                        <Ruler className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">Дистанция</p>
                        <p className="font-semibold">{formatDistance(currentOrder.distanceMeters)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      <span className="rounded-xl bg-gray-900/90 p-1.5 text-white">
                        <Clock className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-500">В пути</p>
                        <p className="font-semibold">{formatDuration(currentOrder.durationSeconds)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </StepPanelSection>

              <StepPanelSection label="Статус">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-gray-900/90 p-2 text-white">
                    <Navigation className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Текущее состояние</p>
                    <p className="text-sm font-semibold text-gray-900">{getDriverStatusLabel(currentOrder.status)}</p>
                  </div>
                </div>
              </StepPanelSection>

              <StepPanelSection label="Клиент" muted>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4 text-gray-500" />
                    {currentOrderCustomerQuery.isLoading
                      ? 'Загрузка…'
                      : currentOrderCustomerQuery.error
                        ? 'Не удалось загрузить'
                        : currentOrderCustomerQuery.data?.name ?? '—'}
                  </div>
                  {currentOrderCustomerQuery.data?.phone ? (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{currentOrderCustomerQuery.data.phone}</span>
                    </div>
                  ) : null}
                  {currentOrderCustomerQuery.error ? (
                    <p className="text-xs text-red-600">{String(currentOrderCustomerQuery.error)}</p>
                  ) : null}
                </div>
              </StepPanelSection>

              <button
                className="w-full rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition hover:translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
                onClick={() => {
                  const next = getNextDriverStatus(currentOrder.status)
                  if (!next) return
                  setStatusMutation.mutate({ orderId: currentOrder.id, status: next })
                }}
                disabled={!canGoNextStatus}
              >
                {setStatusMutation.isPending
                  ? 'Обновляем…'
                  : getNextDriverStatusLabel(currentOrder.status) === '—'
                    ? 'Нет следующих шагов'
                    : getNextDriverStatusLabel(currentOrder.status)}
              </button>

              {currentOrderQuery.error ? (
                <p className="text-sm text-red-600">{String(currentOrderQuery.error)}</p>
              ) : null}
              {setStatusMutation.error ? (
                <p className="text-sm text-red-600">{String(setStatusMutation.error)}</p>
              ) : null}
            </StepPanelBody>
          </StepPanelCard>
        ) : (
          <StepPanelCard className="pointer-events-auto">
            <StepPanelBody className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <Search className="h-4 w-4" />
                    Доступные заказы
                  </div>
                  <p className="mt-1 text-sm text-gray-600">Кликните по карточке, чтобы увидеть маршрут.</p>
                </div>
                <div className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                  {availableOrdersQuery.data?.length ?? 0} шт.
                </div>
              </div>

              {availableOrdersQuery.isLoading ? (
                <p className="text-sm text-gray-600">Загрузка заказов…</p>
              ) : availableOrdersQuery.error ? (
                <p className="text-sm text-red-600">{String(availableOrdersQuery.error)}</p>
              ) : (availableOrdersQuery.data?.length ?? 0) === 0 ? (
                <div className="flex items-center gap-3 rounded-3xl border border-gray-100 bg-white/70 px-4 py-3 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Пока нет заказов. Оставайтесь онлайн, чтобы поймать первый.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {availableOrdersQuery.data?.map((order) => {
                    const isFocused = String(order.id) === String(effectiveFocusedOrderId)
                    return (
                      <button
                        key={order.id}
                        className={`rounded-3xl border px-4 py-3 text-left transition ${
                          isFocused
                            ? 'border-gray-900 bg-gray-900 text-white shadow-lg shadow-gray-900/30'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() =>
                          setFocusedOrderId((prev) =>
                            String(prev) === String(order.id) ? null : order.id
                          )
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide">
                              <span className={isFocused ? 'text-white/80' : 'text-gray-500'}>
                                Заказ #{order.id}
                              </span>
                              <span>{order.priceByN} BYN</span>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">
                                Подача
                              </p>
                              <p className={`font-semibold ${isFocused ? 'text-white' : 'text-gray-900'}`}>
                                {order.fromAddress ?? 'Точка A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-500">
                                Назначение
                              </p>
                              <p className={`font-semibold ${isFocused ? 'text-white' : 'text-gray-900'}`}>
                                {order.toAddress ?? 'Точка B'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Ruler className="h-4 w-4" />
                                {formatDistance(order.distanceMeters)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatDuration(order.durationSeconds)}
                              </span>
                            </div>
                          </div>
                          {isFocused ? (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                acceptMutation.mutate(order.id)
                              }}
                              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow transition hover:translate-y-0.5 disabled:opacity-50"
                              disabled={acceptMutation.isPending}
                            >
                              Принять
                            </button>
                          ) : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {acceptMutation.error ? (
                <p className="text-sm text-red-600">{String(acceptMutation.error)}</p>
              ) : null}
            </StepPanelBody>
          </StepPanelCard>
        )}
      </div>
    </div>
  )
}
