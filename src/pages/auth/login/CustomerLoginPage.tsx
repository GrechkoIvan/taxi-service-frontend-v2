import { Link } from 'react-router-dom'
import { LoginForm } from '../../../features/auth/login/LoginForm'
import { AuthLayout } from '../AuthLayout'

export function CustomerLoginPage() {
  return (
    <AuthLayout title="Вход для клиента">
      <p className="mb-6 text-sm text-gray-600">
        Войдите в аккаунт, чтобы заказать поездку.
      </p>
      <LoginForm role="customer" />
      <p className="mt-6 text-center text-sm text-gray-600">
        Нет аккаунта?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </AuthLayout>
  )
}
