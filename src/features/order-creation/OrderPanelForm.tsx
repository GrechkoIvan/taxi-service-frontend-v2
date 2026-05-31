import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrderComfortType } from '../../shared/api/types/orderTypes'
import { createOrder } from '../../shared/api/services/orderService'
import {
  orderPanelSchema,
  type OrderPanelForm as OrderPanelFormValues,
} from '../../shared/lib/schemas/orderSchemas'
import { calculatePriceByN } from '../../shared/lib/calculatePriceByN'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import {
  canCreateOrder,
  useOrderCreationStore,
} from '../../shared/lib/stores/orderCreationStore'
import { geocodeToCoords, suggestAddress } from '../../shared/lib/ymaps/ymapsServices'
import { FormError } from '../../shared/ui/form/FormError'
import { FormInput } from '../../shared/ui/form/FormInput'

type SuggestField = 'fromAddress' | 'toAddress'

export function OrderPanelForm() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const error = useOrderCreationStore((s) => s.error)
  const successMessage = useOrderCreationStore((s) => s.successMessage)
  const activePoint = useOrderCreationStore((s) => s.activePoint)
  const fromAddressFromStore = useOrderCreationStore((s) => s.fromAddress)
  const toAddressFromStore = useOrderCreationStore((s) => s.toAddress)
  const pointACoords = useOrderCreationStore((s) => s.pointACoords)
  const pointBCoords = useOrderCreationStore((s) => s.pointBCoords)
  const routeInfo = useOrderCreationStore((s) => s.routeInfo)

  const setActivePoint = useOrderCreationStore((s) => s.setActivePoint)
  const setFromAddress = useOrderCreationStore((s) => s.setFromAddress)
  const setToAddress = useOrderCreationStore((s) => s.setToAddress)
  const setPointACoords = useOrderCreationStore((s) => s.setPointACoords)
  const setPointBCoords = useOrderCreationStore((s) => s.setPointBCoords)
  const setActiveOrder = useOrderCreationStore((s) => s.setActiveOrder)
  const resetMessages = useOrderCreationStore((s) => s.resetMessages)
  const setError = useOrderCreationStore((s) => s.setError)
  const setSuccessMessage = useOrderCreationStore((s) => s.setSuccessMessage)

  const defaultValues = useMemo<OrderPanelFormValues>(
    () => ({
      comfortType: 'economy',
      fromAddress: fromAddressFromStore ?? '',
      toAddress: toAddressFromStore ?? '',
    }),
    [fromAddressFromStore, toAddressFromStore]
  )

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderPanelFormValues>({
    resolver: zodResolver(orderPanelSchema),
    defaultValues,
  })

  const [fromSuggestions, setFromSuggestions] = useState<string[]>([])
  const [toSuggestions, setToSuggestions] = useState<string[]>([])
  const [isSuggestingFrom, setIsSuggestingFrom] = useState(false)
  const [isSuggestingTo, setIsSuggestingTo] = useState(false)
  const [openSuggestField, setOpenSuggestField] = useState<SuggestField | null>(null)

  const fromRequestIdRef = useRef(0)
  const toRequestIdRef = useRef(0)

  const confirmedFromAddressRef = useRef<string>('')
  const confirmedToAddressRef = useRef<string>('')

  useEffect(() => {
    const current = (getValues('fromAddress') ?? '').trim()
    const next = (fromAddressFromStore ?? '').trim()
    if (next && next !== current) {
      confirmedFromAddressRef.current = next
      setValue('fromAddress', next, { shouldDirty: true, shouldTouch: true })
    }
  }, [fromAddressFromStore, getValues, setValue])

  useEffect(() => {
    const current = (getValues('toAddress') ?? '').trim()
    const next = (toAddressFromStore ?? '').trim()
    if (next && next !== current) {
      confirmedToAddressRef.current = next
      setValue('toAddress', next, { shouldDirty: true, shouldTouch: true })
    }
  }, [toAddressFromStore, getValues, setValue])

  const fromAddress = watch('fromAddress') ?? ''
  const toAddress = watch('toAddress') ?? ''

  const fromAddressField = register('fromAddress')
  const toAddressField = register('toAddress')

  useEffect(() => {
    const query = (fromAddress ?? '').trim()
    if (query.length < 3) {
      setFromSuggestions([])
      setIsSuggestingFrom(false)
      return
    }

    setIsSuggestingFrom(true)

    const requestId = ++fromRequestIdRef.current
    const t = window.setTimeout(async () => {
      try {
        const items = await suggestAddress(query)
        if (fromRequestIdRef.current !== requestId) return
        setFromSuggestions(items)
      } catch {
        if (fromRequestIdRef.current !== requestId) return
        setFromSuggestions([])
      } finally {
        if (fromRequestIdRef.current === requestId) {
          setIsSuggestingFrom(false)
        }
      }
    }, 1000)

    return () => {
      window.clearTimeout(t)
    }
  }, [fromAddress])

  useEffect(() => {
    const query = (toAddress ?? '').trim()
    if (query.length < 3) {
      setToSuggestions([])
      setIsSuggestingTo(false)
      return
    }

    setIsSuggestingTo(true)

    const requestId = ++toRequestIdRef.current
    const t = window.setTimeout(async () => {
      try {
        const items = await suggestAddress(query)
        if (toRequestIdRef.current !== requestId) return
        setToSuggestions(items)
      } catch {
        if (toRequestIdRef.current !== requestId) return
        setToSuggestions([])
      } finally {
        if (toRequestIdRef.current === requestId) {
          setIsSuggestingTo(false)
        }
      }
    }, 1000)

    return () => {
      window.clearTimeout(t)
    }
  }, [toAddress])

  const comfortType = watch('comfortType') as OrderComfortType

  const priceByN = routeInfo ? calculatePriceByN(routeInfo.distanceMeters, comfortType) : null
  const canCreateOrderNow = Boolean(user) && canCreateOrder({ pointACoords, pointBCoords, routeInfo })

  const { mutateAsync, isPending: isOrderCreating } = useMutation({
    mutationFn: createOrder,
  })

  const submit = handleSubmit(async (values) => {
    resetMessages()

    if (isOrderCreating) return

    if (!user) {
      setError('Нужно войти в аккаунт')
      return
    }
    if (!pointACoords || !pointBCoords || !routeInfo) {
      setError('Сначала выбери точки и рассчитай маршрут')
      return
    }

    try {
      const nextPriceByN = calculatePriceByN(routeInfo.distanceMeters, values.comfortType)

      const createdOrder = await mutateAsync({
        customerId: user.id,
        fromAddress: values.fromAddress?.trim() || undefined,
        toAddress: values.toAddress?.trim() || undefined,
        fromCoords: pointACoords,
        toCoords: pointBCoords,
        comfortType: values.comfortType,
        distanceMeters: routeInfo.distanceMeters,
        durationSeconds: routeInfo.durationSeconds,
        priceByN: nextPriceByN,
        status: 'searching_driver',
        createdAt: new Date().toISOString(),
      })

      setActiveOrder(createdOrder)
      queryClient.setQueryData(['customer', 'currentOrder'], createdOrder)
      void queryClient.invalidateQueries({ queryKey: ['customer', 'currentOrder'] })

      setSuccessMessage(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания заказа')
    }
  })

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[420px] bg-white/95 backdrop-blur rounded-lg border border-gray-200 p-4 shadow">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Заказ такси</h2>
      </div>

      <form onSubmit={submit} className="mt-3 space-y-3">
        <FormError message={error ?? undefined} />

        <div>
          <FormInput
            label="Откуда"
            type="text"
            autoComplete="off"
            placeholder="Например: Минск, пр-т Независимости 10"
            error={errors.fromAddress?.message}
            {...fromAddressField}
            onChange={(e) => {
              fromAddressField.onChange(e)
              setFromAddress(e.target.value)
              resetMessages()
            }}
            onFocus={() => setOpenSuggestField('fromAddress')}
            onBlur={(e) => {
              fromAddressField.onBlur(e)
              setOpenSuggestField(null)

              const current = (getValues('fromAddress') ?? '').trim()
              const confirmed = (confirmedFromAddressRef.current ?? '').trim()

              if (!current || current !== confirmed) {
                confirmedFromAddressRef.current = ''
                setValue('fromAddress', '', { shouldDirty: true, shouldTouch: true })
              }
            }}
          />

          {openSuggestField === 'fromAddress' ? (
            <div className="mt-2">
              {isSuggestingFrom ? (
                <div className="text-xs text-gray-500">Подсказки...</div>
              ) : null}

              {!isSuggestingFrom && fromSuggestions.length ? (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {fromSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        confirmedFromAddressRef.current = s
                        setValue('fromAddress', s, { shouldDirty: true, shouldTouch: true })
                        setFromAddress(s)
                        setOpenSuggestField(null)

                        resetMessages()

                        geocodeToCoords(s)
                          .then((coords) => {
                            setPointACoords(coords)
                            setActivePoint('A')
                          })
                          .catch(() => {
                            setError('Не удалось найти адрес на карте')
                          })
                      }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setActivePoint('A')}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                activePoint === 'A'
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              Указать на карте
            </button>
          </div>
        </div>

        <div>
          <FormInput
            label="Куда"
            type="text"
            autoComplete="off"
            placeholder="Например: Минск, ул. Немига 5"
            error={errors.toAddress?.message}
            {...toAddressField}
            onChange={(e) => {
              toAddressField.onChange(e)
              setToAddress(e.target.value)
              resetMessages()
            }}
            onFocus={() => setOpenSuggestField('toAddress')}
            onBlur={(e) => {
              toAddressField.onBlur(e)
              setOpenSuggestField(null)

              const current = (getValues('toAddress') ?? '').trim()
              const confirmed = (confirmedToAddressRef.current ?? '').trim()

              if (!current || current !== confirmed) {
                confirmedToAddressRef.current = ''
                setValue('toAddress', '', { shouldDirty: true, shouldTouch: true })
              }
            }}
          />

          {openSuggestField === 'toAddress' ? (
            <div className="mt-2">
              {isSuggestingTo ? (
                <div className="text-xs text-gray-500">Подсказки...</div>
              ) : null}

              {!isSuggestingTo && toSuggestions.length ? (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  {toSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        confirmedToAddressRef.current = s
                        setValue('toAddress', s, { shouldDirty: true, shouldTouch: true })
                        setToAddress(s)
                        setOpenSuggestField(null)

                        resetMessages()

                        geocodeToCoords(s)
                          .then((coords) => {
                            setPointBCoords(coords)
                            setActivePoint('B')
                          })
                          .catch(() => {
                            setError('Не удалось найти адрес на карте')
                          })
                      }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-2 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setActivePoint('B')}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                activePoint === 'B'
                  ? 'border-red-600 bg-red-50 text-red-800'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              Указать на карте
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-700">Тип комфорта</label>
          <select
            className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
            {...register('comfortType')}
          >
            <option value="economy">Эконом</option>
            <option value="comfort">Комфорт</option>
            <option value="business">Бизнес</option>
          </select>
          <FormError message={errors.comfortType?.message} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-gray-500">Длина</div>
              <div className="text-sm font-semibold text-gray-900">
                {routeInfo ? routeInfo.distanceText : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">Время</div>
              <div className="text-sm font-semibold text-gray-900">
                {routeInfo ? routeInfo.durationText : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">Стоимость</div>
              <div className="text-sm font-semibold text-gray-900">
                {priceByN !== null ? `${priceByN} BYN` : '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="submit"
            disabled={!canCreateOrderNow || isOrderCreating}
            className={`px-3 py-2 rounded border text-sm ${
              !canCreateOrderNow || isOrderCreating
                ? 'bg-gray-200 text-gray-500 border-gray-200'
                : 'bg-green-600 text-white border-green-600'
            }`}
          >
            {isOrderCreating ? 'Создаю...' : 'Создать заказ'}
          </button>
        </div>

        {!user ? (
          <p className="text-sm text-gray-600">Чтобы создать заказ, нужно войти в аккаунт.</p>
        ) : null}

        {successMessage ? (
          <p className="text-sm text-green-700">{successMessage}</p>
        ) : null}
      </form>
    </div>
  )
}
