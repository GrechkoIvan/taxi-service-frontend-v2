export const USER_ROLES = {
  CUSTOMER: 'customer',
  DRIVER: 'driver'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]
