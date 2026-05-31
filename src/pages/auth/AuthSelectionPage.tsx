import { Link } from 'react-router-dom'

export function AuthSelectionPage() {
  return (
    <div className="container py-12">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6 text-gray-900">
          Добро пожаловать в Taxi Service
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Сервис для заказа такси для клиентов и водителей
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link to="/login" className="btn btn-primary px-6 py-3 text-lg">
            Войти как клиент
          </Link>
          <Link to="/driver/login" className="btn btn-outline px-6 py-3 text-lg">
            Войти как водитель
          </Link>
        </div>
      </div>
    </div>
  )
}
