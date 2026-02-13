import Header from '@/components/Header'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/header/routes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Header />
}
