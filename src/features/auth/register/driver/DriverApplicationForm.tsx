import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
  driverApplicationSchema,
  type DriverApplicationForm as DriverApplicationFormValues
} from '../../../../shared/lib/schemas/authSchemas'
import { submitDriverApplication } from '../../../../shared/api/services/authService'
import {
  buildBelarusFullPhone,
  formatBelarusPhoneLocal,
  getBelarusLocalPhone
} from '../../../../shared/lib/formatters/formatBelarusPhoneLocal'
import { FormInput } from '../../../../shared/ui/form/FormInput'
import { FormPhoneInputBy } from '../../../../shared/ui/form/FormPhoneInputBy'
import { FormSubmitButton } from '../../../../shared/ui/form/FormSubmitButton'
import { FormError } from '../../../../shared/ui/form/FormError'

export function DriverApplicationForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const submitMutation = useMutation({
    mutationFn: submitDriverApplication
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DriverApplicationFormValues>({
    resolver: zodResolver(driverApplicationSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      phone: ''
    }
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    setSuccessMessage(null)

    try {
      await submitMutation.mutateAsync({
        email: values.email,
        password: values.password,
        name: values.name,
        phone: values.phone
      })
      setSuccessMessage(
        'Заявка отправлена. Мы проверим данные и после этого с вами свяжется менеджер.'
      )
      reset()
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Ошибка отправки заявки')
    }
  })

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError message={serverError ?? undefined} />
      {successMessage && (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMessage}
        </p>
      )}

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
        label="ФИО"
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

      <FormSubmitButton loading={submitMutation.isPending}>
        Отправить заявку
      </FormSubmitButton>
    </form>
  )
}
