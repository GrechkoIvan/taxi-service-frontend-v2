type FormErrorProps = {
  id?: string
  message?: string
}

export function FormError({ id, message }: FormErrorProps) {
  if (!message) {
    return null
  }

  return (
    <p id={id} className="mt-1 text-sm text-danger">
      {message}
    </p>
  )
}
