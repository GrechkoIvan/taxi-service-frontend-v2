import { useEffect, useMemo, useRef } from 'react'
import { useFormContext } from 'react-hook-form'
import { Compass, MapPin, Navigation } from 'lucide-react'

import type { ActivePoint } from '../../../shared/lib/stores/orderCreationStore'
import { useOrderCreationStore } from '../../../shared/lib/stores/orderCreationStore'
import type { OrderPanelForm } from '../../../shared/lib/schemas/orderSchemas'
import { geocodeToCoords } from '../../../shared/lib/ymaps/ymapsServices'
import { FormInput } from '../../../shared/ui/form/FormInput'
import { useAddressSuggestions } from '../hooks/useAddressSuggestions'

export type SuggestField = 'fromAddress' | 'toAddress'

const pointToAddressField: Record<ActivePoint, SuggestField> = {
  A: 'fromAddress',
  B: 'toAddress',
}

type AccentConfig = {
  label: string
  dot: string
  buttonActive: string
  buttonIdle: string
  compass: string
  dropdownOffset: {
    left: number
    right: number
  }
}

type AddressFieldCardProps = {
  point: ActivePoint
  label: string
  placeholder: string
  accent: AccentConfig
  openSuggestField: SuggestField | null
  setOpenSuggestField: (field: SuggestField | null) => void
}

export function AddressFieldCard({
  point,
  label,
  placeholder,
  accent,
  openSuggestField,
  setOpenSuggestField,
}: AddressFieldCardProps) {
  const fieldName = pointToAddressField[point]

  const {
    register,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<OrderPanelForm>()

  const { ref, onChange, onBlur, name, ...restField } = register(fieldName)
  const value = watch(fieldName) ?? ''

  const confirmedAddressRef = useRef<string>('')

  const activePoint = useOrderCreationStore((s) => s.activePoint)
  const setActivePoint = useOrderCreationStore((s) => s.setActivePoint)
  const setAddress = useOrderCreationStore((s) =>
    point === 'A' ? s.setFromAddress : s.setToAddress
  )
  const setPointCoords = useOrderCreationStore((s) =>
    point === 'A' ? s.setPointACoords : s.setPointBCoords
  )
  const setError = useOrderCreationStore((s) => s.setError)
  const resetMessages = useOrderCreationStore((s) => s.resetMessages)
  const storedAddress = useOrderCreationStore((s) =>
    point === 'A' ? s.fromAddress : s.toAddress
  )
  const hasActiveOrder = useOrderCreationStore((s) => Boolean(s.activeOrder))

  const { suggestions, isLoading } = useAddressSuggestions(value)

  const isSuggestDropdownOpen = openSuggestField === fieldName

  useEffect(() => {
    const current = (getValues(fieldName) ?? '').trim()
    const next = (storedAddress ?? '').trim()
    if (next && next !== current) {
      confirmedAddressRef.current = next
      setValue(fieldName, next, { shouldDirty: true, shouldTouch: true })
    }
  }, [fieldName, getValues, setValue, storedAddress])

  const handleSuggestionSelect = (address: string) => {
    confirmedAddressRef.current = address
    setValue(fieldName, address, { shouldDirty: true, shouldTouch: true })
    setAddress(address)
    setOpenSuggestField(null)
    resetMessages()

    geocodeToCoords(address)
      .then((coords) => {
        setPointCoords(coords)
        setActivePoint(point)
      })
      .catch(() => {
        setError('Не удалось найти адрес на карте')
      })
  }

  const { placeholderClasses, dropdownStyle } = useMemo(() => {
    return {
      placeholderClasses: accent.label,
      dropdownStyle: {
        left: `${accent.dropdownOffset.left}px`,
        right: `${accent.dropdownOffset.right}px`,
      },
    }
  }, [accent.dropdownOffset.left, accent.dropdownOffset.right, accent.label])

  return (
    <div className="relative pl-6">
      <span className={`absolute left-0 top-4 h-3 w-3 rounded-full ${accent.dot}`} />
      <div className="relative rounded-2xl border border-gray-200 bg-white/90 p-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
          <span className={`flex items-center gap-2 ${placeholderClasses}`}>
            <MapPin className="h-4 w-4" />
            {label}
          </span>
          <button
            type="button"
            disabled={hasActiveOrder}
            onClick={() => {
              if (hasActiveOrder) return
              setActivePoint(activePoint === point ? null : point)
            }}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
              activePoint === point ? accent.buttonActive : accent.buttonIdle
            }`}
          >
            <Navigation className="h-3.5 w-3.5" />
            На карте
          </button>
        </div>
        <div className="mt-2">
          <FormInput
            autoComplete="off"
            placeholder={placeholder}
            error={errors[fieldName]?.message}
            name={name}
            ref={ref}
            {...restField}
            onChange={(event) => {
              onChange(event)
              setAddress(event.target.value)
              resetMessages()
            }}
            onFocus={() => setOpenSuggestField(fieldName)}
            onBlur={(event) => {
              onBlur(event)
              setOpenSuggestField(null)

              const current = (getValues(fieldName) ?? '').trim()
              const confirmed = (confirmedAddressRef.current ?? '').trim()

              if (!current || current !== confirmed) {
                confirmedAddressRef.current = ''
                setValue(fieldName, '', { shouldDirty: true, shouldTouch: true })
              }
            }}
          />
        </div>

        {isSuggestDropdownOpen ? (
          <div
            className="absolute top-[calc(100%+8px)] z-30"
            style={dropdownStyle}
          >
            {isLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500 shadow-xl shadow-gray-900/10">
                Подгружаю подсказки…
              </div>
            ) : null}

            {!isLoading && suggestions.length ? (
              <div className="max-h-56 overflow-auto rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/15">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-gray-50"
                  >
                    <Compass className={`h-4 w-4 shrink-0 ${accent.compass}`} />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
