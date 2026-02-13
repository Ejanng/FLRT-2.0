import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: rootRoute,
  notFoundComponent: notFound,
})

function rootRoute() {
  return (
    <div>
      <Outlet />
    </div>
  )
}

function notFound() {
  return <div>404 - Not Found try mo sabali ahh route

  </div>
}