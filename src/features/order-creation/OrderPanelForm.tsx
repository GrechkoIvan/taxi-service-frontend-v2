import { useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Clock, Ruler } from 'lucide-react'
import type { OrderComfortType } from '../../shared/api/types/orderTypes'
import { createOrder } from '../../shared/api/services/orderService'
import {
  orderPanelSchema,
  type OrderPanelForm as OrderPanelFormValues,
} from '../../shared/lib/schemas/orderSchemas'
import { calculatePriceByN } from '../../shared/lib/calculatePriceByN'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { useOrderCreationStore } from '../../shared/lib/stores/orderCreationStore'
import { FormError } from '../../shared/ui/form/FormError'
import {
  AddressFieldCard,
  type SuggestField,
} from './components/AddressFieldCard'
import { StepPanelBody, StepPanelCard, StepPanelHeader } from './components/StepPanel'

const comfortOptions: {
  value: OrderComfortType
  title: string
  subtitle: string
  accent: string
  description: string
}[] = [
  {
    value: 'economy',
    title: 'Эконом',
    subtitle: 'Быстрый и выгодный',
    accent: 'text-emerald-600',
    description: 'Для коротких поездок',
  },
  {
    value: 'comfort',
    title: 'Комфорт',
    subtitle: 'Баланс цены и удобства',
    accent: 'text-blue-600',
    description: 'Повышенное качество',
  },
  {
    value: 'business',
    title: 'Бизнес',
    subtitle: 'Премиум подача',
    accent: 'text-amber-600',
    description: 'Для деловых встреч',
  },
]

export function OrderPanelForm() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const error = useOrderCreationStore((s) => s.error)
  const successMessage = useOrderCreationStore((s) => s.successMessage)
  const fromAddressFromStore = useOrderCreationStore((s) => s.fromAddress)
  const toAddressFromStore = useOrderCreationStore((s) => s.toAddress)
  const pointACoords = useOrderCreationStore((s) => s.pointACoords)
  const pointBCoords = useOrderCreationStore((s) => s.pointBCoords)
  const routeInfo = useOrderCreationStore((s) => s.routeInfo)

  const setActivePoint = useOrderCreationStore((s) => s.setActivePoint)
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

  const formMethods = useForm<OrderPanelFormValues>({
    resolver: zodResolver(orderPanelSchema),
    defaultValues,
  })

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = formMethods

  const [openSuggestField, setOpenSuggestField] = useState<SuggestField | null>(null)

  const comfortType = watch('comfortType') as OrderComfortType

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
      setActivePoint(null)
      queryClient.setQueryData(['customer', 'currentOrder'], createdOrder)
      void queryClient.invalidateQueries({ queryKey: ['customer', 'currentOrder'] })

      setSuccessMessage(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка создания заказа')
    }
  })

  return (
    <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[460px] pointer-events-auto">
      <StepPanelCard>
        <StepPanelHeader
          stepBadge="Шаг 1 · Маршрут"
          statusText={routeInfo ? 'Маршрут рассчитан' : 'Выберите точки'}
          title="Укажите подачу и пункт назначения — стоимость обновится."
        />

        <FormProvider {...formMethods}>
          <StepPanelBody>
            <form onSubmit={submit} className="space-y-6">
              {error ? (
                <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Не получилось оформить заказ</p>
                    <p>{error}</p>
                  </div>
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
                  {successMessage}
                </div>
              ) : null}

              <div className="space-y-6">
                <AddressFieldCard
                  point="A"
                  label="Откуда (A)"
                  placeholder="Минск, пр-т Независимости 10"
                  accent={{
                    label: 'text-emerald-600',
                    dot: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]',
                    buttonActive: 'border-emerald-200 bg-emerald-100 text-emerald-700',
                    buttonIdle: 'border-emerald-200 text-emerald-600 hover:bg-emerald-50',
                    compass: 'text-emerald-500',
                    dropdownOffset: { left: 48, right: 32 },
                  }}
                  openSuggestField={openSuggestField}
                  setOpenSuggestField={setOpenSuggestField}
                />

                <AddressFieldCard
                  point="B"
                  label="Куда (B)"
                  placeholder="Минск, ул. Немига 5"
                  accent={{
                    label: 'text-rose-600',
                    dot: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]',
                    buttonActive: 'border-rose-200 bg-rose-100 text-rose-700',
                    buttonIdle: 'border-rose-200 text-rose-600 hover:bg-rose-50',
                    compass: 'text-rose-500',
                    dropdownOffset: { left: 48, right: 32 },
                  }}
                  openSuggestField={openSuggestField}
                  setOpenSuggestField={setOpenSuggestField}
                />
              </div>

            <div className="rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-2 shadow">
                    <Ruler className="h-5 w-5 text-gray-900" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Дистанция</p>
                    <p className="text-base font-semibold text-gray-900">
                      {routeInfo ? routeInfo.distanceText : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-2 shadow">
                    <Clock className="h-5 w-5 text-gray-900" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Время</p>
                    <p className="text-base font-semibold text-gray-900">
                      {routeInfo ? routeInfo.durationText : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <FormError message={errors.comfortType?.message} />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {comfortOptions.map((option) => {
                  const active = comfortType === option.value
                  const optionPrice =
                    routeInfo && routeInfo.distanceMeters
                      ? calculatePriceByN(routeInfo.distanceMeters, option.value)
                      : null

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setValue('comfortType', option.value, {
                          shouldDirty: true,
                          shouldTouch: true,
                        })
                      }
                      className={`text-left rounded-2xl border p-4 transition ${
                        active
                          ? 'border-gray-900 bg-gray-900 text-white shadow-xl shadow-gray-900/20'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-400'
                      }`}
                    >
                      <div
                        className={`text-xs font-semibold uppercase ${
                          active ? 'text-white/80' : option.accent
                        }`}
                      >
                        {option.title}
                      </div>
                      <div className="mt-1 text-sm font-semibold">{option.subtitle}</div>
                      <p className={`mt-2 text-xs ${active ? 'text-white/70' : 'text-gray-500'}`}>
                        {option.description}
                      </p>
                      <div className="mt-3 text-xl font-semibold">
                        {optionPrice !== null ? `${optionPrice} BYN` : '—'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

              <div className="space-y-3">
                {user ? (
                  <button
                    type="submit"
                    disabled={!pointACoords || !pointBCoords || !routeInfo || isOrderCreating}
                    className={`w-full rounded-2xl px-5 py-4 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 ${
                      !pointACoords || !pointBCoords || !routeInfo || isOrderCreating
                        ? 'border border-gray-200 bg-gray-100 text-gray-500'
                        : 'border border-transparent bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-900/30 hover:translate-y-0.5'
                    }`}
                  >
                    {isOrderCreating ? 'Создаю…' : 'Создать заказ'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full rounded-2xl border border-gray-900 bg-gray-900 px-5 py-4 text-base font-semibold text-white shadow-lg shadow-gray-900/30 transition hover:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
                  >
                    Войдите, чтобы оформить
                  </button>
                )}
              </div>
            </form>
          </StepPanelBody>
        </FormProvider>
      </StepPanelCard>
    </div>
  )
}
