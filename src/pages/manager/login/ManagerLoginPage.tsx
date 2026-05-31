import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AuthLayout } from '../../auth/AuthLayout'
import {
  managerLoginSchema,
  type ManagerLoginForm as ManagerLoginFormValues
} from '../../../shared/lib/schemas/authSchemas'
import { managerLogin } from '../../../shared/api/services/managerAuthService'
import { useManagerAuthStore } from '../../../shared/lib/stores/managerAuthStore'
import { FormInput } from '../../../shared/ui/form/FormInput'
import { FormSubmitButton } from '../../../shared/ui/form/FormSubmitButton'
import { FormError } from '../../../shared/ui/form/FormError'

export function ManagerLoginPage() {
  const navigate = useNavigate()
  const loginToStore = useManagerAuthStore((s) => s.login)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ManagerLoginFormValues>({
    resolver: zodResolver(managerLoginSchema),
    defaultValues: {
      login: '',
      password: ''
    }
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: managerLogin
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      const res = await mutateAsync(values)
      loginToStore(res.manager)
      navigate('/manager/applications')
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : 'Не удалось войти. Попробуйте ещё раз.'
      )
    }
  })

  return (
    <AuthLayout title="Вход для менеджера">
      <p className="mb-6 text-sm text-gray-600">
        Войдите, чтобы рассматривать заявки водителей.
      </p>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormError message={serverError ?? undefined} />

        <FormInput
          label="Логин"
          type="text"
          autoComplete="username"
          error={errors.login?.message}
          {...register('login')}
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
    </AuthLayout>
  )
}
