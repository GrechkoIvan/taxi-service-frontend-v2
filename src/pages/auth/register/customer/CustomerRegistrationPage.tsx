import { CustomerRegistrationForm } from '../../../../features/auth/register/customer/CustomerRegistrationForm'
import { AuthLayout } from '../../AuthLayout'

export function CustomerRegistrationPage() {
  return (
    <AuthLayout title="Регистрация клиента">
      <p className="mb-6 text-sm text-gray-600">
        Создайте аккаунт, чтобы заказать поездку.
      </p>
      <CustomerRegistrationForm />
    </AuthLayout>
  )
}
