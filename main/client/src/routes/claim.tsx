import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/claim')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/claim"!</div>
}
