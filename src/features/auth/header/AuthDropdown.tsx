import { Link } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { CarFront, ChevronDown, UserRound, LogIn } from 'lucide-react'

export function AuthDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className="h-full px-4 flex items-center gap-2 text-base font-medium text-gray-900 hover:bg-primary-light transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LogIn className="w-4 h-4 text-gray-800" strokeWidth={2.2} />
        Войти
        <ChevronDown className={`ml-2 w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          <div className="py-2">
            <Link
              to="/login"
              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <UserRound className="w-4 h-4 text-blue-600" strokeWidth={2.2} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Войти как клиент</div>
                <div className="text-xs text-gray-500">Заказывать поездки</div>
              </div>
            </Link>

            <Link
              to="/driver/login"
              className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CarFront className="w-4 h-4 text-green-600" strokeWidth={2.2} />
              </div>
              <div>
                <div className="font-medium text-gray-900">Войти как водитель</div>
                <div className="text-xs text-gray-500">Выходить на линию</div>
              </div>
            </Link>
          </div>

          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
            <div className="text-xs text-gray-500">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-blue-600 hover:underline" onClick={() => setIsOpen(false)}>
                Зарегистрироваться
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
