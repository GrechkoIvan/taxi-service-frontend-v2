import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { loadYmaps } from '../../shared/lib/ymaps'
import {
  getCachedRouteInfo,
  reverseGeocodeToAddress,
  setCachedRouteInfo,
} from '../../shared/lib/ymaps/ymapsServices'
import { getCurrentCustomerOrder } from '../../shared/api/services/customerOrderService'
import type { Order } from '../../shared/api/types/orderTypes'
import {
  type ActivePoint,
  type Coords,
  type RouteInfo,
  useOrderCreationStore,
} from '../../shared/lib/stores/orderCreationStore'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { OrderPanelForm } from './OrderPanelForm'
import { CustomerOrderTracker } from './CustomerOrderTracker'

export function CustomerOrderMap() {
  const { user } = useAuthStore()

  const [mapReady, setMapReady] = useState(false)

  const activeOrder = useOrderCreationStore((s) => s.activeOrder)
  const setActiveOrder = useOrderCreationStore((s) => s.setActiveOrder)

  const activePoint = useOrderCreationStore((s) => s.activePoint)
  const pointACoords = useOrderCreationStore((s) => s.pointACoords)
  const pointBCoords = useOrderCreationStore((s) => s.pointBCoords)
  const routeBuildRequestId = useOrderCreationStore((s) => s.routeBuildRequestId)

  const setFromAddress = useOrderCreationStore((s) => s.setFromAddress)
  const setToAddress = useOrderCreationStore((s) => s.setToAddress)
  const setPointACoords = useOrderCreationStore((s) => s.setPointACoords)
  const setPointBCoords = useOrderCreationStore((s) => s.setPointBCoords)
  const setRouteInfo = useOrderCreationStore((s) => s.setRouteInfo)
  const setIsRouteLoading = useOrderCreationStore((s) => s.setIsRouteLoading)
  const setError = useOrderCreationStore((s) => s.setError)
  const setSuccessMessage = useOrderCreationStore((s) => s.setSuccessMessage)

  const currentOrderQuery = useQuery<Order | null>({
    queryKey: ['customer', 'currentOrder'],
    queryFn: getCurrentCustomerOrder,
    enabled: Boolean(user) && !activeOrder,
    refetchInterval: false,
  })

  useEffect(() => {
    // React Query v5: side-effects on success are done via useEffect
    if (currentOrderQuery.data === undefined) return

    if (currentOrderQuery.data) {
      setActiveOrder(currentOrderQuery.data)
      return
    }

    if (currentOrderQuery.data === null) {
      if (activeOrder?.status === 'finished') return
      setActiveOrder(null)
    }
  }, [activeOrder?.status, currentOrderQuery.data, setActiveOrder])

  type YMapsMapLike = {
    geoObjects: { add: (obj: unknown) => void; remove: (obj: unknown) => void }
    events: { add: (event: string, cb: (e: unknown) => void) => void }
    destroy: () => void
  }

  type YMapsLike = {
    Map: new (
      el: HTMLElement,
      state: { center: [number, number]; zoom: number; controls: unknown[] },
      options: { suppressMapOpenBlock: boolean }
    ) => YMapsMapLike
    Placemark: new (
      coords: Coords,
      props: { iconCaption: string },
      options: { preset: string }
    ) => unknown
    multiRouter: {
      MultiRoute: new (
        model: { referencePoints: Coords[]; params: Record<string, unknown> },
        options: Record<string, unknown>
      ) => {
        getActiveRoute: () => {
          properties: { get: (k: string) => { text?: string; value?: number } | undefined }
        } | null
        events: { add: (event: string, cb: () => void) => void }
        model: { events: { add: (event: string, cb: () => void) => void } }
      }
    }
  }

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YMapsMapLike | null>(null)
  const ymapsRef = useRef<YMapsLike | null>(null)
  const pointAPlacemarkRef = useRef<unknown | null>(null)
  const pointBPlacemarkRef = useRef<unknown | null>(null)
  const customerPlacemarkRef = useRef<unknown | null>(null)
  const geoWatchIdRef = useRef<number | null>(null)
  const activePointRef = useRef<ActivePoint>('A')
  const multiRouteRef = useRef<unknown | null>(null)

  useEffect(() => {
    activePointRef.current = activePoint
  }, [activePoint])

  useEffect(() => {
    let isCancelled = false

    async function init() {
      try {
        const ymaps = (await loadYmaps()) as unknown as YMapsLike
        ymapsRef.current = ymaps

        if (isCancelled) return
        if (!mapContainerRef.current) return

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

        map.events.add('click', async (e) => {
          const coords = (e as { get?: (k: string) => unknown })?.get?.('coords') as Coords

          setSuccessMessage(null)

          const point = activePointRef.current
          if (point === 'A') {
            setPointACoords(coords)
          } else {
            setPointBCoords(coords)
          }

          try {
            const address = await reverseGeocodeToAddress(coords)
            if (point === 'A') {
              setFromAddress(address)
            } else {
              setToAddress(address)
            }
          } catch {
            // игнорируем ошибки reverse-geocode, чтобы клик по карте всегда работал
          }
        })
      } catch (e) {
        if (isCancelled) return
        setError(e instanceof Error ? e.message : 'Unknown error')
      }
    }

    init()

    return () => {
      isCancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }

      if (geoWatchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current)
        geoWatchIdRef.current = null
      }

      ymapsRef.current = null
      pointAPlacemarkRef.current = null
      pointBPlacemarkRef.current = null
      customerPlacemarkRef.current = null
      multiRouteRef.current = null
    }
  }, [setError, setFromAddress, setPointACoords, setPointBCoords, setSuccessMessage, setToAddress])

  useEffect(() => {
    if (!mapReady) return
    if (!('geolocation' in navigator)) return

    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    if (geoWatchIdRef.current !== null) return

    geoWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

        const coords: Coords = [lat, lon]

        if (!customerPlacemarkRef.current) {
          customerPlacemarkRef.current = new ymaps.Placemark(
            coords,
            { iconCaption: 'Вы' },
            { preset: 'islands#violetCircleDotIcon' }
          )
          map.geoObjects.add(customerPlacemarkRef.current)
          ;(map as unknown as { setCenter?: (c: Coords, z?: number) => void }).setCenter?.(coords, 14)
        } else {
          ;(
            customerPlacemarkRef.current as {
              geometry: { setCoordinates: (c: Coords) => void }
            }
          ).geometry.setCoordinates(coords)
        }
      },
      () => {
        // ignore
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000,
      }
    )

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current)
        geoWatchIdRef.current = null
      }
    }
  }, [mapReady])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    if (!pointACoords) {
      if (pointAPlacemarkRef.current) {
        map.geoObjects.remove(pointAPlacemarkRef.current)
        pointAPlacemarkRef.current = null
      }
      return
    }

    if (!pointAPlacemarkRef.current) {
      pointAPlacemarkRef.current = new ymaps.Placemark(
        pointACoords,
        { iconCaption: 'A' },
        { preset: 'islands#blueStretchyIcon' }
      )
      map.geoObjects.add(pointAPlacemarkRef.current)
    } else {
      ;(
        pointAPlacemarkRef.current as {
          geometry: { setCoordinates: (c: Coords) => void }
        }
      ).geometry.setCoordinates(pointACoords)
    }
  }, [mapReady, pointACoords])

  useEffect(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return

    if (!pointBCoords) {
      if (pointBPlacemarkRef.current) {
        map.geoObjects.remove(pointBPlacemarkRef.current)
        pointBPlacemarkRef.current = null
      }
      return
    }

    if (!pointBPlacemarkRef.current) {
      pointBPlacemarkRef.current = new ymaps.Placemark(
        pointBCoords,
        { iconCaption: 'B' },
        { preset: 'islands#redStretchyIcon' }
      )
      map.geoObjects.add(pointBPlacemarkRef.current)
    } else {
      ;(
        pointBPlacemarkRef.current as {
          geometry: { setCoordinates: (c: Coords) => void }
        }
      ).geometry.setCoordinates(pointBCoords)
    }
  }, [mapReady, pointBCoords])

  useEffect(() => {
    const map = mapRef.current

    if (map && multiRouteRef.current) {
      map.geoObjects.remove(multiRouteRef.current)
      multiRouteRef.current = null
    }
  }, [mapReady, pointACoords, pointBCoords])

  const buildRoute = useCallback(() => {
    const map = mapRef.current
    const ymaps = ymapsRef.current
    if (!map || !ymaps) return
    if (!pointACoords || !pointBCoords) return

    const { key: routeKey, routeInfo: cachedRouteInfo } = getCachedRouteInfo(
      pointACoords,
      pointBCoords
    )
    setError(null)
    setSuccessMessage(null)

    if (cachedRouteInfo) {
      // We already know distance/duration, but we still need to draw the route line on the map.
      setIsRouteLoading(false)
      setRouteInfo(cachedRouteInfo)
    } else {
      setIsRouteLoading(true)
      setRouteInfo(null)
    }

    if (multiRouteRef.current) {
      map.geoObjects.remove(multiRouteRef.current)
      multiRouteRef.current = null
    }

    const multiRoute = new ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [pointACoords, pointBCoords],
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

    const onUpdate = () => {
      const activeRoute = multiRoute.getActiveRoute()
      if (!activeRoute) return

      const distance = activeRoute.properties.get('distance')
      const duration = activeRoute.properties.get('duration')

      const distanceText = distance?.text
      const durationText = duration?.text
      const distanceMeters = distance?.value
      const durationSeconds = duration?.value

      if (
        typeof distanceText === 'string' &&
        typeof durationText === 'string' &&
        typeof distanceMeters === 'number' &&
        typeof durationSeconds === 'number'
      ) {
        const nextRouteInfo: RouteInfo = {
          distanceText,
          durationText,
          distanceMeters,
          durationSeconds,
        }

        setRouteInfo(nextRouteInfo)
        setIsRouteLoading(false)

        setCachedRouteInfo(routeKey, nextRouteInfo)
      }
    }

    const onError = () => {
      setIsRouteLoading(false)
      setError('Не удалось построить маршрут')
    }

    multiRoute.events.add('update', onUpdate)
    multiRoute.model.events.add('requestsuccess', onUpdate)
    multiRoute.model.events.add('requestfail', onError)
  }, [pointACoords, pointBCoords, setError, setIsRouteLoading, setRouteInfo, setSuccessMessage])

  useEffect(() => {
    if (!pointACoords || !pointBCoords) return
    if (!mapReady) return
    buildRoute()
  }, [mapReady, pointACoords, pointBCoords, buildRoute])

  useEffect(() => {
    if (!routeBuildRequestId) return
    if (!mapReady) return
    buildRoute()
  }, [mapReady, routeBuildRequestId, buildRoute])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {activeOrder ? <CustomerOrderTracker /> : <OrderPanelForm />}
    </div>
  )
}
