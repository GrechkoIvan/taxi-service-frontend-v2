import { useEffect } from 'react'
import type { PropsWithChildren, ReactElement } from 'react'
import { useAuthStore } from '../../shared/lib/stores/authStore'
import { useManagerAuthStore } from '../../shared/lib/stores/managerAuthStore'

export const StoreProvider = ({ children }: PropsWithChildren): ReactElement => {
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const checkManagerAuth = useManagerAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth().catch(() => {})
    checkManagerAuth().catch(() => {})
  }, [checkAuth, checkManagerAuth])

  return <>{children}</>
}
