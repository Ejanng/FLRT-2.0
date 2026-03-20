import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '../context/ThemeContext'
import Header from '../components/Header'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider>
      <div className="min-h-screen grid-pattern transition-colors duration-300">
        <Header />
        <main>
          <Outlet />
        </main>
        {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
      </div>
    </ThemeProvider>
  )
}