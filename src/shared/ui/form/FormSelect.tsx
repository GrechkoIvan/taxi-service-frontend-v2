import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { FormError } from './FormError'

type Option = {
  value: string
  label: string
  disabled?: boolean
}

type FormSelectProps = {
  label: string
  options: Option[]
  placeholder?: string
  error?: string
} & SelectHTMLAttributes<HTMLSelectElement>

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ id, label, options, placeholder, error, className = '', ...rest }, ref) => {
    const fieldId = id ?? (typeof rest.name === 'string' ? rest.name : undefined)
    const errorId = error && fieldId ? `${fieldId}-error` : undefined

    return (
      <div className="space-y-2">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <div className="relative">
          <select
            id={fieldId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId}
            className={`w-full appearance-none rounded-xl border bg-white px-4 py-3 text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary ${
              error ? 'border-danger focus-visible:ring-danger' : 'border-gray-200'
            } ${className}`}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={`${rest.name}-${option.value}`}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">
            ▾
          </span>
        </div>
        <FormError id={errorId} message={error} />
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'
