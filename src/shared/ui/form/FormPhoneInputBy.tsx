import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { FormError } from './FormError'

type FormPhoneInputByProps = {
  label: string
  error?: string
  helperText?: string
  prefix?: string
} & InputHTMLAttributes<HTMLInputElement>

export const FormPhoneInputBy = forwardRef<HTMLInputElement, FormPhoneInputByProps>(
  ({
    id,
    label,
    error,
    helperText,
    prefix = '+375',
    className = '',
    ...rest
  }, ref) => {
    const fieldId = id ?? (typeof rest.name === 'string' ? rest.name : undefined)
    const errorId = error && fieldId ? `${fieldId}-error` : undefined
    const helperId = helperText && fieldId ? `${fieldId}-helper` : undefined

    return (
      <div className="space-y-2">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>

        <div
          className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition focus-within:ring-2 focus-within:ring-primary focus-within:border-primary ${
            error
              ? 'border-danger focus-within:ring-danger'
              : 'border-gray-200'
          }`}
        >
          <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 text-base text-gray-700">
            {prefix}
          </div>
          <input
            id={fieldId}
            ref={ref}
            aria-invalid={Boolean(error)}
            aria-describedby={
              [helperId, errorId].filter(Boolean).join(' ') || undefined
            }
            className={`min-w-0 flex-1 px-4 py-3 text-base transition focus-visible:outline-none ${className}`}
            {...rest}
          />
        </div>

        {helperText && !error && (
          <p id={helperId} className="text-sm text-gray-500">
            {helperText}
          </p>
        )}

        <FormError id={errorId} message={error} />
      </div>
    )
  }
)

FormPhoneInputBy.displayName = 'FormPhoneInputBy'
