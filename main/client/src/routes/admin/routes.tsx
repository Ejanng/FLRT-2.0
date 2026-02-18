import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/routes"!</div>
}
