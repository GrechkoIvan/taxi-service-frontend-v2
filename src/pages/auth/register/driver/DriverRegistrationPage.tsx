import { DriverApplicationForm } from '../../../../features/auth/register/driver/DriverApplicationForm'
import { AuthLayout } from '../../AuthLayout'

export function DriverRegistrationPage() {
  return (
    <AuthLayout title="Заявка на устройство водителем">
      <p className="mb-6 text-sm text-gray-600">
        Заполните данные, и мы рассмотрим вашу заявку.
      </p>
      <DriverApplicationForm />
    </AuthLayout>
  )
}
