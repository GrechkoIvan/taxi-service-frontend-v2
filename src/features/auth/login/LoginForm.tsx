import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { UserRole } from '../../../shared/api/types/authTypes'
import { login } from '../../../shared/api/services/authService'
import { useAuthStore } from '../../../shared/lib/stores/authStore'
import {
  loginSchema,
  type LoginForm as LoginFormValues
} from '../../../shared/lib/schemas/authSchemas'
import { FormInput } from '../../../shared/ui/form/FormInput'
import { FormSubmitButton } from '../../../shared/ui/form/FormSubmitButton'
import { FormError } from '../../../shared/ui/form/FormError'

type LoginFormProps = {
  role: UserRole
}

export function LoginForm({ role }: LoginFormProps) {
  const navigate = useNavigate()
  const { login: loginToStore } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const loginFieldsSchema = loginSchema.omit({ role: true })
  type LoginFormFields = Omit<LoginFormValues, 'role'>

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormFields>({
    resolver: zodResolver(loginFieldsSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: login
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      const res = await mutateAsync({
        email: values.email,
        password: values.password,
        role
      })
      loginToStore(res.user)
      navigate('/')
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message)
      } else {
        setServerError('Не удалось войти. Попробуйте ещё раз.')
      }
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={serverError ?? undefined} />
      <FormInput
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <FormInput
        label="Пароль"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <FormSubmitButton loading={isPending}>Войти</FormSubmitButton>
    </form>
  )
}
