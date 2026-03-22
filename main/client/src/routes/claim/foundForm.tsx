import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/claim/foundForm')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/claim/foundForm"!</div>
}
