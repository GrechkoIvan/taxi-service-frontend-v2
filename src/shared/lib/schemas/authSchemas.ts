import { z } from 'zod'
import { USER_ROLES } from '../constants/authConstants'

const belarusPhoneRegex =
  /^\+375\s?\((17|25|29|33|44)\)\s?\d{3}-\d{2}-\d{2}$/

const baseUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email({ message: 'Некорректный email' }),
    password: z
      .string()
      .min(6, { message: 'Пароль должен быть не менее 6 символов' })
      .max(64, { message: 'Пароль не должен превышать 64 символов' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'Повторите пароль' })
      .max(64, { message: 'Пароль не должен превышать 64 символов' }),
    name: z
      .string()
      .trim()
      .min(2, { message: 'Имя должно быть не менее 2 символов' }),
    phone: z
      .string()
      .trim()
      .regex(belarusPhoneRegex, {
        message:
          'Формат: +375 (29) 123-45-67, поддерживаются коды 17/25/29/33/44'
      })
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword']
  })
  .strict()

export const customerRegistrationSchema = baseUserSchema

export const driverApplicationSchema = baseUserSchema

const userRoleEnum = z.enum([USER_ROLES.CUSTOMER, USER_ROLES.DRIVER])

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email({ message: 'Некорректный email' }),
    password: z
      .string()
      .min(6, { message: 'Пароль должен быть не менее 6 символов' }),
    role: userRoleEnum
  })
  .strict()

export const managerLoginSchema = z
  .object({
    login: z
      .string()
      .trim()
      .min(2, { message: 'Логин должен быть не менее 2 символов' }),
    password: z
      .string()
      .min(6, { message: 'Пароль должен быть не менее 6 символов' })
  })
  .strict()

export type CustomerRegistrationForm = z.infer<
  typeof customerRegistrationSchema
>
export type DriverApplicationForm = z.infer<typeof driverApplicationSchema>
export type LoginForm = z.infer<typeof loginSchema>
export type ManagerLoginForm = z.infer<typeof managerLoginSchema>