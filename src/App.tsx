import { RouterProvider } from 'react-router-dom'
import { appRoutes } from './app/routes/appRoutes'
import { AppProviders } from './app/providers/AppProviders'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={appRoutes} />
      
    </AppProviders>
  )
}

export default App