import { Outlet } from 'react-router-dom'

export function ManagerLayout() {
  return (
    <div className="min-h-screen">
      <main>
        <Outlet />
      </main>
    </div>
  )
}
