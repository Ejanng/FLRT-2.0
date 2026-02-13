import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/all-reports/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/all-reports/routes"!</div>
}
