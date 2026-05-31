import type { ButtonHTMLAttributes } from 'react'

type FormSubmitButtonProps = {
  loading?: boolean
  fullWidth?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>

export function FormSubmitButton({
  loading,
  fullWidth = true,
  className = '',
  children,
  ...rest
}: FormSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || rest.disabled}
      className={`inline-flex items-center justify-center rounded-xl border border-transparent bg-primary px-6 py-3 text-base font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-primary/60 ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {loading && (
        <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent" />
      )}
      {children}
    </button>
  )
}
