import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/dashboard/found-items')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/dashboard/found-items"!</div>
}
