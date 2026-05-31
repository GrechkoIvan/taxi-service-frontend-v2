import { Link } from 'react-router-dom'
import { LoginForm } from '../../../features/auth/login/LoginForm'
import { AuthLayout } from '../AuthLayout'

export function DriverLoginPage() {
  return (
    <AuthLayout title="Вход для водителя">
      <p className="mb-6 text-sm text-gray-600">
        Войдите в аккаунт водителя, чтобы выйти на линию.
      </p>
      <LoginForm role="driver" />
      <p className="mt-6 text-center text-sm text-gray-600">
        Хотите стать водителем?{' '}
        <Link
          to="/driver/register"
          className="font-medium text-primary hover:underline"
        >
          Подать заявку
        </Link>
      </p>
    </AuthLayout>
  )
}
