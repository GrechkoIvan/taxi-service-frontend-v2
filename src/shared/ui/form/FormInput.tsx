import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'
import { FormError } from './FormError'

type FormInputProps = {
  label: string
  error?: string
  helperText?: string
} & InputHTMLAttributes<HTMLInputElement>

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ id, label, error, helperText, className = '', ...rest }, ref) => {
    const fieldId = id ?? (typeof rest.name === 'string' ? rest.name : undefined)
    const errorId = error && fieldId ? `${fieldId}-error` : undefined
    const helperId =
      helperText && fieldId ? `${fieldId}-helper` : undefined

    return (
      <div className="space-y-2">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        <input
          id={fieldId}
          ref={ref}
          aria-invalid={Boolean(error)}
          aria-describedby={
            [helperId, errorId].filter(Boolean).join(' ') || undefined
          }
          className={`w-full rounded-xl border px-4 py-3 text-base transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary ${
            error ? 'border-danger focus-visible:ring-danger' : 'border-gray-200'
          } ${className}`}
          {...rest}
        />
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

FormInput.displayName = 'FormInput'
