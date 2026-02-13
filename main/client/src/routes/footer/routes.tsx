import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/footer/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/footer/routes"!</div>
}
