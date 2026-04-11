import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { ThemeProvider } from '../context/ThemeContext'
import Header from '../components/Header'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location })

  useEffect(() => {
    if (location.pathname !== '/claim/foundForm') return

    const params = new URLSearchParams(location.search)
    const forwardedSearch = Object.fromEntries(params.entries())

    navigate({
      to: '/claim/claimForm',
      search: {
        ...forwardedSearch,
        mode: 'found',
      } as any,
      replace: true,
    })
  }, [location.pathname, location.search, navigate])

  // Hide header on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <ThemeProvider>
      <div className="min-h-screen grid-pattern transition-colors duration-300">
        {!isAdminRoute && <Header />}
        <main>
          <Outlet />
        </main>
        {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
      </div>
    </ThemeProvider>
  )
}