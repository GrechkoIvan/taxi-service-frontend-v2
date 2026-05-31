import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
  customerRegistrationSchema,
  type CustomerRegistrationForm as CustomerRegistrationFormValues
} from '../../../../shared/lib/schemas/authSchemas'
import {
  buildBelarusFullPhone,
  formatBelarusPhoneLocal,
  getBelarusLocalPhone
} from '../../../../shared/lib/formatters/formatBelarusPhoneLocal'
import { FormInput } from '../../../../shared/ui/form/FormInput'
import { FormPhoneInputBy } from '../../../../shared/ui/form/FormPhoneInputBy'
import { FormSubmitButton } from '../../../../shared/ui/form/FormSubmitButton'
import { FormError } from '../../../../shared/ui/form/FormError'
import { registerCustomer } from '../../../../shared/api/services/authService'
import { useAuthStore } from '../../../../shared/lib/stores/authStore'

export function CustomerRegistrationForm() {
  const navigate = useNavigate()
  const { login: loginToStore } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<CustomerRegistrationFormValues>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: ''
    }
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: registerCustomer
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)

    try {
      const res = await mutateAsync({
        email: values.email,
        password: values.password,
        name: values.name,
        phone: values.phone
      })
      loginToStore(res.user)
      navigate('/')
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : 'Не удалось зарегистрироваться. Попробуйте ещё раз.'
      )
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <FormInput
        label="Повторите пароль"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <FormInput
        label="Имя"
        type="text"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />

      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <FormPhoneInputBy
            label="Телефон"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(29) 123-45-67"
            error={errors.phone?.message}
            name={field.name}
            value={getBelarusLocalPhone(field.value)}
            onBlur={field.onBlur}
            onChange={(e) => {
              const local = formatBelarusPhoneLocal(e.target.value)
              field.onChange(buildBelarusFullPhone(local))
            }}
            ref={field.ref}
          />
        )}
      />

      <FormSubmitButton loading={isPending}>Зарегистрироваться</FormSubmitButton>
    </form>
  )
}
